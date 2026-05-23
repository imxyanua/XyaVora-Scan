# XyaVora-Scan

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Open-source public website security scanner for quick, passive domain reconnaissance.

XyaVora-Scan lets anyone scan a public domain without creating an account. The report page opens immediately, shows live analyzer progress, and progressively renders module results as DNS, TLS, HTTP, headers, WHOIS, metadata, tech stack, crawl hints, cookies, security.txt, screenshot, and scoring checks complete.

> Vietnamese documentation: [README.vi.md](README.vi.md)

## Product Direction

- No login or registration required.
- Scan-first workflow: enter a public domain and inspect the report.
- Recent scans are stored locally in the current browser only.
- Live scan jobs show real per-module progress.
- Partial results render while slower modules continue running.
- Screenshot capture is optional and non-blocking.
- Findings are evidence-based and labeled by confidence.

## What It Checks

| Area | Details |
|---|---|
| Live Overview | Ready/running/error module counts and early HTTPS, HSTS, CSP, SPF, DMARC, HTTP signals |
| Risk Summary | Score, grade, risk status, prioritized findings, and score breakdown |
| Data Quality | Verified, observed, inferred, unavailable, and error evidence summaries |
| DNS Records | A, AAAA, MX, NS, TXT records, TTLs, SPF and DMARC signals |
| Email Security | MX, SPF policy, DMARC policy, alignment, report URIs, evidence |
| TLS / SSL | HTTPS availability, issuer, subject, validity, SANs, protocol, cipher |
| HTTP Overview | Status code, final URL, redirects, compression, cache headers, response size |
| Security Headers | HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, lifecycle dates, nameservers, DNSSEC when available |
| Tech Stack | Frameworks, CMS, CDN, hosting, analytics, server hints, source evidence |
| Cookies | Secure, HttpOnly, SameSite, expiry, warnings |
| Security.txt | RFC 9116 discovery and Contact/Policy/Encryption/Expires parsing |
| Page Metadata | Title, description, canonical URL, Open Graph, favicon, robots directives |
| Site Discovery | robots.txt, sitemap, crawl rules, user agents |
| Screenshot | Optional desktop and mobile captures, handled after core report data |
| Raw Data | JSON report export for further analysis |
| External Research | Links to third-party tools for manual validation |

## Live Scan Flow

1. The frontend starts a scan job through the backend API.
2. The report route opens immediately with live progress.
3. Each analyzer updates its own job step with status, duration, error, and partial data.
4. Completed modules replace loading cards with real report cards.
5. The core report opens before slow screenshot capture blocks the experience.
6. Recent guest reports are saved in browser localStorage without large screenshot base64 payloads.

## Evidence Model

XyaVora-Scan separates report data by confidence so the UI does not overstate uncertain signals.

| Group | Meaning | Examples |
|---|---|---|
| Verified | Direct protocol or resolver evidence | DNS records, TLS handshake, response headers, high-confidence CDN headers |
| Observed | Data seen in fetched pages or responses | HTTP status, redirects, cookies, metadata, security.txt, screenshots |
| Inferred | Heuristic or best-practice observations | Tech stack fingerprints from weak signals, inferred framework relationships, missing hardening headers |

Findings are posture observations. A warning does not mean the scanner confirmed an exploitable vulnerability. Review source, confidence, and evidence before treating a result as confirmed.

## Architecture

```text
frontend/  Next.js 16, React 19, TypeScript, Tailwind CSS v4
backend/   FastAPI, Python 3.12, Pydantic v2, async analyzers
```

The frontend proxies scan requests to the backend API. The backend normalizes and validates the target, creates a scan job, runs analyzers concurrently, streams progress through polling-friendly job snapshots, aggregates findings, and returns a camelCase report shared with TypeScript types.

## Local Development

### Backend API

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Optional screenshot support:

```bash
cd backend
python -m playwright install chromium
```

Screenshots are controlled by `ENABLE_SCREENSHOT` and `SCREENSHOT_TIMEOUT_SECONDS` in `backend/.env`.

### Frontend Web

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

Backend example:

```env
ENV=development
CORS_ORIGIN=http://localhost:3000
SCAN_TIMEOUT_SECONDS=90
ANALYZER_TIMEOUT_SECONDS=8
SCREENSHOT_TIMEOUT_SECONDS=45
FETCH_TIMEOUT_SECONDS=8
MAX_HTML_BYTES=1000000
ENABLE_SCREENSHOT=true
```

Frontend example:

```env
API_URL=http://localhost:8000
```

For hosted deployments, set `API_URL` to the backend origin and `CORS_ORIGIN` to the frontend origin.

## API

Classic full-report scan:

```http
POST /api/analyze
Content-Type: application/json

{
  "target": "example.com",
  "save_history": false,
  "force_refresh": true
}
```

Live job flow:

```http
POST /api/analyze/jobs
GET  /api/analyze/jobs/{job_id}
```

The response follows shared schemas in `frontend/types/index.ts`, `backend/app/schemas/api.py`, and `backend/app/schemas/report.py`.

## Testing

Backend tests:

```bash
cd backend
python -m pytest
```

The default pytest run excludes tests marked `integration`, because those require live DNS/HTTP/TLS/WHOIS access.

Frontend quality checks:

```bash
cd frontend
npm run lint
npm run build
```

## Security Boundaries

XyaVora-Scan is designed for passive, defensive analysis.

- It does not exploit, brute force, fuzz, or perform aggressive scanning.
- Target validation blocks localhost, private IP ranges, link-local addresses, and cloud metadata endpoints.
- HTTP fetches use bounded timeouts and controlled redirect handling.
- Screenshot capture is optional, non-blocking, and should be treated as a higher-risk network feature.
- Results can include inferred signals. Review evidence labels before treating a finding as confirmed.

Only scan domains you own or are authorized to assess.

## Contributing

Issues and pull requests are welcome. Useful contributions include:

- New analyzer modules with offline tests.
- Better technology fingerprints with evidence and negative tests.
- UI improvements for long evidence, live progress, and report readability.
- Documentation fixes and deployment notes.
- Security hardening for URL validation, redirects, and screenshot capture.

When adding analyzers, keep the default test suite offline and deterministic. Mark live-network checks with `@pytest.mark.integration`.

## License

MIT. See [LICENSE](LICENSE).
