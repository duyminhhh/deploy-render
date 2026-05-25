import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
import models
from routers import auth, users, products, transactions, staff_entries, chat
from routers.vouchers import router as vouchers_router
from auth import get_password_hash
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory Management System", version="2.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(vouchers_router)
app.include_router(transactions.router)
app.include_router(staff_entries.router)
app.include_router(chat.router)


# ─── Đơn vị đo lường phổ biến ──────────────────────────────────────────────
COMMON_UNITS = [
    # Khối lượng
    "kg", "g", "mg", "tấn",
    # Thể tích
    "lít", "ml", "chai", "lon",
    # Đếm
    "cái", "chiếc", "hộp", "gói", "túi", "bịch", "thùng", "lốc",
    # Thực phẩm đặc thù
    "bó", "củ", "quả", "trái", "con", "con cái", "ổ", "miếng",
    # Đo độ dài / tờ
    "mét", "cuộn", "tờ",
]


@app.get("/units")
def get_units():
    """Trả về danh sách đơn vị đo lường phổ biến."""
    return COMMON_UNITS


# ─── Dữ liệu mẫu siêu thị ──────────────────────────────────────────────────
SAMPLE_PRODUCTS = [
    # Thực phẩm tươi sống
    {"name": "Thịt heo ba chỉ",       "category": "Thịt - Hải sản", "unit": "kg",   "price": 95000,  "quantity": 50,  "low_stock_threshold": 10, "expiration_days": 3},
    {"name": "Thịt bò thăn",          "category": "Thịt - Hải sản", "unit": "kg",   "price": 280000, "quantity": 30,  "low_stock_threshold": 5,  "expiration_days": 3},
    {"name": "Cá hồi phi lê",         "category": "Thịt - Hải sản", "unit": "kg",   "price": 350000, "quantity": 20,  "low_stock_threshold": 5,  "expiration_days": 2},
    {"name": "Tôm sú tươi",           "category": "Thịt - Hải sản", "unit": "kg",   "price": 220000, "quantity": 25,  "low_stock_threshold": 5,  "expiration_days": 2},
    {"name": "Trứng gà ta",           "category": "Trứng - Sữa",    "unit": "vỉ",   "price": 35000,  "quantity": 100, "low_stock_threshold": 20, "expiration_days": 21},
    # Rau củ quả
    {"name": "Cải xanh",              "category": "Rau - Củ - Quả", "unit": "bó",   "price": 8000,   "quantity": 80,  "low_stock_threshold": 20, "expiration_days": 3},
    {"name": "Cà chua bi",            "category": "Rau - Củ - Quả", "unit": "kg",   "price": 25000,  "quantity": 60,  "low_stock_threshold": 15, "expiration_days": 5},
    {"name": "Khoai tây",             "category": "Rau - Củ - Quả", "unit": "kg",   "price": 18000,  "quantity": 120, "low_stock_threshold": 30, "expiration_days": 30},
    {"name": "Chuối già hương",       "category": "Rau - Củ - Quả", "unit": "kg",   "price": 20000,  "quantity": 70,  "low_stock_threshold": 15, "expiration_days": 5},
    {"name": "Táo Fuji nhập khẩu",    "category": "Rau - Củ - Quả", "unit": "kg",   "price": 65000,  "quantity": 40,  "low_stock_threshold": 10, "expiration_days": 14},
    # Đồ khô / Gia vị
    {"name": "Gạo ST25 (túi 5kg)",    "category": "Lương thực",     "unit": "túi",  "price": 120000, "quantity": 200, "low_stock_threshold": 50, "expiration_days": 365},
    {"name": "Mì gói Hảo Hảo",       "category": "Lương thực",     "unit": "thùng","price": 115000, "quantity": 150, "low_stock_threshold": 30, "expiration_days": 180},
    {"name": "Dầu ăn Neptune 1L",     "category": "Dầu - Gia vị",   "unit": "chai", "price": 45000,  "quantity": 80,  "low_stock_threshold": 20, "expiration_days": 365},
    {"name": "Nước mắm Phú Quốc",    "category": "Dầu - Gia vị",   "unit": "chai", "price": 38000,  "quantity": 90,  "low_stock_threshold": 20, "expiration_days": 720},
    {"name": "Muối i-ốt",             "category": "Dầu - Gia vị",   "unit": "gói",  "price": 5000,   "quantity": 200, "low_stock_threshold": 50, "expiration_days": 730},
    {"name": "Đường cát trắng 1kg",   "category": "Dầu - Gia vị",   "unit": "gói",  "price": 22000,  "quantity": 150, "low_stock_threshold": 40, "expiration_days": 730},
    # Đồ uống
    {"name": "Nước suối Aquafina 500ml", "category": "Đồ uống",     "unit": "thùng","price": 90000,  "quantity": 100, "low_stock_threshold": 20, "expiration_days": 365},
    {"name": "Sữa tươi Vinamilk 1L",  "category": "Trứng - Sữa",    "unit": "hộp",  "price": 35000,  "quantity": 80,  "low_stock_threshold": 20, "expiration_days": 14},
    {"name": "Coca-Cola lon 330ml",   "category": "Đồ uống",        "unit": "thùng","price": 220000, "quantity": 60,  "low_stock_threshold": 10, "expiration_days": 180},
    {"name": "Nước cam ép 1L",        "category": "Đồ uống",        "unit": "chai", "price": 42000,  "quantity": 50,  "low_stock_threshold": 15, "expiration_days": 7},
    # Bánh kẹo snack
    {"name": "Bánh quy Oreo",         "category": "Bánh - Kẹo",     "unit": "hộp",  "price": 28000,  "quantity": 120, "low_stock_threshold": 30, "expiration_days": 180},
    {"name": "Kẹo dẻo Haribo",        "category": "Bánh - Kẹo",     "unit": "gói",  "price": 35000,  "quantity": 80,  "low_stock_threshold": 20, "expiration_days": 365},
    {"name": "Snack Oishi tôm chua",  "category": "Bánh - Kẹo",     "unit": "thùng","price": 145000, "quantity": 60,  "low_stock_threshold": 15, "expiration_days": 180},
    # Vệ sinh - Chăm sóc cá nhân
    {"name": "Dầu gội Clear men",     "category": "Chăm sóc cá nhân","unit": "chai", "price": 68000,  "quantity": 70,  "low_stock_threshold": 15, "expiration_days": 1095},
    {"name": "Sữa tắm Dove",          "category": "Chăm sóc cá nhân","unit": "chai", "price": 75000,  "quantity": 60,  "low_stock_threshold": 15, "expiration_days": 1095},
    {"name": "Kem đánh răng Colgate", "category": "Chăm sóc cá nhân","unit": "hộp",  "price": 35000,  "quantity": 100, "low_stock_threshold": 25, "expiration_days": 730},
    {"name": "Khăn giấy Kleenex",     "category": "Gia dụng",       "unit": "gói",  "price": 45000,  "quantity": 90,  "low_stock_threshold": 20, "expiration_days": 1825},
    {"name": "Nước rửa chén Sunlight","category": "Gia dụng",       "unit": "chai", "price": 28000,  "quantity": 110, "low_stock_threshold": 25, "expiration_days": 730},
    # Sắp hết / cảnh báo (để test alert)
    {"name": "Phô mai con bò cười",   "category": "Trứng - Sữa",    "unit": "hộp",  "price": 55000,  "quantity": 5,   "low_stock_threshold": 10, "expiration_days": 90},
    {"name": "Bơ thực vật Tường An",  "category": "Trứng - Sữa",    "unit": "hộp",  "price": 32000,  "quantity": 3,   "low_stock_threshold": 10, "expiration_days": 5},
]


def seed_default_users(db):
    if db.query(models.User).count() > 0:
        return
    for u in [
        {"username": "admin",   "password": "admin123",   "role": models.RoleEnum.ADMIN,   "full_name": "Quản trị viên"},
        {"username": "manager", "password": "manager123", "role": models.RoleEnum.MANAGER, "full_name": "Nguyễn Quản Lý"},
        {"username": "staff",   "password": "staff123",   "role": models.RoleEnum.STAFF,   "full_name": "Trần Nhân Viên"},
    ]:
        db.add(models.User(
            username=u["username"], password=get_password_hash(u["password"]),
            role=u["role"], full_name=u["full_name"]
        ))
    db.commit()
    print("✅ Seed: 3 tài khoản mặc định")


def seed_sample_products(db):
    """Merge: chỉ thêm sản phẩm mẫu chưa tồn tại (so sánh theo tên)."""
    existing = {p.name for p in db.query(models.Product.name).all()}
    now = datetime.utcnow()
    added = 0
    for p in SAMPLE_PRODUCTS:
        if p["name"] in existing:
            continue
        db.add(models.Product(
            name=p["name"],
            category=p["category"],
            unit=p["unit"],
            price=p["price"],
            quantity=p["quantity"],
            low_stock_threshold=p["low_stock_threshold"],
            import_date=now,
            expiration_date=now + timedelta(days=p["expiration_days"]),
            description=f"Hàng {p['category'].lower()} - {p['unit']}",
        ))
        added += 1
    if added:
        db.commit()
        print(f"✅ Seed: thêm {added} sản phẩm mẫu (bỏ qua {len(SAMPLE_PRODUCTS)-added} trùng tên)")


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_default_users(db)
        seed_sample_products(db)
    finally:
        db.close()


@app.post("/dev/reseed-products")
def reseed_products():
    """Thêm sản phẩm mẫu vào DB hiện tại (bỏ qua sản phẩm trùng tên)."""
    db = SessionLocal()
    try:
        existing_names = {p.name for p in db.query(models.Product.name).all()}
        added = 0
        now = datetime.utcnow()
        for p in SAMPLE_PRODUCTS:
            if p["name"] in existing_names:
                continue
            db.add(models.Product(
                name=p["name"],
                category=p["category"],
                unit=p["unit"],
                price=p["price"],
                quantity=p["quantity"],
                low_stock_threshold=p["low_stock_threshold"],
                import_date=now,
                expiration_date=now + timedelta(days=p["expiration_days"]),
                description=f"Hàng {p['category'].lower()} - {p['unit']}",
            ))
            added += 1
        db.commit()
        skipped = len(SAMPLE_PRODUCTS) - added
        return {"added": added, "skipped_duplicates": skipped,
                "message": f"Đã thêm {added} sản phẩm mới, bỏ qua {skipped} sản phẩm trùng tên"}
    finally:
        db.close()


@app.delete("/dev/clear-products")
def clear_products():
    """
    Xóa TRIỆT ĐỂ toàn bộ sản phẩm và dữ liệu liên quan theo đúng thứ tự FK:
    VoucherLog → StaffEntry → InventoryTransaction → VoucherItem → Voucher → Product
    """
    db = SessionLocal()
    try:
        # Lấy danh sách voucher_id có liên quan đến sản phẩm
        product_ids = [r.id for r in db.query(models.Product.id).all()]
        if not product_ids:
            return {"message": "Không có sản phẩm nào để xóa"}

        voucher_ids_from_items = [
            r.voucher_id for r in
            db.query(models.VoucherItem.voucher_id)
              .filter(models.VoucherItem.product_id.in_(product_ids))
              .distinct().all()
        ]

        # 1. Xóa VoucherLog của các voucher liên quan
        if voucher_ids_from_items:
            db.query(models.VoucherLog).filter(
                models.VoucherLog.voucher_id.in_(voucher_ids_from_items)
            ).delete(synchronize_session=False)

        # 2. Xóa StaffEntry liên quan đến sản phẩm
        db.query(models.StaffEntry).filter(
            models.StaffEntry.product_id.in_(product_ids)
        ).delete(synchronize_session=False)

        # 3. Xóa InventoryTransaction liên quan đến sản phẩm
        db.query(models.InventoryTransaction).filter(
            models.InventoryTransaction.product_id.in_(product_ids)
        ).delete(synchronize_session=False)

        # 4. Xóa VoucherItem liên quan
        db.query(models.VoucherItem).filter(
            models.VoucherItem.product_id.in_(product_ids)
        ).delete(synchronize_session=False)

        # 5. Xóa Voucher (chỉ những cái không còn item nào)
        if voucher_ids_from_items:
            db.query(models.Voucher).filter(
                models.Voucher.id.in_(voucher_ids_from_items)
            ).delete(synchronize_session=False)

        # 6. Cuối cùng xóa Product
        deleted = db.query(models.Product).filter(
            models.Product.id.in_(product_ids)
        ).delete(synchronize_session=False)

        db.commit()
        return {
            "deleted_products": deleted,
            "message": f"Đã xóa triệt để {deleted} sản phẩm và toàn bộ dữ liệu liên quan"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/health")
def health(): return {"status": "ok", "version": "2.0.0"}