# XyaVora-Scan

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Open-source domain security posture scanner for quick, passive web reconnaissance.

XyaVora-Scan runs a set of defensive analyzers against a public domain and returns a structured report covering DNS, TLS, HTTP behavior, security headers, page metadata, technology fingerprints, cookies, security.txt, screenshots, findings, and evidence for detected signals.

> Vietnamese documentation: [README.vi.md](README.vi.md)

## Highlights

- Fast local-first workflow with a Next.js frontend and FastAPI backend.
- Quick scans do not require login.
- Guest scans show the full report and keep recent reports in the current browser; backend history remains opt-in.
- Analyzer pipeline runs modules concurrently and keeps partial results when one module fails.
- Report Quality Summary separates verified evidence, observed page data, and inferred fingerprints.
- Evidence labels explain whether a result was verified by DNS/TLS/headers, observed from HTTP/page data, or inferred from heuristic signals.
- Optional Playwright screenshot capture for desktop and mobile previews.
- Passive-only security model with SSRF protections and bounded timeouts.

## Current Modules

| Module | What it checks |
|---|---|
| Risk Summary | Score, grade, risk status, prioritized findings |
| Report Quality Summary | Verified, observed, and inferred signal grouping |
| Data Confidence | Module-level complete, partial, unavailable, or error status |
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
| Screenshot | Optional desktop and mobile captures |
| Raw Data | Full JSON report export for further analysis |
| External Research | Links to third-party tools for manual validation |

## Evidence Model

XyaVora-Scan separates report data by confidence so the UI does not overstate uncertain signals.

| Group | Meaning | Examples |
|---|---|---|
| Verified | Direct protocol or resolver evidence | DNS records, TLS handshake, response headers, high-confidence CDN headers |
| Observed | Data seen in the fetched page or response | HTTP status, redirects, cookies, metadata, security.txt, screenshots |
| Inferred | Heuristic or best-practice observations | Tech stack fingerprints from weak signals, inferred framework relationships, missing hardening headers |

Findings are posture observations. A `warning` does not mean the scanner confirmed an exploitable vulnerability. Review the source, confidence, and evidence fields before treating a result as confirmed.

## Architecture

```text
frontend/  Next.js 16, React 19, TypeScript, Tailwind CSS v4
backend/   FastAPI, Python 3.12, Pydantic v2, async analyzers
```

The frontend proxies scan requests to the backend API. The backend normalizes and validates the target, runs analyzers concurrently, aggregates findings, and returns a camelCase JSON report shared with the TypeScript types.

## Local Development

### 1. Backend API

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

### 2. Frontend Web

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

```http
POST /api/analyze
Content-Type: application/json

{
  "target": "example.com",
  "save_history": false,
  "force_refresh": true
}
```

The response follows the shared report schema in `frontend/types/index.ts` and `backend/app/schemas/report.py`.

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
- Screenshot capture is optional and should be treated as a higher-risk network feature.
- Results can include inferred signals. Review evidence labels before treating a finding as confirmed.

Only scan domains you own or are authorized to assess.

## Contributing

Issues and pull requests are welcome. Useful contributions include:

- New analyzer modules with offline tests.
- Better technology fingerprints with evidence and negative tests.
- UI improvements that make long evidence easier to inspect.
- Documentation fixes and deployment notes.
- Security hardening for URL validation, redirects, and screenshot capture.

When adding analyzers, keep the default test suite offline and deterministic. Mark live-network checks with `@pytest.mark.integration`.

## License

MIT. See [LICENSE](LICENSE).
