<div align="center">

```
██╗  ██╗██╗   ██╗ █████╗ ██╗   ██╗ ██████╗ ██████╗  █████╗
╚██╗██╔╝╚██╗ ██╔╝██╔══██╗██║   ██║██╔═══██╗██╔══██╗██╔══██╗
 ╚███╔╝  ╚████╔╝ ███████║██║   ██║██║   ██║██████╔╝███████║
 ██╔██╗   ╚██╔╝  ██╔══██║╚██╗ ██╔╝██║   ██║██╔══██╗██╔══██║
██╔╝ ██╗   ██║   ██║  ██║ ╚████╔╝ ╚██████╔╝██║  ██║██║  ██║
╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
                                                    S C A N
```

**Analyze your domain security posture in seconds.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-lime?style=flat-square)](LICENSE)

</div>

---

### Overview

**XyaVora-Scan** is a domain security analysis tool with an OSINT terminal aesthetic. Enter a domain and the system runs 8 independent analyzers concurrently, returning a comprehensive security report with a risk score, grade, and actionable findings.

Built as a **personal cybersecurity portfolio project** — dark-mode, brutalist UI inspired by hacker/recon tooling.

> Vietnamese documentation: [README.vi.md](README.vi.md)

---

### Analysis Modules

| Module | What it checks |
|---|---|
| DNS Records | A, AAAA, MX, NS, TXT — SPF & DMARC detection |
| SSL Certificate | Issuer, expiry, TLS version, trusted chain, days remaining |
| HTTP Security Headers | HSTS, CSP, X-Frame-Options, XCTO, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, creation/expiry dates, nameservers, DNSSEC |
| Tech Stack | Fingerprint frameworks, CDN, web server, CMS, analytics (35 rules) |
| Cookies | Secure, HttpOnly, SameSite flag audit per cookie |
| Security.txt | RFC 9116 presence check, Contact/Policy/Expires parsing |
| Risk Score | Score 0-100, grade A-F, Low/Medium/High Risk classification |

---

### Tech Stack

**Frontend:**
- [Next.js 16](https://nextjs.org) — App Router, server components
- [TypeScript 5](https://www.typescriptlang.org) — strict mode
- [Tailwind CSS v4](https://tailwindcss.com) — `@theme` CSS config, no config file

**Backend:**
- [Python 3.12](https://python.org) + [FastAPI](https://fastapi.tiangolo.com)
- [Pydantic v2](https://docs.pydantic.dev) — schema validation, camelCase JSON output
- [dnspython](https://www.dnspython.org) — async DNS resolution
- [httpx](https://www.python-httpx.org) — async HTTP client with streaming
- [python-whois](https://pypi.org/project/python-whois/) — WHOIS lookups
- [pytest](https://pytest.org) + [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) — 140+ tests

---

### Local Development

**1. Backend API**

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install chromium
copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

**2. Frontend Web**

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Open the frontend at `http://localhost:3000`.

Quick scans do not require login. Guest scans return the report immediately and do not save history by default.

For deployment, set these environment variables on the hosting provider:

```bash
ENV=production
CORS_ORIGIN=https://your-frontend-domain.example
API_URL=https://your-backend-domain.example
```

---

### Project Structure

```
XyaVora-Scan/
├── frontend/                        # Next.js 16 + TypeScript + Tailwind v4
│   ├── app/
│   │   ├── landing/                 # Landing / home page
│   │   ├── scan/                    # Domain input form
│   │   ├── scanning/                # Scan progress screen
│   │   ├── report/[domain]/         # Full security report dashboard
│   │   └── history/                 # Scan history
│   ├── components/
│   │   ├── layout/                  # AppShell, Sidebar, TopBar
│   │   ├── dashboard/               # RiskScoreCard, SSLCard, DNSRecordsCard,
│   │   │                            #   WhoisCard, CookiesCard, SecurityTxtCard, ...
│   │   ├── landing/                 # ScanInput
│   │   └── scanning/                # ScanProgress
│   ├── lib/api.ts                   # Server-side API client
│   └── types/index.ts               # Shared TypeScript types
│
└── backend/                         # Python 3.12 + FastAPI
    ├── app/
    │   ├── analyzers/               # dns, ssl, headers, whois, tech_stack,
    │   │                            #   cookies, security_txt, score, screenshot
    │   ├── core/config.py           # Settings via pydantic-settings
    │   ├── routes/analyze.py        # POST /api/analyze
    │   ├── schemas/                 # Pydantic models (report, api, analyzer)
    │   ├── services/scan_service.py # Concurrent analyzer pipeline
    │   └── utils/                   # SSRF guard, URL normalizer, safe_fetch
    ├── tests/                       # 140+ pytest tests
    ├── requirements.txt
    └── pyproject.toml
```

---

### API

```
POST /api/analyze
Content-Type: application/json

{ "target": "example.com" }
```

Response shape mirrors `frontend/types/index.ts` — all fields camelCase.

---

### Development Status

| Component | Status |
|---|---|
| Frontend UI | Complete |
| Backend FastAPI setup | Complete |
| DNS Analyzer | Complete |
| SSL Analyzer | Complete |
| HTTP Headers Analyzer | Complete |
| WHOIS Analyzer | Complete |
| Tech Stack Analyzer | Complete |
| Cookies Analyzer | Complete |
| Security.txt Analyzer | Complete |
| Risk Score Analyzer | Complete |
| SSRF Protection | Complete |
| Test suite (140+ tests) | Complete |
| History page (persistent) | Planned |
| Screenshot (Playwright) | Optional |

---

### Security Philosophy

XyaVora-Scan performs **passive, defensive analysis only**:
- No exploit, brute force, or aggressive scanning
- SSRF protection — blocks localhost, private IPs, link-local, cloud metadata endpoints (169.254.x.x)
- All network operations have enforced timeouts (per-analyzer and global)
- Analysis limited to publicly available information

---

### License

MIT © [imxyanua](https://github.com/imxyanua)

---

<div align="center">
<sub>XyaVora-Scan — Analyze your domain security posture in seconds.</sub>
</div>
