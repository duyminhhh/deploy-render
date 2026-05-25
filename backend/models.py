from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"

class TransactionTypeEnum(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"

class VoucherStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    INVESTIGATING = "INVESTIGATING"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.STAFF, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    messages_sent = relationship("ChatMessage", back_populates="sender", foreign_keys="ChatMessage.sender_id")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    unit = Column(String, nullable=True, default="cái")
    price = Column(Float, default=0.0)
    quantity = Column(Integer, default=0)
    import_date = Column(DateTime(timezone=True), nullable=True)
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    low_stock_threshold = Column(Integer, default=10)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    transactions = relationship("InventoryTransaction", back_populates="product")
    voucher_items = relationship("VoucherItem", back_populates="product")

class Voucher(Base):
    """Phiếu nhập/xuất kho - có đầy đủ vòng đời trạng thái"""
    __tablename__ = "vouchers"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=True, index=True)   # sinh khi APPROVED
    type = Column(Enum(TransactionTypeEnum), nullable=False)
    title = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    status = Column(Enum(VoucherStatusEnum), default=VoucherStatusEnum.DRAFT, nullable=False)
    # Users
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    # Reject / cancel reason
    reject_reason = Column(Text, nullable=True)
    # Relations
    items = relationship("VoucherItem", back_populates="voucher", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    completer = relationship("User", foreign_keys=[completed_by])
    transactions = relationship("InventoryTransaction", back_populates="voucher")
    staff_entries = relationship("StaffEntry", back_populates="voucher")

class VoucherItem(Base):
    """Dòng hàng trong phiếu"""
    __tablename__ = "voucher_items"
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    approved_quantity = Column(Integer, nullable=False)
    actual_quantity = Column(Integer, nullable=True)   # Staff nhập thực tế
    voucher = relationship("Voucher", back_populates="items")
    product = relationship("Product", back_populates="voucher_items")

class StaffEntry(Base):
    """Staff nhập liệu thực tế"""
    __tablename__ = "staff_entries"
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("vouchers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    actual_quantity = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    entered_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    entered_at = Column(DateTime(timezone=True), server_default=func.now())
    voucher = relationship("Voucher", back_populates="staff_entries")
    product = relationship("Product")
    enterer = relationship("User", foreign_keys=[entered_by])

class InventoryTransaction(Base):
    """Log giao dịch kho - chỉ tạo khi COMPLETED, không sửa/xóa"""
    __tablename__ = "inventory_transactions"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    type = Column(Enum(TransactionTypeEnum), nullable=False)
    quantity = Column(Integer, nullable=False)
    transaction_date = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    voucher_id = Column(Integer, ForeignKey("vouchers.id"), nullable=True)
    product = relationship("Product", back_populates="transactions")
    performer = relationship("User", foreign_keys=[performed_by])
    voucher = relationship("Voucher", back_populates="transactions")

class VoucherLog(Base):
    """Audit log mọi thay đổi trạng thái phiếu"""
    __tablename__ = "voucher_logs"
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("vouchers.id"), nullable=False)
    action = Column(String, nullable=False)       # CREATED, SUBMITTED, APPROVED, ...
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    by_user = relationship("User")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)
    sender = relationship("User", back_populates="messages_sent", foreign_keys=[sender_id])
