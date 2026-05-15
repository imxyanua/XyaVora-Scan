from fastapi.testclient import TestClient
from app.main import app
from app.api.routes import analyze as analyze_route
from app.schemas.report import ScanReport, ScreenshotResult

client = TestClient(app)


def _fake_report() -> ScanReport:
    return ScanReport(
        target="example.com",
        normalizedUrl="https://example.com",
        hostname="example.com",
        scanTime="2026-05-15T00:00:00+00:00",
        score=100,
        grade="A",
        status="Low Risk",
        summary="ok",
        screenshot=ScreenshotResult(base64="desktop", mobileBase64="mobile"),
        findings=[],
    )


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_analyze_valid_domain():
    r = client.post("/api/analyze", json={"target": "github.com"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["hostname"] == "github.com"
    assert data["normalizedUrl"] == "https://github.com"
    assert "score" in data
    assert "findings" in data


def test_analyze_strips_https():
    r = client.post("/api/analyze", json={"target": "https://github.com/path"})
    assert r.status_code == 200
    assert r.json()["data"]["hostname"] == "github.com"


def test_analyze_private_ip_blocked():
    r = client.post("/api/analyze", json={"target": "192.168.1.1"})
    assert r.status_code == 400
    body = r.json()
    assert body["success"] is False
    assert body["error"] is not None


def test_analyze_metadata_blocked():
    r = client.post("/api/analyze", json={"target": "169.254.169.254"})
    assert r.status_code == 400
    assert r.json()["success"] is False


def test_analyze_localhost_blocked():
    r = client.post("/api/analyze", json={"target": "localhost"})
    assert r.status_code == 400
    assert r.json()["success"] is False


def test_analyze_empty_target():
    r = client.post("/api/analyze", json={"target": ""})
    # Pydantic validator raises → FastAPI returns 422
    assert r.status_code in (400, 422)


def test_analyze_missing_body():
    r = client.post("/api/analyze", json={})
    assert r.status_code == 422


def test_analyze_guest_scan_does_not_save_history(monkeypatch):
    async def fake_run_scan(*args, **kwargs):
        return _fake_report()

    append_calls = []
    monkeypatch.setattr(analyze_route, "validate_target", lambda target: ("https://example.com", "example.com"))
    monkeypatch.setattr(analyze_route, "is_cached", lambda hostname: False)
    monkeypatch.setattr(analyze_route, "run_scan", fake_run_scan)
    monkeypatch.setattr(analyze_route.history_service, "append", lambda report: append_calls.append(report))

    r = client.post("/api/analyze", json={"target": "example.com"})

    assert r.status_code == 200
    assert r.json()["success"] is True
    assert append_calls == []


def test_analyze_saved_scan_appends_history(monkeypatch):
    async def fake_run_scan(*args, **kwargs):
        return _fake_report()

    append_calls = []
    monkeypatch.setattr(analyze_route, "validate_target", lambda target: ("https://example.com", "example.com"))
    monkeypatch.setattr(analyze_route, "is_cached", lambda hostname: False)
    monkeypatch.setattr(analyze_route, "run_scan", fake_run_scan)
    monkeypatch.setattr(analyze_route.history_service, "append", lambda report: append_calls.append(report))

    r = client.post("/api/analyze", json={"target": "example.com", "save_history": True})

    assert r.status_code == 200
    assert r.json()["success"] is True
    assert len(append_calls) == 1
