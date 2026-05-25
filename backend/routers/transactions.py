"""
Transactions - Read-only log. Manager chỉ xem và xuất Excel, không sửa/xóa.
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from database import get_db
import models, schemas
from auth import get_current_user, require_role
import pandas as pd
import io

router = APIRouter(prefix="/transactions", tags=["Transactions"])
manager_only = require_role("MANAGER")

@router.get("/", response_model=List[schemas.TransactionOut])
def list_transactions(
    product_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(manager_only)
):
    q = db.query(models.InventoryTransaction).options(
        joinedload(models.InventoryTransaction.product),
        joinedload(models.InventoryTransaction.performer),
        joinedload(models.InventoryTransaction.voucher)
    )
    if product_id: q = q.filter(models.InventoryTransaction.product_id == product_id)
    if type: q = q.filter(models.InventoryTransaction.type == type)
    if date_from: q = q.filter(models.InventoryTransaction.transaction_date >= date_from)
    if date_to: q = q.filter(models.InventoryTransaction.transaction_date <= date_to)
    txs = q.order_by(models.InventoryTransaction.transaction_date.desc()).all()
    results = []
    for tx in txs:
        r = schemas.TransactionOut.model_validate(tx)
        r.product_name = tx.product.name if tx.product else None
        r.performed_by_name = tx.performer.username if tx.performer else None
        r.voucher_code = tx.voucher.code if tx.voucher else None
        results.append(r)
    return results

@router.get("/export/excel")
def export_excel(
    db: Session = Depends(get_db),
    _: models.User = Depends(manager_only)
):
    txs = db.query(models.InventoryTransaction).options(
        joinedload(models.InventoryTransaction.product),
        joinedload(models.InventoryTransaction.performer),
        joinedload(models.InventoryTransaction.voucher)
    ).order_by(models.InventoryTransaction.transaction_date.desc()).all()
    data = [{
        "ID": tx.id,
        "Mã phiếu": tx.voucher.code if tx.voucher else "",
        "Sản phẩm": tx.product.name if tx.product else "",
        "Loại": "Nhập" if tx.type == "IN" else "Xuất",
        "Số lượng": tx.quantity,
        "Người thực hiện": tx.performer.username if tx.performer else "",
        "Ngày giao dịch": tx.transaction_date.strftime("%Y-%m-%d %H:%M:%S"),
        "Ghi chú": tx.note or ""
    } for tx in txs]
    df = pd.DataFrame(data)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Lịch sử giao dịch")
    stream.seek(0)
    return StreamingResponse(stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=transactions.xlsx"}
    )

@router.get("/summary")
def get_summary(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(manager_only)
):
    q = db.query(models.InventoryTransaction).options(joinedload(models.InventoryTransaction.product))
    if date_from: q = q.filter(models.InventoryTransaction.transaction_date >= date_from)
    if date_to: q = q.filter(models.InventoryTransaction.transaction_date <= date_to)
    summary = {}
    for tx in q.all():
        pid = tx.product_id
        if pid not in summary:
            summary[pid] = {"product_id": pid, "product_name": tx.product.name if tx.product else "", "total_in": 0, "total_out": 0}
        if tx.type == "IN": summary[pid]["total_in"] += tx.quantity
        else: summary[pid]["total_out"] += tx.quantity
    return list(summary.values())
