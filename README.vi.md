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

### Giới thiệu

**XyaVora-Scan** là công cụ phân tích bảo mật domain / website theo phong cách OSINT terminal. Người dùng nhập một domain, hệ thống sẽ chạy nhiều analyzer độc lập và trả về một dashboard báo cáo toàn diện.

Dự án được xây dựng như một **portfolio cá nhân** về cybersecurity — giao diện dark-mode, brutalist, lấy cảm hứng từ phong cách hacker/recon tool.

> Tài liệu tiếng Anh: [README.md](README.md)

---

### Tính năng phân tích

| Module | Mô tả |
|---|---|
| DNS Records | A, AAAA, MX, NS, TXT — phát hiện SPF & DMARC |
| SSL Certificate | Issuer, expiry, TLS version, số ngày còn lại |
| HTTP Security Headers | HSTS, CSP, X-Frame-Options, XCTO, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, ngày tạo/hết hạn, nameservers |
| Tech Stack | Phát hiện framework, CDN, web server, analytics |
| Cookies | Kiểm tra Secure, HttpOnly, SameSite |
| Security.txt | Kiểm tra sự tồn tại và nội dung |
| Screenshot | Chụp màn hình trang web (Playwright) |
| Risk Score | Chấm điểm 0-100, xếp hạng A-F, phân loại Low/Medium/High Risk |

---

### Giao diện

- Dark-mode cybersecurity dashboard
- Phong cách terminal / cyberpunk / brutalist
- Accent màu lime neon `#B7FF3C`
- Font: Geist (body) + JetBrains Mono (code/data)
- Border radius: 0 — hoàn toàn vuông góc

---

### Tech Stack

**Frontend (hiện tại):**
- [Next.js 16](https://nextjs.org) — App Router
- [TypeScript 5](https://www.typescriptlang.org) — strict mode
- [Tailwind CSS v4](https://tailwindcss.com) — `@theme` CSS config

**Backend (kế hoạch):**
- Node.js + Express + TypeScript
- Kiến trúc module-based analyzer
- REST API: `POST /api/analyze`

---

### Cài đặt & chạy

```bash
git clone https://github.com/imxyanua/XyaVora-Scan.git
cd XyaVora-Scan/frontend
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

### Cấu trúc project

```
XyaVora-Scan/
├── frontend/
│   ├── app/
│   │   ├── landing/          # Trang chủ
│   │   ├── scan/             # Nhập domain
│   │   ├── scanning/         # Tiến trình scan
│   │   ├── report/[domain]/  # Dashboard báo cáo
│   │   └── history/          # Lịch sử scan
│   ├── components/
│   │   ├── layout/           # AppShell, Sidebar, TopBar
│   │   ├── ui/               # Atoms: Button, Badge, Card
│   │   ├── dashboard/        # Các panel: SSL, DNS, Headers
│   │   ├── landing/          # ScanInput
│   │   └── scanning/         # ScanProgress
│   ├── lib/api.ts            # API client (stub)
│   ├── mock/                 # Mock data
│   └── types/index.ts        # Shared types
└── backend/                  # (coming soon)
```

---

### Trạng thái phát triển

| Giai đoạn | Trạng thái |
|---|---|
| Frontend mock (UI) | Hoàn thành |
| Types & Mock data | Hoàn thành |
| Backend Express API | Kế hoạch |
| DNS Analyzer | Kế hoạch |
| SSL Analyzer | Kế hoạch |
| Headers Analyzer | Kế hoạch |
| WHOIS Analyzer | Kế hoạch |
| Score Analyzer | Kế hoạch |

---

### Triết lý bảo mật

XyaVora-Scan chỉ thực hiện **phân tích thụ động, phòng thủ**:
- Không exploit, brute force, hoặc quét tấn công
- Bảo vệ SSRF — chặn localhost, private IP, metadata endpoint
- Phân tích giới hạn ở thông tin công khai
- Timeout được áp dụng cho mọi thao tác mạng

---

### Giấy phép

MIT © [imxyanua](https://github.com/imxyanua)

---

<div align="center">
<sub>XyaVora-Scan — Analyze your domain security posture in seconds.</sub>
</div>
