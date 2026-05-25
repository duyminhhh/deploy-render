# 📦 InvenTrack – Hệ thống Quản lý Kho hàng v2.0

## Kiến trúc hệ thống

```
inventory-system-v2/
├── backend/          FastAPI + PostgreSQL
├── frontend/         React + Vite
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## Phân quyền nghiệp vụ

| Chức năng | ADMIN | MANAGER | STAFF |
|---|:---:|:---:|:---:|
| Quản lý người dùng (CRUD) | ✅ | ❌ | ❌ |
| Quản lý sản phẩm (CRUD) | ❌ | ✅ | ❌ |
| Nhập / Xuất kho | ❌ | ✅ | ❌ |
| Tạo chứng từ phê duyệt | ❌ | ✅ | ❌ |
| In chứng từ (Excel) | ❌ | ✅ | ❌ |
| Tổng hợp xuất/nhập + xuất Excel | ❌ | ✅ | ❌ |
| Nhập liệu thực tế | ❌ | ❌ | ✅ |
| Đối chiếu chênh lệch | ❌ | ✅ | ✅ |
| Xuất Excel đối chiếu | ❌ | ✅ | ✅ |
| Chat nhóm | ✅ | ✅ | ✅ |

---

## Quy trình nghiệp vụ

```
Manager tạo Chứng từ phê duyệt
    ↓
Manager in chứng từ (file Excel) → giao cho staff ngoài thực tế
    ↓
Staff thực hiện xuất/nhập kho thực tế
    ↓
Staff nhập liệu số lượng thực tế vào hệ thống
    ↓
Hệ thống tự động tính chênh lệch / hao hụt
    ↓
Xuất Excel đối chiếu để báo cáo
```

---

## Chạy với Docker (khuyến nghị)

### Yêu cầu
- Docker 24+
- Docker Compose v2+

### Khởi động

```bash
# Clone / copy project
git clone <repo>
cd inventory-system-v2

# Chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

**Truy cập:**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Tài khoản mặc định
| Username | Password | Vai trò |
|---|---|---|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| staff | staff123 | Staff |

---

## Deploy miễn phí (Render.com)

### Backend (Web Service)
1. Push code lên GitHub
2. Vào https://render.com → New → Web Service
3. Connect GitHub repo, chọn thư mục `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Thêm Environment Variable: `DATABASE_URL` (từ Render PostgreSQL)

### Database (PostgreSQL)
1. Render → New → PostgreSQL (Free tier)
2. Copy Internal Database URL → dán vào `DATABASE_URL` của backend

### Frontend (Static Site)
1. Render → New → Static Site
2. Build Command: `npm ci && npm run build`
3. Publish Directory: `dist`
4. Environment Variable: `VITE_API_URL=https://your-backend.onrender.com`

### Lưu ý Render Free Tier
- Service sẽ ngủ sau 15 phút không dùng
- Lần đầu truy cập sẽ chậm (cold start ~30s)
- PostgreSQL free bị xóa sau 90 ngày nếu không có activity

---

## Deploy với Docker trên VPS (DigitalOcean, Vultr, v.v.)

```bash
# Trên server
git clone <repo>
cd inventory-system-v2

# Tạo .env từ example
cp .env.example .env
# Chỉnh sửa .env

# Chạy production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## API Endpoints chính

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | /auth/login | Đăng nhập | Public |
| GET | /users | Danh sách user | ADMIN |
| POST | /users | Tạo user | ADMIN |
| GET | /products | Danh sách sản phẩm | All |
| POST | /products | Tạo sản phẩm | MANAGER |
| POST | /transactions | Tạo giao dịch | MANAGER |
| GET | /transactions/summary | Tổng hợp | MANAGER |
| POST | /approvals | Tạo chứng từ | MANAGER |
| GET | /approvals/{id}/print | In chứng từ Excel | All |
| POST | /staff-entries | Nhập liệu thực tế | STAFF |
| GET | /staff-entries/export/excel | Xuất Excel đối chiếu | All |
| WS | /chat/ws?token=... | WebSocket chat | All |

---

## Phát triển local (không dùng Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
# Hoặc dùng SQLite để test nhanh:
# Đổi DATABASE_URL thành sqlite:///./inventory.db trong database.py
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```
