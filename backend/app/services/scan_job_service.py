import asyncio
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.analyzers.screenshot_analyzer import analyze_screenshot
from app.core.config import settings
from app.schemas.analyzer import AnalyzerResult
from app.schemas.api import AnalyzeRequest, ScanJobSnapshot, ScanJobState, ScanJobStep
from app.schemas.report import ScanReport, ScreenshotResult
from app.services import history_service, log_service
from app.services.scan_service import is_cached, run_scan


SCAN_JOB_STEPS: tuple[tuple[str, str], ...] = (
    ("dns", "DNS Records"),
    ("ssl", "SSL Certificate"),
    ("headers", "Security Headers"),
    ("http", "HTTP Overview"),
    ("location", "Server Location"),
    ("metadata", "Page Metadata"),
    ("discovery", "Crawl Discovery"),
    ("whois", "WHOIS Lookup"),
    ("techStack", "Tech Stack"),
    ("cookies", "Cookies"),
    ("securityTxt", "security.txt"),
    ("screenshot", "Screenshot Capture"),
    ("score", "Risk Score"),
)

_MAX_JOBS = 50
_JOB_TTL_SECONDS = 30 * 60
_JOBS: dict[str, "_ScanJob"] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class _ScanJob:
    job_id: str
    body: AnalyzeRequest
    normalized_url: str
    hostname: str
    status: ScanJobState = "queued"
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)
    started_at_monotonic: float = field(default_factory=time.monotonic)
    steps: dict[str, ScanJobStep] = field(default_factory=dict)
    report: ScanReport | None = None
    error: str | None = None


def _new_steps() -> dict[str, ScanJobStep]:
    return {
        key: ScanJobStep(key=key, label=label)
        for key, label in SCAN_JOB_STEPS
    }


def _touch(job: _ScanJob) -> None:
    job.updated_at = _now_iso()


def _prune_jobs() -> None:
    now = time.monotonic()
    expired = [
        job_id
        for job_id, job in _JOBS.items()
        if now - job.started_at_monotonic > _JOB_TTL_SECONDS
    ]
    for job_id in expired:
        _JOBS.pop(job_id, None)

    if len(_JOBS) <= _MAX_JOBS:
        return

    sorted_jobs = sorted(_JOBS.values(), key=lambda job: job.started_at_monotonic)
    for job in sorted_jobs[: len(_JOBS) - _MAX_JOBS]:
        _JOBS.pop(job.job_id, None)


def _snapshot(job: _ScanJob) -> ScanJobSnapshot:
    total = len(job.steps)
    completed = sum(1 for step in job.steps.values() if step.status in {"success", "error"})
    if job.status == "completed":
        progress = 100
    elif job.status == "failed":
        progress = max(1, int((completed / total) * 100)) if total else 1
    else:
        progress = min(95, int((completed / total) * 100)) if total else 0

    return ScanJobSnapshot(
        job_id=job.job_id,
        target=job.body.target,
        hostname=job.hostname,
        normalized_url=job.normalized_url,
        status=job.status,
        progress=progress,
        created_at=job.created_at,
        updated_at=job.updated_at,
        elapsed_ms=int((time.monotonic() - job.started_at_monotonic) * 1000),
        steps=list(job.steps.values()),
        report=job.report,
        error=job.error,
    )


async def _run_job(job: _ScanJob) -> None:
    job.status = "running"
    _touch(job)
    t0 = time.monotonic()
    cached = False if job.body.force_refresh else is_cached(job.hostname)

    async def update_step(
        key: str,
        status: str,
        duration_ms: int | None = None,
        error: str | None = None,
    ) -> None:
        if key == "cache":
            for step in job.steps.values():
                step.status = "success"
                step.duration_ms = step.duration_ms or 0
            _touch(job)
            return

        step = job.steps.get(key)
        if step is None:
            return

        if status in {"running", "success", "error"}:
            step.status = status
        step.duration_ms = duration_ms
        step.error = error
        _touch(job)

    async def run_late_screenshot() -> ScreenshotResult:
        step = job.steps.get("screenshot")
        if step:
            step.status = "running"
            step.error = None
            step.duration_ms = None
            _touch(job)

        started = time.monotonic()
        try:
            result = await asyncio.wait_for(
                analyze_screenshot(job.normalized_url, settings.ENABLE_SCREENSHOT),
                timeout=settings.SCREENSHOT_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            result = AnalyzerResult(
                key="screenshot",
                status="error",
                data=ScreenshotResult(
                    url=job.normalized_url,
                    error="Screenshot capture exceeded the late capture timeout.",
                ),
                errors=["Screenshot capture exceeded the late capture timeout."],
            )
        except Exception as exc:
            result = AnalyzerResult(
                key="screenshot",
                status="error",
                data=ScreenshotResult(url=job.normalized_url, error=str(exc)),
                errors=[str(exc)],
            )

        screenshot = (
            result.data
            if isinstance(result.data, ScreenshotResult)
            else ScreenshotResult(url=job.normalized_url, error=result.errors[0] if result.errors else "Screenshot failed.")
        )
        duration_ms = int((time.monotonic() - started) * 1000)
        if step:
            step.status = "error" if screenshot.error and not screenshot.base64 and not screenshot.mobileBase64 else "success"
            step.duration_ms = duration_ms
            step.error = screenshot.error if step.status == "error" else None
            _touch(job)
        return screenshot

    screenshot_task = asyncio.create_task(run_late_screenshot())

    try:
        report = await run_scan(
            job.body.target,
            job.normalized_url,
            job.hostname,
            force_refresh=job.body.force_refresh,
            progress_callback=update_step,
            include_screenshot=False,
        )
    except Exception as exc:
        if not screenshot_task.done():
            screenshot_task.cancel()
        job.status = "failed"
        job.error = str(exc)
        duration_ms = int((time.monotonic() - t0) * 1000)
        log_service.record(
            domain=job.hostname,
            duration_ms=duration_ms,
            score=0,
            grade="F",
            status="High Risk",
            cached=False,
            error=str(exc),
        )
        _touch(job)
        return

    duration_ms = int((time.monotonic() - t0) * 1000)
    if screenshot_task.done() and not screenshot_task.cancelled():
        report.screenshot = screenshot_task.result()

    log_service.record(
        domain=report.hostname,
        duration_ms=duration_ms,
        score=report.score,
        grade=report.grade,
        status=report.status,
        cached=cached,
    )
    if job.body.save_history:
        history_service.append(report)

    job.report = report
    job.status = "completed"
    _touch(job)

    if not screenshot_task.done():
        screenshot = await screenshot_task
        if job.report:
            job.report.screenshot = screenshot
            _touch(job)


def start_scan_job(
    body: AnalyzeRequest,
    normalized_url: str,
    hostname: str,
) -> ScanJobSnapshot:
    _prune_jobs()
    job_id = str(uuid.uuid4())
    job = _ScanJob(
        job_id=job_id,
        body=body,
        normalized_url=normalized_url,
        hostname=hostname,
        steps=_new_steps(),
    )
    _JOBS[job_id] = job
    asyncio.create_task(_run_job(job))
    return _snapshot(job)


def get_scan_job(job_id: str) -> ScanJobSnapshot | None:
    _prune_jobs()
    job = _JOBS.get(job_id)
    return _snapshot(job) if job else None
