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

**Phân tích bảo mật domain trong vài giây.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-lime?style=flat-square)](LICENSE)

</div>

---

### Giới thiệu

**XyaVora-Scan** là công cụ phân tích bảo mật domain theo phong cách OSINT terminal. Người dùng nhập một domain, hệ thống sẽ chạy 8 analyzer độc lập đồng thời và trả về dashboard báo cáo toàn diện gồm điểm rủi ro, xếp hạng và các khuyến nghị cụ thể.

Dự án xây dựng như một **portfolio cá nhân về cybersecurity** — giao diện dark-mode, brutalist, lấy cảm hứng từ phong cách hacker/recon tool.

> English documentation: [README.md](README.md)

---

### Các module phân tích

| Module | Nội dung kiểm tra |
|---|---|
| DNS Records | A, AAAA, MX, NS, TXT — phát hiện SPF & DMARC |
| SSL Certificate | Issuer, ngày hết hạn, TLS version, chuỗi tin cậy, số ngày còn lại |
| HTTP Security Headers | HSTS, CSP, X-Frame-Options, XCTO, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, ngày tạo/hết hạn, nameservers, DNSSEC |
| Tech Stack | Nhận diện framework, CDN, web server, CMS, analytics (35 rule) |
| Cookies | Kiểm tra từng cookie: Secure, HttpOnly, SameSite |
| Security.txt | Kiểm tra theo RFC 9116, parse Contact/Policy/Expires |
| Risk Score | Chấm điểm 0-100, xếp hạng A-F, phân loại Low/Medium/High Risk |

---

### Tech Stack

**Frontend:**
- [Next.js 16](https://nextjs.org) — App Router, server components
- [TypeScript 5](https://www.typescriptlang.org) — strict mode
- [Tailwind CSS v4](https://tailwindcss.com) — cấu hình qua `@theme` trong CSS

**Backend:**
- [Python 3.12](https://python.org) + [FastAPI](https://fastapi.tiangolo.com)
- [Pydantic v2](https://docs.pydantic.dev) — validation schema, JSON output camelCase
- [dnspython](https://www.dnspython.org) — truy vấn DNS bất đồng bộ
- [httpx](https://www.python-httpx.org) — HTTP client bất đồng bộ, hỗ trợ streaming
- [python-whois](https://pypi.org/project/python-whois/) — tra cứu WHOIS
- [pytest](https://pytest.org) + [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) — hơn 140 test

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

Mở frontend tại `http://localhost:3000`.

Quick scan không cần đăng nhập. Guest scan trả report ngay và mặc định không lưu history.

Khi deploy, thiết lập các biến môi trường này trên nền tảng hosting:

```bash
ENV=production
CORS_ORIGIN=https://your-frontend-domain.example
API_URL=https://your-backend-domain.example
```

---

### Cấu trúc dự án

```
XyaVora-Scan/
├── frontend/                        # Next.js 16 + TypeScript + Tailwind v4
│   ├── app/
│   │   ├── landing/                 # Trang chủ
│   │   ├── scan/                    # Form nhập domain
│   │   ├── scanning/                # Màn hình chờ scan
│   │   ├── report/[domain]/         # Dashboard báo cáo
│   │   └── history/                 # Lịch sử scan
│   ├── components/
│   │   ├── layout/                  # AppShell, Sidebar, TopBar
│   │   ├── dashboard/               # RiskScoreCard, SSLCard, DNSRecordsCard,
│   │   │                            #   WhoisCard, CookiesCard, SecurityTxtCard, ...
│   │   ├── landing/                 # ScanInput
│   │   └── scanning/                # ScanProgress
│   ├── lib/api.ts                   # API client phía server
│   └── types/index.ts               # TypeScript types dùng chung
│
└── backend/                         # Python 3.12 + FastAPI
    ├── app/
    │   ├── analyzers/               # dns, ssl, headers, whois, tech_stack,
    │   │                            #   cookies, security_txt, score, screenshot
    │   ├── core/config.py           # Cấu hình qua pydantic-settings
    │   ├── routes/analyze.py        # POST /api/analyze
    │   ├── schemas/                 # Pydantic models (report, api, analyzer)
    │   ├── services/scan_service.py # Pipeline chạy analyzer song song
    │   └── utils/                   # SSRF guard, URL normalizer, safe_fetch
    ├── tests/                       # Hơn 140 pytest test
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

Cấu trúc response khớp với `frontend/types/index.ts` — tất cả field dạng camelCase.

---

### Trạng thái phát triển

| Thành phần | Trạng thái |
|---|---|
| Giao diện frontend | Hoàn thành |
| Backend FastAPI | Hoàn thành |
| DNS Analyzer | Hoàn thành |
| SSL Analyzer | Hoàn thành |
| HTTP Headers Analyzer | Hoàn thành |
| WHOIS Analyzer | Hoàn thành |
| Tech Stack Analyzer | Hoàn thành |
| Cookies Analyzer | Hoàn thành |
| Security.txt Analyzer | Hoàn thành |
| Risk Score Analyzer | Hoàn thành |
| Bảo vệ SSRF | Hoàn thành |
| Bộ test (140+ test) | Hoàn thành |
| History page (lưu trữ) | Kế hoạch |
| Screenshot (Playwright) | Tùy chọn |

---

### Triết lý bảo mật

XyaVora-Scan chỉ thực hiện **phân tích thụ động, phòng thủ**:
- Không exploit, brute force, hoặc quét tấn công
- Bảo vệ SSRF — chặn localhost, private IP, link-local, metadata endpoint của cloud (169.254.x.x)
- Tất cả thao tác mạng đều có timeout (per-analyzer và toàn bộ pipeline)
- Phân tích giới hạn ở thông tin công khai

---

### Giấy phép

MIT © [imxyanua](https://github.com/imxyanua)

---

<div align="center">
<sub>XyaVora-Scan — Phân tích bảo mật domain trong vài giây.</sub>
</div>
