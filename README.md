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
[![License](https://img.shields.io/badge/License-MIT-lime?style=flat-square)](LICENSE)

</div>

---

### Overview

**XyaVora-Scan** is a domain security analysis tool with an OSINT terminal aesthetic. Users enter a domain and the system runs multiple independent analyzers, returning a comprehensive security report dashboard.

Built as a **personal cybersecurity portfolio project** — dark-mode, brutalist UI inspired by hacker/recon tooling.

> Vietnamese documentation: [README.vi.md](README.vi.md)

---

### Analysis Modules

| Module | Description |
|---|---|
| DNS Records | A, AAAA, MX, NS, TXT — SPF & DMARC detection |
| SSL Certificate | Issuer, expiry, TLS version, days remaining |
| HTTP Security Headers | HSTS, CSP, X-Frame-Options, XCTO, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, creation/expiry dates, nameservers |
| Tech Stack | Detect frameworks, CDN, web server, analytics |
| Cookies | Check Secure, HttpOnly, SameSite flags |
| Security.txt | Presence and content validation |
| Screenshot | Live page capture via Playwright |
| Risk Score | Score 0-100, grade A-F, Low/Medium/High Risk classification |

---

### UI Design

- Dark-mode cybersecurity dashboard
- Terminal / cyberpunk / brutalist aesthetic
- Lime neon accent `#B7FF3C`
- Fonts: Geist (body) + JetBrains Mono (code/data)
- Border radius: 0 — sharp edges throughout

---

### Tech Stack

**Frontend:**
- [Next.js 16](https://nextjs.org) — App Router
- [TypeScript 5](https://www.typescriptlang.org) — strict mode
- [Tailwind CSS v4](https://tailwindcss.com) — `@theme` CSS config

**Backend (planned):**
- Node.js + Express + TypeScript
- Analyzer module-based architecture
- REST API: `POST /api/analyze`

---

### Getting Started

```bash
git clone https://github.com/imxyanua/XyaVora-Scan.git
cd XyaVora-Scan/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

### Project Structure

```
XyaVora-Scan/
├── frontend/
│   ├── app/
│   │   ├── landing/          # Landing page
│   │   ├── scan/             # Domain input
│   │   ├── scanning/         # Scan progress
│   │   ├── report/[domain]/  # Report dashboard
│   │   └── history/          # Scan history
│   ├── components/
│   │   ├── layout/           # AppShell, Sidebar, TopBar
│   │   ├── ui/               # Atoms: Button, Badge, Card
│   │   ├── dashboard/        # Panels: SSL, DNS, Headers
│   │   ├── landing/          # ScanInput
│   │   └── scanning/         # ScanProgress
│   ├── lib/api.ts            # API client (stub)
│   ├── mock/                 # Mock data
│   └── types/index.ts        # Shared types
└── backend/                  # (coming soon)
```

---

### Development Status

| Phase | Status |
|---|---|
| Frontend mock (UI) | Complete |
| Types & Mock data | Complete |
| Backend Express API | Planned |
| DNS Analyzer | Planned |
| SSL Analyzer | Planned |
| Headers Analyzer | Planned |
| WHOIS Analyzer | Planned |
| Score Analyzer | Planned |

---

### Security Philosophy

XyaVora-Scan performs **passive, defensive analysis only**:
- No exploit, brute force, or aggressive scanning
- SSRF protection — blocks localhost, private IPs, metadata endpoints
- Analysis limited to publicly available information
- Timeout enforced on all network operations

---

### License

MIT © [imxyanua](https://github.com/imxyanua)

---

<div align="center">
<sub>XyaVora-Scan — Analyze your domain security posture in seconds.</sub>
</div>
