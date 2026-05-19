# XyaVora-Scan

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Công cụ mã nguồn mở để phân tích nhanh tư thế bảo mật của domain bằng các kỹ thuật thụ động.

XyaVora-Scan chạy nhiều analyzer phòng thủ trên một domain công khai và trả về báo cáo có cấu trúc: DNS, TLS, HTTP behavior, security headers, metadata, tech stack, cookies, security.txt, screenshot, findings và bằng chứng cho từng tín hiệu phát hiện được.

> English documentation: [README.md](README.md)

## Điểm nổi bật

- Chạy local-first với frontend Next.js và backend FastAPI.
- Scan nhanh không cần đăng nhập.
- Guest scan vẫn xem được report đầy đủ và lưu recent report trong browser hiện tại; backend history chỉ bật khi có chủ đích.
- Pipeline analyzer chạy song song, một module lỗi không làm mất toàn bộ report.
- Report Quality Summary tách rõ dữ liệu verified, observed và inferred.
- Evidence label cho biết kết quả được xác minh từ DNS/TLS/header, quan sát từ HTTP/page data, hay suy luận từ heuristic signal.
- Hỗ trợ screenshot desktop và mobile bằng Playwright, có thể bật/tắt bằng cấu hình.
- Mô hình bảo mật thụ động: có SSRF guard, timeout và giới hạn dữ liệu tải về.

## Các module hiện có

| Module | Nội dung kiểm tra |
|---|---|
| Risk Summary | Điểm số, grade, risk status, finding ưu tiên |
| Report Quality Summary | Nhóm tín hiệu verified, observed và inferred |
| Data Confidence | Trạng thái module: complete, partial, unavailable hoặc error |
| DNS Records | A, AAAA, MX, NS, TXT, TTL, tín hiệu SPF và DMARC |
| Email Security | MX, SPF policy, DMARC policy, alignment, report URI, bằng chứng |
| TLS / SSL | HTTPS, issuer, subject, thời hạn, SAN, protocol, cipher |
| HTTP Overview | Status code, final URL, redirect, compression, cache header, kích thước response |
| Security Headers | HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, ngày tạo/hết hạn, nameserver, DNSSEC nếu có |
| Tech Stack | Framework, CMS, CDN, hosting, analytics, server hint, source evidence |
| Cookies | Secure, HttpOnly, SameSite, expiry, cảnh báo |
| Security.txt | Tìm và parse security.txt theo RFC 9116 |
| Page Metadata | Title, description, canonical URL, Open Graph, favicon, robots directive |
| Site Discovery | robots.txt, sitemap, crawl rule, user agent |
| Screenshot | Ảnh chụp desktop và mobile nếu bật Playwright |
| Raw Data | Xuất JSON report đầy đủ |
| External Research | Link tới công cụ bên ngoài để kiểm chứng thủ công |

## Mô hình bằng chứng

XyaVora-Scan tách dữ liệu theo mức độ tin cậy để UI không diễn giải quá mạnh các tín hiệu chưa chắc chắn.

| Nhóm | Ý nghĩa | Ví dụ |
|---|---|---|
| Verified | Bằng chứng trực tiếp từ protocol hoặc resolver | DNS records, TLS handshake, response headers, CDN header có độ tin cậy cao |
| Observed | Dữ liệu quan sát được từ response hoặc page | HTTP status, redirects, cookies, metadata, security.txt, screenshots |
| Inferred | Suy luận heuristic hoặc best-practice observation | Tech stack từ tín hiệu yếu, framework suy ra từ stack khác, header hardening bị thiếu |

Findings là các quan sát về tư thế bảo mật. Một mục `warning` không có nghĩa scanner đã xác nhận có lỗ hổng khai thác được. Hãy xem source, confidence và evidence trước khi coi kết quả là kết luận chắc chắn.

## Kiến trúc

```text
frontend/  Next.js 16, React 19, TypeScript, Tailwind CSS v4
backend/   FastAPI, Python 3.12, Pydantic v2, async analyzers
```

Frontend gửi yêu cầu scan tới backend API. Backend chuẩn hóa và kiểm tra target, chạy analyzer song song, gom finding, rồi trả về JSON camelCase dùng chung với TypeScript types.

## Chạy local

### 1. Backend API

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Bật screenshot tùy chọn:

```bash
cd backend
python -m playwright install chromium
```

Screenshot được điều khiển bằng `ENABLE_SCREENSHOT` và `SCREENSHOT_TIMEOUT_SECONDS` trong `backend/.env`.

### 2. Frontend Web

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

## Biến môi trường

Backend:

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

Frontend:

```env
API_URL=http://localhost:8000
```

Khi deploy, đặt `API_URL` thành backend origin và `CORS_ORIGIN` thành frontend origin.

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

Response bám theo schema trong `frontend/types/index.ts` và `backend/app/schemas/report.py`.

## Kiểm thử

Backend:

```bash
cd backend
python -m pytest
```

Mặc định pytest bỏ qua các test có marker `integration`, vì các test này cần DNS/HTTP/TLS/WHOIS thật từ Internet.

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Ranh giới bảo mật

XyaVora-Scan được thiết kế cho phân tích thụ động và phòng thủ.

- Không exploit, brute force, fuzzing hoặc scan tấn công.
- Target validation chặn localhost, private IP, link-local và cloud metadata endpoint.
- HTTP fetch có timeout và xử lý redirect có kiểm soát.
- Screenshot là tính năng tùy chọn và nên được xem là tính năng mạng có rủi ro cao hơn.
- Một số kết quả là suy luận. Hãy xem source label và evidence trước khi coi là kết luận chắc chắn.

Chỉ scan domain bạn sở hữu hoặc được phép đánh giá.

## Đóng góp

Issue và pull request đều được chào đón. Các hướng đóng góp hữu ích:

- Analyzer mới kèm test offline.
- Fingerprint tech stack tốt hơn, có evidence và negative test.
- UI cải thiện khả năng đọc evidence dài.
- Sửa tài liệu, thêm hướng dẫn deploy.
- Tăng cường bảo vệ URL validation, redirect và screenshot capture.

Khi thêm analyzer, hãy giữ test mặc định chạy offline và ổn định. Các kiểm tra cần mạng thật nên đánh dấu `@pytest.mark.integration`.

## Giấy phép

MIT. Xem [LICENSE](LICENSE).
