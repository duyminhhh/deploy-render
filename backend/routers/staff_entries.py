"""
Staff Entries - Staff nhập số lượng thực tế vào phiếu IN_PROGRESS
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import io, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from database import get_db
import models, schemas
from auth import get_current_user, require_role

router = APIRouter(prefix="/staff-entries", tags=["Staff Entries"])
staff_only   = require_role("STAFF")
staff_or_above = require_role("MANAGER", "STAFF")  # cho GET

@router.post("/", response_model=schemas.StaffEntryOut, status_code=201)
def create_entry(
    data: schemas.StaffEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(staff_only)
):
    voucher = db.query(models.Voucher).filter(models.Voucher.id == data.voucher_id).first()
    if not voucher: raise HTTPException(404, "Voucher not found")

    # Staff chỉ được nhập khi phiếu IN_PROGRESS
    if voucher.status != models.VoucherStatusEnum.IN_PROGRESS:
        raise HTTPException(400, f"Phiếu đang ở trạng thái {voucher.status}, cần IN_PROGRESS để nhập liệu")

    product = db.query(models.Product).filter(models.Product.id == data.product_id).first()
    if not product: raise HTTPException(404, "Product not found")

    # Kiểm tra product có trong phiếu không
    item = db.query(models.VoucherItem).filter(
        models.VoucherItem.voucher_id == data.voucher_id,
        models.VoucherItem.product_id == data.product_id
    ).first()
    if not item:
        raise HTTPException(400, "Sản phẩm này không có trong phiếu")

    # Staff không được sửa số lượng đã nhập (nếu đã có entry)
    existing = db.query(models.StaffEntry).filter(
        models.StaffEntry.voucher_id == data.voucher_id,
        models.StaffEntry.product_id == data.product_id
    ).first()
    if existing:
        # Cập nhật lại (cho phép nhập lại trong cùng phiếu IN_PROGRESS)
        existing.actual_quantity = data.actual_quantity
        existing.note = data.note
        existing.entered_by = current_user.id
        item.actual_quantity = data.actual_quantity
        db.commit()
        db.refresh(existing)
        return db.query(models.StaffEntry).options(
            joinedload(models.StaffEntry.product),
            joinedload(models.StaffEntry.enterer)
        ).filter(models.StaffEntry.id == existing.id).first()

    entry = models.StaffEntry(
        voucher_id=data.voucher_id,
        product_id=data.product_id,
        actual_quantity=data.actual_quantity,
        note=data.note,
        entered_by=current_user.id
    )
    db.add(entry)
    item.actual_quantity = data.actual_quantity
    db.commit()
    db.refresh(entry)
    return db.query(models.StaffEntry).options(
        joinedload(models.StaffEntry.product),
        joinedload(models.StaffEntry.enterer)
    ).filter(models.StaffEntry.id == entry.id).first()

@router.get("/", response_model=List[schemas.StaffEntryOut])
def list_entries(
    voucher_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    q = db.query(models.StaffEntry).options(
        joinedload(models.StaffEntry.product),
        joinedload(models.StaffEntry.enterer)
    )
    if voucher_id:
        q = q.filter(models.StaffEntry.voucher_id == voucher_id)
    return q.order_by(models.StaffEntry.entered_at.desc()).all()

@router.get("/export/excel")
def export_comparison_excel(
    voucher_id: int = Query(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    voucher = db.query(models.Voucher).options(
        joinedload(models.Voucher.items).joinedload(models.VoucherItem.product),
        joinedload(models.Voucher.creator)
    ).filter(models.Voucher.id == voucher_id).first()
    if not voucher: raise HTTPException(404, "Voucher not found")

    entries = db.query(models.StaffEntry).filter(models.StaffEntry.voucher_id == voucher_id).all()
    actual_map = {e.product_id: e.actual_quantity for e in entries}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Đối chiếu"

    for i, w in enumerate([8, 35, 12, 16, 16, 16, 25], 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    hdr_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
    col_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    warn_fill = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")
    thin = Side(style="thin", color="D1D5DB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)

    row = 1
    ws.merge_cells(f"A{row}:G{row}")
    ws[f"A{row}"].value = f"BẢNG ĐỐI CHIẾU – {voucher.code or f'Phiếu #{voucher.id}'}"
    ws[f"A{row}"].font = Font(name="Arial", bold=True, size=14, color="FFFFFF")
    ws[f"A{row}"].fill = hdr_fill; ws[f"A{row}"].alignment = center
    ws.row_dimensions[row].height = 36; row += 2

    for col, h in enumerate(["STT","Sản phẩm","Đơn vị","SL phê duyệt","SL thực tế","Chênh lệch","Tình trạng"], 1):
        c = ws.cell(row=row, column=col, value=h)
        c.font = Font(name="Arial", bold=True, size=11, color="FFFFFF")
        c.fill = col_fill; c.alignment = center; c.border = border
    ws.row_dimensions[row].height = 24; row += 1

    total_approved = total_actual = 0
    for i, item in enumerate(voucher.items, 1):
        actual = actual_map.get(item.product_id)
        approved = item.approved_quantity
        diff = (actual - approved) if actual is not None else None
        total_approved += approved
        if actual: total_actual += actual
        has_loss = diff is not None and diff < 0
        vals = [i, item.product.name if item.product else "", item.product.unit if item.product else "",
                approved, actual if actual is not None else "Chưa nhập",
                diff if diff is not None else "N/A",
                "⚠️ Hao hụt" if has_loss else ("✅ Đúng" if diff == 0 else ("📈 Vượt" if diff and diff > 0 else ""))]
        for col, val in enumerate(vals, 1):
            c = ws.cell(row=row, column=col, value=val)
            c.font = Font(name="Arial", size=11, color="DC2626" if has_loss and col == 6 else "000000",
                          bold=has_loss and col in [6, 7])
            c.border = border
            c.alignment = Alignment(horizontal="center" if col != 2 else "left", vertical="center")
            if has_loss: c.fill = warn_fill
        row += 1

    row += 1
    ws.merge_cells(f"A{row}:C{row}")
    ws[f"A{row}"].value = "TỔNG"
    ws[f"A{row}"].font = Font(bold=True); ws[f"A{row}"].alignment = center
    for col, val in [(4, total_approved), (5, total_actual), (6, total_actual - total_approved)]:
        ws.cell(row=row, column=col).value = val
        ws.cell(row=row, column=col).font = Font(bold=True)
        ws.cell(row=row, column=col).alignment = center

    stream = io.BytesIO()
    wb.save(stream); stream.seek(0)
    code = voucher.code or f"p{voucher.id}"
    return StreamingResponse(stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=doi_chieu_{code}.xlsx"}
    )