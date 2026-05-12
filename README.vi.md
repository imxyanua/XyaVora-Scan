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

### Gioi thieu

**XyaVora-Scan** la cong cu phan tich bao mat domain / website theo phong cach OSINT terminal. Nguoi dung nhap mot domain, he thong se chay nhieu analyzer doc lap va tra ve mot dashboard bao cao toan dien.

Du an duoc xay dung nhu mot **portfolio ca nhan** ve cybersecurity — giao dien dark-mode, brutalist, lay cam hung tu phong cach hacker/recon tool.

> English documentation: [README.md](README.md)

---

### Tinh nang phan tich

| Module | Mo ta |
|---|---|
| DNS Records | A, AAAA, MX, NS, TXT — phat hien SPF & DMARC |
| SSL Certificate | Issuer, expiry, TLS version, ngay con lai |
| HTTP Security Headers | HSTS, CSP, X-Frame-Options, XCTO, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, ngay tao/het han, nameservers |
| Tech Stack | Phat hien framework, CDN, web server, analytics |
| Cookies | Kiem tra Secure, HttpOnly, SameSite |
| Security.txt | Kiem tra su ton tai va noi dung |
| Screenshot | Chup man hinh trang web (Playwright) |
| Risk Score | Cham diem 0-100, xep hang A-F, phan loai Low/Medium/High Risk |

---

### Giao dien

- Dark-mode cybersecurity dashboard
- Phong cach terminal / cyberpunk / brutalist
- Accent mau lime neon `#B7FF3C`
- Font: Geist (body) + JetBrains Mono (code/data)
- Border radius: 0 — hoan toan vuong goc

---

### Tech Stack

**Frontend (hien tai):**
- [Next.js 16](https://nextjs.org) — App Router
- [TypeScript 5](https://www.typescriptlang.org) — strict mode
- [Tailwind CSS v4](https://tailwindcss.com) — `@theme` CSS config

**Backend (ke hoach):**
- Node.js + Express + TypeScript
- Analyzer module-based architecture
- REST API: `POST /api/analyze`

---

### Cai dat & chay

```bash
git clone https://github.com/imxyanua/XyaVora-Scan.git
cd XyaVora-Scan/frontend
npm install
npm run dev
```

Mo [http://localhost:3000](http://localhost:3000)

---

### Cau truc project

```
XyaVora-Scan/
├── frontend/
│   ├── app/
│   │   ├── landing/          # Trang chu
│   │   ├── scan/             # Nhap domain
│   │   ├── scanning/         # Tien trinh scan
│   │   ├── report/[domain]/  # Dashboard bao cao
│   │   └── history/          # Lich su scan
│   ├── components/
│   │   ├── layout/           # AppShell, Sidebar, TopBar
│   │   ├── ui/               # Atoms: Button, Badge, Card
│   │   ├── dashboard/        # Cac panel: SSL, DNS, Headers
│   │   ├── landing/          # ScanInput
│   │   └── scanning/         # ScanProgress
│   ├── lib/api.ts            # API client (stub)
│   ├── mock/                 # Mock data
│   └── types/index.ts        # Shared types
└── backend/                  # (coming soon)
```

---

### Trang thai phat trien

| Giai doan | Trang thai |
|---|---|
| Frontend mock (UI) | Hoan thanh |
| Types & Mock data | Hoan thanh |
| Backend Express API | Ke hoach |
| DNS Analyzer | Ke hoach |
| SSL Analyzer | Ke hoach |
| Headers Analyzer | Ke hoach |
| WHOIS Analyzer | Ke hoach |
| Score Analyzer | Ke hoach |

---

### Triet ly bao mat

XyaVora-Scan chi thuc hien **phan tich thu dong, phong thu**:
- Khong exploit, brute force, hoac quet tan cong
- SSRF protection — chan localhost, private IP, metadata endpoint
- Phan tich gioi han o thong tin cong khai
- Timeout duoc ap dung cho moi thao tac mang

---

### Giay phep

MIT © [imxyanua](https://github.com/imxyanua)

---

<div align="center">
<sub>XyaVora-Scan — Analyze your domain security posture in seconds.</sub>
</div>
