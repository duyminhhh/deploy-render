from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
import models, schemas
from auth import get_current_user, require_role

router = APIRouter(prefix="/products", tags=["Products"])
manager_only = require_role("MANAGER")

@router.post("/", response_model=schemas.ProductOut, status_code=201)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(manager_only)
):
    product = models.Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/", response_model=List[schemas.ProductOut])
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    expiring_soon: Optional[bool] = Query(None),
    import_date_from: Optional[datetime] = Query(None),
    import_date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    q = db.query(models.Product)
    if search:
        q = q.filter(models.Product.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(models.Product.category == category)
    if low_stock is True:
        q = q.filter(models.Product.quantity <= models.Product.low_stock_threshold)
    if expiring_soon is True:
        threshold = datetime.utcnow() + timedelta(days=30)
        q = q.filter(
            models.Product.expiration_date != None,
            models.Product.expiration_date <= threshold,
            models.Product.expiration_date >= datetime.utcnow()
        )
    if import_date_from:
        q = q.filter(models.Product.import_date >= import_date_from)
    if import_date_to:
        q = q.filter(models.Product.import_date <= import_date_to)
    return q.all()

@router.get("/categories", response_model=List[str])
def get_categories(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    rows = db.query(models.Product.category).distinct().filter(models.Product.category != None).all()
    return [r[0] for r in rows]

@router.get("/alerts", response_model=dict)
def get_alerts(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    low_stock = db.query(models.Product).filter(
        models.Product.quantity <= models.Product.low_stock_threshold
    ).all()
    threshold = datetime.utcnow() + timedelta(days=30)
    expiring = db.query(models.Product).filter(
        models.Product.expiration_date != None,
        models.Product.expiration_date <= threshold,
        models.Product.expiration_date >= datetime.utcnow()
    ).all()
    expired = db.query(models.Product).filter(
        models.Product.expiration_date != None,
        models.Product.expiration_date < datetime.utcnow()
    ).all()
    return {
        "low_stock": [schemas.ProductOut.model_validate(p) for p in low_stock],
        "expiring_soon": [schemas.ProductOut.model_validate(p) for p in expiring],
        "expired": [schemas.ProductOut.model_validate(p) for p in expired],
    }

@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(manager_only)
):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(manager_only)
):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(p)
    db.commit()