# XyaVora-Scan

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Công cụ mã nguồn mở để scan nhanh tư thế bảo mật của website/domain công khai bằng các kỹ thuật thụ động.

XyaVora-Scan cho phép người dùng nhập domain và xem report mà không cần tạo tài khoản. Trang report mở ngay lập tức, hiển thị tiến trình thật của từng module, và dần thay loading card bằng dữ liệu thật khi các phần DNS, TLS, HTTP, headers, WHOIS, metadata, tech stack, crawl hints, cookies, security.txt, screenshot và scoring hoàn tất.

> English documentation: [README.md](README.md)

## Định Hướng Sản Phẩm

- Không cần đăng nhập hoặc đăng ký.
- Luồng chính là scan nhanh: nhập domain công khai và xem report.
- Recent scans chỉ lưu trong trình duyệt hiện tại.
- Live scan job hiển thị tiến trình thật theo từng module.
- Kết quả từng phần được render dần trong lúc các module chậm tiếp tục chạy.
- Screenshot là tính năng tùy chọn và không chặn report chính.
- Finding có bằng chứng và mức độ tin cậy rõ ràng.

## Nội Dung Kiểm Tra

| Nhóm | Chi tiết |
|---|---|
| Live Overview | Số module ready/running/error và các tín hiệu sớm HTTPS, HSTS, CSP, SPF, DMARC, HTTP |
| Risk Summary | Điểm số, grade, trạng thái rủi ro, finding ưu tiên, score breakdown |
| Data Quality | Nhóm evidence verified, observed, inferred, unavailable, error |
| DNS Records | A, AAAA, MX, NS, TXT, TTL, SPF và DMARC |
| Email Security | MX, SPF policy, DMARC policy, alignment, report URI, evidence |
| TLS / SSL | HTTPS, issuer, subject, thời hạn, SAN, protocol, cipher |
| HTTP Overview | Status code, final URL, redirect, compression, cache headers, response size |
| Security Headers | HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| WHOIS | Registrar, ngày tạo/cập nhật/hết hạn, nameserver, DNSSEC nếu có |
| Tech Stack | Framework, CMS, CDN, hosting, analytics, server hints, source evidence |
| Cookies | Secure, HttpOnly, SameSite, expiry, warnings |
| Security.txt | Tìm và parse security.txt theo RFC 9116 |
| Page Metadata | Title, description, canonical URL, Open Graph, favicon, robots directives |
| Site Discovery | robots.txt, sitemap, crawl rules, user agents |
| Screenshot | Ảnh desktop và mobile nếu bật Playwright, chạy sau dữ liệu report chính |
| Raw Data | Xuất JSON report để phân tích thêm |
| External Research | Link tới công cụ bên ngoài để kiểm chứng thủ công |

## Luồng Live Scan

1. Frontend tạo scan job qua backend API.
2. Trang report mở ngay với tiến trình live.
3. Mỗi analyzer cập nhật job step riêng: status, duration, error và partial data.
4. Module nào xong thì card loading được thay bằng dữ liệu thật.
5. Core report mở trước, screenshot chậm không làm chặn trải nghiệm.
6. Recent guest report lưu trong browser localStorage và không lưu screenshot base64 lớn.

## Mô Hình Bằng Chứng

XyaVora-Scan tách dữ liệu theo mức độ tin cậy để UI không diễn giải quá mạnh các tín hiệu chưa chắc chắn.

| Nhóm | Ý nghĩa | Ví dụ |
|---|---|---|
| Verified | Bằng chứng trực tiếp từ protocol hoặc resolver | DNS records, TLS handshake, response headers, CDN header có độ tin cậy cao |
| Observed | Dữ liệu quan sát được từ response hoặc page | HTTP status, redirects, cookies, metadata, security.txt, screenshots |
| Inferred | Suy luận heuristic hoặc best-practice observation | Tech stack từ tín hiệu yếu, framework suy ra từ stack khác, thiếu header hardening |

Finding là các quan sát về tư thế bảo mật. Một mục warning không có nghĩa scanner đã xác nhận có lỗ hổng khai thác được. Hãy xem source, confidence và evidence trước khi coi kết quả là kết luận chắc chắn.

## Kiến Trúc

```text
frontend/  Next.js 16, React 19, TypeScript, Tailwind CSS v4
backend/   FastAPI, Python 3.12, Pydantic v2, async analyzers
```

Frontend proxy yêu cầu scan tới backend API. Backend chuẩn hóa và kiểm tra target, tạo scan job, chạy analyzer song song, trả job snapshot phù hợp cho polling, gom finding và trả report camelCase dùng chung với TypeScript types.

## Chạy Local

### Backend API

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

### Frontend Web

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

## Biến Môi Trường

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

Scan trả full report:

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

Response bám theo schema trong `frontend/types/index.ts`, `backend/app/schemas/api.py` và `backend/app/schemas/report.py`.

## Kiểm Thử

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

## Ranh Giới Bảo Mật

XyaVora-Scan được thiết kế cho phân tích thụ động và phòng thủ.

- Không exploit, brute force, fuzzing hoặc scan tấn công.
- Target validation chặn localhost, private IP, link-local và cloud metadata endpoint.
- HTTP fetch có timeout và xử lý redirect có kiểm soát.
- Screenshot là tính năng tùy chọn, không chặn report, và nên được xem là tính năng mạng có rủi ro cao hơn.
- Một số kết quả là suy luận. Hãy xem source label và evidence trước khi coi là kết luận chắc chắn.

Chỉ scan domain bạn sở hữu hoặc được phép đánh giá.

## Đóng Góp

Issue và pull request đều được chào đón. Các hướng đóng góp hữu ích:

- Analyzer mới kèm test offline.
- Fingerprint tech stack tốt hơn, có evidence và negative test.
- UI cải thiện khả năng đọc evidence dài, live progress và report.
- Sửa tài liệu, thêm hướng dẫn deploy.
- Tăng cường bảo vệ URL validation, redirect và screenshot capture.

Khi thêm analyzer, hãy giữ test mặc định chạy offline và ổn định. Các kiểm tra cần mạng thật nên đánh dấu `@pytest.mark.integration`.

## Giấy Phép

MIT. Xem [LICENSE](LICENSE).
