from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"

class TransactionTypeEnum(str, Enum):
    IN = "IN"
    OUT = "OUT"

class VoucherStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    INVESTIGATING = "INVESTIGATING"

# ─── Auth ─────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

# ─── User ─────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    username: str
    role: RoleEnum
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[RoleEnum] = None
    full_name: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# ─── Product ──────────────────────────────────────────────────────────────────
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = "cái"
    price: float = 0.0
    quantity: int = 0
    import_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    low_stock_threshold: int = 10

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    import_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    low_stock_threshold: Optional[int] = None

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# ─── Transaction ──────────────────────────────────────────────────────────────
class TransactionOut(BaseModel):
    id: int
    product_id: int
    type: TransactionTypeEnum
    quantity: int
    transaction_date: datetime
    note: Optional[str] = None
    product_name: Optional[str] = None
    performed_by_name: Optional[str] = None
    voucher_id: Optional[int] = None
    voucher_code: Optional[str] = None
    class Config:
        from_attributes = True

# ─── Voucher ──────────────────────────────────────────────────────────────────
class VoucherItemCreate(BaseModel):
    product_id: int
    approved_quantity: int

class VoucherCreate(BaseModel):
    type: TransactionTypeEnum
    title: str
    note: Optional[str] = None
    valid_until: Optional[datetime] = None
    items: List[VoucherItemCreate]

class VoucherUpdate(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None
    valid_until: Optional[datetime] = None
    items: Optional[List[VoucherItemCreate]] = None

class VoucherItemOut(BaseModel):
    id: int
    product_id: int
    approved_quantity: int
    actual_quantity: Optional[int] = None
    product: Optional[ProductOut] = None
    class Config:
        from_attributes = True

class VoucherOut(BaseModel):
    id: int
    code: Optional[str] = None
    type: TransactionTypeEnum
    title: str
    note: Optional[str] = None
    status: VoucherStatusEnum
    created_by: int
    approved_by: Optional[int] = None
    completed_by: Optional[int] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    reject_reason: Optional[str] = None
    items: List[VoucherItemOut] = []
    creator: Optional[UserOut] = None
    approver: Optional[UserOut] = None
    completer: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ─── Voucher actions ──────────────────────────────────────────────────────────
class RejectRequest(BaseModel):
    reason: Optional[str] = None

class ConfirmRequest(BaseModel):
    note: Optional[str] = None

# ─── Staff Entry ──────────────────────────────────────────────────────────────
class StaffEntryCreate(BaseModel):
    voucher_id: int
    product_id: int
    actual_quantity: int
    note: Optional[str] = None

class StaffEntryOut(BaseModel):
    id: int
    voucher_id: int
    product_id: int
    actual_quantity: int
    note: Optional[str] = None
    entered_by: int
    entered_at: datetime
    product: Optional[ProductOut] = None
    enterer: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ─── Voucher Log ──────────────────────────────────────────────────────────────
class VoucherLogOut(BaseModel):
    id: int
    voucher_id: int
    action: str
    from_status: Optional[str] = None
    to_status: str
    note: Optional[str] = None
    created_at: datetime
    by_user: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ─── Chat ─────────────────────────────────────────────────────────────────────
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageOut(BaseModel):
    id: int
    sender_id: int
    content: str
    created_at: datetime
    is_read: bool
    sender: Optional[UserOut] = None
    class Config:
        from_attributes = True
