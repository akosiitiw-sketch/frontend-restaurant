from datetime import datetime, date, timedelta
from decimal import Decimal
from uuid import uuid4
from typing import Optional, Literal

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from sqlalchemy import func, desc, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import Base, engine, get_db
from app import models
from app.models import (
    Role, User, Category, Supplier, Ingredient, Product, ProductIngredient,
    DiningTable, Shift, ShiftAssignment, RestaurantOrder, OrderItem, Payment,
    PurchaseOrder, PurchaseOrderItem, InventoryMovement, AuditLog,
)
from app.security import verify_password, hash_password, create_access_token, decode_access_token

app = FastAPI(
    title="Project NOAH | Restaurant POS API",
    description="Restaurant point-of-sale, kitchen ticketing, ingredient inventory and predictive purchasing API.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)

@app.on_event("startup")
def startup() -> None:
    # The Docker MySQL init process applies sql/schema.sql first (views, triggers and procedures).
    Base.metadata.create_all(bind=engine)

@app.get("/health", tags=["system"])
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "service": "project-noah-pos-api", "database": "connected"}

# ------------------------------ Request models ------------------------------
class LoginInput(BaseModel):
    email: str = Field(min_length=3, max_length=190)  # plain str: EmailStr rejects the demo ".local" domain
    password: str = Field(min_length=1, max_length=128)

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="cashier", max_length=40)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)

class CategoryInput(BaseModel):
    name: str = Field(min_length=2, max_length=90)
    description: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = True

class ProductInput(BaseModel):
    category_id: int
    name: str = Field(min_length=2, max_length=140)
    description: Optional[str] = Field(default=None, max_length=500)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    image_url: Optional[str] = None
    prep_time_minutes: int = Field(default=10, ge=1, le=240)
    is_available: bool = True
    recipe: list[dict] = Field(default_factory=list, description="Ingredient rows: ingredient_id and quantity_per_unit")

class IngredientInput(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    unit: str = Field(min_length=1, max_length=24)
    stock_qty: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=3)
    reorder_level: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=3)
    unit_cost: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    supplier_id: Optional[int] = None
    is_active: bool = True

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[Decimal] = Field(default=None, ge=0)
    unit_cost: Optional[Decimal] = Field(default=None, ge=0)
    supplier_id: Optional[int] = None
    is_active: Optional[bool] = None

class MovementInput(BaseModel):
    ingredient_id: int
    quantity: Decimal = Field(max_digits=12, decimal_places=3)
    movement_type: Literal["IN", "OUT", "ADJUST"]
    reason: str = Field(min_length=2, max_length=255)

class TableInput(BaseModel):
    table_number: str = Field(min_length=1, max_length=20)
    capacity: int = Field(default=2, ge=1, le=50)
    status: Literal["available", "occupied", "reserved", "cleaning"] = "available"
    location_note: Optional[str] = None

class TableUpdate(BaseModel):
    table_number: Optional[str] = None
    capacity: Optional[int] = Field(default=None, ge=1, le=50)
    status: Optional[Literal["available", "occupied", "reserved", "cleaning"]] = None
    location_note: Optional[str] = None

class SupplierInput(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    is_active: bool = True

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class OrderLineInput(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=100)
    notes: Optional[str] = Field(default=None, max_length=255)

class OrderInput(BaseModel):
    table_id: Optional[int] = None
    items: list[OrderLineInput] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=500)
    payment_method: Literal["cash", "gcash", "card", "other"] = "cash"
    transaction_ref: Optional[str] = None

class OrderStatusInput(BaseModel):
    status: Literal["pending", "preparing", "ready", "served", "completed", "cancelled"]

class KitchenItemStatusInput(BaseModel):
    kitchen_status: Literal["queued", "preparing", "ready", "served", "cancelled"]

class ShiftInput(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    starts_at: datetime
    ends_at: datetime
    notes: Optional[str] = None

class ShiftUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=100)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    notes: Optional[str] = None

class ShiftAssignmentInput(BaseModel):
    shift_id: int
    user_id: int

class PurchaseOrderStatusInput(BaseModel):
    status: Literal["draft", "ordered", "cancelled"]
    expected_date: Optional[date] = None
    notes: Optional[str] = None

class PurchaseOrderLineInput(BaseModel):
    ingredient_id: int
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    unit_cost: Optional[Decimal] = Field(default=None, ge=0, max_digits=12, decimal_places=2)

class PurchaseOrderInput(BaseModel):
    supplier_id: int
    expected_date: Optional[date] = None
    notes: Optional[str] = None
    items: list[PurchaseOrderLineInput] = Field(min_length=1)

# --------------------------------- Utilities --------------------------------
def as_float(value):
    return float(value) if value is not None else 0.0

def user_dict(user: User) -> dict:
    return {"id": user.id, "full_name": user.full_name, "email": user.email,
            "role": user.role.name if user.role else "staff", "role_id": user.role_id,
            "is_active": bool(user.is_active), "created_at": user.created_at}

def category_dict(item: Category) -> dict:
    return {"id": item.id, "name": item.name, "description": item.description, "is_active": bool(item.is_active)}

def product_dict(item: Product, db: Session) -> dict:
    recipe = db.query(ProductIngredient).options(joinedload(ProductIngredient.ingredient)).filter(ProductIngredient.product_id == item.id).all()
    return {"id": item.id, "category_id": item.category_id,
            "category_name": item.category.name if item.category else "Uncategorized",
            "name": item.name, "description": item.description, "price": as_float(item.price),
            "image_url": item.image_url, "prep_time_minutes": item.prep_time_minutes,
            "is_available": bool(item.is_available),
            "recipe": [{"ingredient_id": r.ingredient_id, "ingredient_name": r.ingredient.name,
                        "quantity_per_unit": as_float(r.quantity_per_unit), "unit": r.ingredient.unit} for r in recipe]}

def ingredient_dict(item: Ingredient) -> dict:
    return {"id": item.id, "name": item.name, "unit": item.unit,
            "stock_qty": as_float(item.stock_qty), "reorder_level": as_float(item.reorder_level),
            "unit_cost": as_float(item.unit_cost), "supplier_id": item.supplier_id,
            "supplier_name": item.supplier.name if item.supplier else None,
            "is_active": bool(item.is_active), "is_low_stock": item.stock_qty <= item.reorder_level}

def order_dict(order: RestaurantOrder, db: Session) -> dict:
    items = db.query(OrderItem).options(joinedload(OrderItem.product)).filter(OrderItem.order_id == order.id).all()
    payments = db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.id.desc()).all()
    return {"id": order.id, "order_number": order.order_number, "table_id": order.table_id,
            "table_number": order.table.table_number if order.table else "Takeout", "created_by": order.created_by,
            "cashier_name": order.user.full_name if order.user else "Staff", "status": order.status,
            "subtotal": as_float(order.subtotal), "tax": as_float(order.tax), "total": as_float(order.total),
            "notes": order.notes, "created_at": order.created_at, "updated_at": order.updated_at,
            "items": [{"id": i.id, "product_id": i.product_id, "product_name": i.product.name if i.product else "Deleted product",
                       "quantity": i.quantity, "unit_price": as_float(i.unit_price), "line_total": as_float(i.line_total),
                       "kitchen_status": i.kitchen_status, "notes": i.notes} for i in items],
            "payments": [{"id": p.id, "amount": as_float(p.amount), "method": p.method,
                          "status": p.status, "transaction_ref": p.transaction_ref, "paid_at": p.paid_at} for p in payments]}

def record_audit(db: Session, user_id: Optional[int], action: str, entity: str, entity_id: Optional[int] = None, details: Optional[dict] = None):
    db.add(AuditLog(user_id=user_id, action=action, entity=entity, entity_id=entity_id, details=details))

def commit_or_409(db: Session, message: str = "This record conflicts with existing data"):
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=message) from exc

# --------------------------- Authentication / RBAC --------------------------
def current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme), db: Session = Depends(get_db)) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in to continue", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub", "0"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired session", headers={"WWW-Authenticate": "Bearer"})
    user = db.query(User).options(joinedload(User.role)).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account is inactive or no longer exists")
    return user

def allow_roles(*roles: str):
    def checker(user: User = Depends(current_user)) -> User:
        if user.role.name not in roles:
            raise HTTPException(status_code=403, detail="Your role is not permitted to perform this action")
        return user
    return checker

@app.post("/api/auth/login", tags=["authentication"])
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).options(joinedload(User.role)).filter(func.lower(User.email) == payload.email.lower()).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(str(user.id), user.role.name)
    return {"access_token": token, "token_type": "bearer", "user": user_dict(user)}

@app.get("/api/auth/me", tags=["authentication"])
def me(user: User = Depends(current_user)):
    return user_dict(user)

@app.get("/api/users", tags=["staff"])
def list_users(db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    return [user_dict(u) for u in db.query(User).options(joinedload(User.role)).order_by(User.full_name).all()]

@app.post("/api/users", status_code=201, tags=["staff"])
def create_user(payload: UserCreate, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin"))):
    role = db.query(Role).filter(Role.name == payload.role.lower()).first()
    if not role:
        raise HTTPException(400, "Unknown role. Use admin, manager, cashier or kitchen.")
    item = User(full_name=payload.full_name.strip(), email=payload.email.lower(), password_hash=hash_password(payload.password), role_id=role.id, is_active=True)
    db.add(item)
    db.flush()
    record_audit(db, user.id, "create", "user", item.id, {"email": item.email, "role": role.name})
    commit_or_409(db, "An account with this email already exists")
    db.refresh(item)
    return user_dict(item)

@app.patch("/api/users/{user_id}", tags=["staff"])
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin"))):
    item = db.query(User).options(joinedload(User.role)).filter(User.id == user_id).first()
    if not item: raise HTTPException(404, "User not found")
    data = payload.model_dump(exclude_unset=True)
    if "role" in data:
        role = db.query(Role).filter(Role.name == data.pop("role").lower()).first()
        if not role: raise HTTPException(400, "Unknown role")
        item.role_id = role.id
    if data.get("password"): item.password_hash = hash_password(data.pop("password"))
    for key, value in data.items(): setattr(item, key, value)
    record_audit(db, user.id, "update", "user", item.id)
    commit_or_409(db)
    db.refresh(item)
    item = db.query(User).options(joinedload(User.role)).filter(User.id == item.id).first()
    return user_dict(item)

@app.delete("/api/users/{user_id}", tags=["staff"])
def deactivate_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin"))):
    item = db.query(User).filter(User.id == user_id).first()
    if not item: raise HTTPException(404, "User not found")
    if item.id == user.id: raise HTTPException(400, "You cannot deactivate your own account")
    item.is_active = False
    record_audit(db, user.id, "deactivate", "user", item.id)
    db.commit()
    return {"message": "User account deactivated"}

# -------------------------------- Categories ---------------------------------
@app.get("/api/categories", tags=["menu"])
def list_categories(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [category_dict(c) for c in db.query(Category).filter(Category.is_active.is_(True)).order_by(Category.name).all()]

@app.post("/api/categories", status_code=201, tags=["menu"])
def create_category(payload: CategoryInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = Category(**payload.model_dump())
    db.add(item); db.flush(); record_audit(db, user.id, "create", "category", item.id)
    commit_or_409(db, "Category name already exists")
    return category_dict(item)

@app.patch("/api/categories/{category_id}", tags=["menu"])
def update_category(category_id: int, payload: CategoryInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Category).filter(Category.id == category_id).first()
    if not item: raise HTTPException(404, "Category not found")
    for k, v in payload.model_dump().items(): setattr(item, k, v)
    record_audit(db, user.id, "update", "category", item.id); commit_or_409(db, "Category name already exists")
    return category_dict(item)

@app.delete("/api/categories/{category_id}", tags=["menu"])
def delete_category(category_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Category).filter(Category.id == category_id).first()
    if not item: raise HTTPException(404, "Category not found")
    if db.query(Product).filter(Product.category_id == category_id).first():
        raise HTTPException(409, "Move or remove products in this category first")
    db.delete(item); record_audit(db, user.id, "delete", "category", category_id); db.commit()
    return {"message": "Category deleted"}

# --------------------------------- Products ----------------------------------
def save_recipe(db: Session, product_id: int, recipe: list[dict]):
    db.query(ProductIngredient).filter(ProductIngredient.product_id == product_id).delete(synchronize_session=False)
    for row in recipe:
        ingredient_id = int(row.get("ingredient_id", 0))
        quantity = Decimal(str(row.get("quantity_per_unit", 0)))
        if quantity <= 0: raise HTTPException(422, "Recipe quantity must be greater than zero")
        if not db.query(Ingredient.id).filter(Ingredient.id == ingredient_id, Ingredient.is_active.is_(True)).first():
            raise HTTPException(422, f"Ingredient {ingredient_id} does not exist or is inactive")
        db.add(ProductIngredient(product_id=product_id, ingredient_id=ingredient_id, quantity_per_unit=quantity))

@app.get("/api/products", tags=["menu"])
def list_products(category_id: Optional[int] = None, available_only: bool = False, db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = db.query(Product).options(joinedload(Product.category))
    if category_id: query = query.filter(Product.category_id == category_id)
    if available_only: query = query.filter(Product.is_available.is_(True))
    return [product_dict(p, db) for p in query.order_by(Product.name).all()]

@app.post("/api/products", status_code=201, tags=["menu"])
def create_product(payload: ProductInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    data = payload.model_dump(); recipe = data.pop("recipe")
    if not db.query(Category.id).filter(Category.id == data["category_id"]).first(): raise HTTPException(422, "Category does not exist")
    item = Product(**data); db.add(item); db.flush(); save_recipe(db, item.id, recipe)
    record_audit(db, user.id, "create", "product", item.id); commit_or_409(db, "Could not create product")
    item = db.query(Product).options(joinedload(Product.category)).filter(Product.id == item.id).first()
    return product_dict(item, db)

@app.patch("/api/products/{product_id}", tags=["menu"])
def update_product(product_id: int, payload: ProductInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Product).filter(Product.id == product_id).first()
    if not item: raise HTTPException(404, "Product not found")
    data = payload.model_dump(); recipe = data.pop("recipe")
    for k, v in data.items(): setattr(item, k, v)
    save_recipe(db, item.id, recipe); record_audit(db, user.id, "update", "product", item.id)
    commit_or_409(db, "Could not update product")
    item = db.query(Product).options(joinedload(Product.category)).filter(Product.id == item.id).first()
    return product_dict(item, db)

@app.delete("/api/products/{product_id}", tags=["menu"])
def delete_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Product).filter(Product.id == product_id).first()
    if not item: raise HTTPException(404, "Product not found")
    if db.query(OrderItem).filter(OrderItem.product_id == product_id).first():
        item.is_available = False
        db.commit()
        return {"message": "Product is in order history, so it was archived instead of permanently deleted"}
    db.delete(item); record_audit(db, user.id, "delete", "product", product_id); db.commit()
    return {"message": "Product deleted"}

# ---------------------------------- Suppliers --------------------------------
def supplier_dict(s: Supplier):
    return {"id": s.id, "name": s.name, "contact_person": s.contact_person, "phone": s.phone,
            "email": s.email, "address": s.address, "is_active": bool(s.is_active)}

@app.get("/api/suppliers", tags=["inventory"])
def list_suppliers(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [supplier_dict(s) for s in db.query(Supplier).order_by(Supplier.name).all()]

@app.post("/api/suppliers", status_code=201, tags=["inventory"])
def create_supplier(payload: SupplierInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = Supplier(**payload.model_dump()); db.add(item); db.flush(); record_audit(db, user.id, "create", "supplier", item.id)
    commit_or_409(db); return supplier_dict(item)

@app.patch("/api/suppliers/{supplier_id}", tags=["inventory"])
def update_supplier(supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not item: raise HTTPException(404, "Supplier not found")
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(item, k, v)
    record_audit(db, user.id, "update", "supplier", item.id); commit_or_409(db); return supplier_dict(item)

@app.delete("/api/suppliers/{supplier_id}", tags=["inventory"])
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not item: raise HTTPException(404, "Supplier not found")
    item.is_active = False; db.commit(); return {"message": "Supplier archived"}

# --------------------------------- Inventory ---------------------------------
@app.get("/api/ingredients", tags=["inventory"])
def list_ingredients(low_stock_only: bool = False, db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = db.query(Ingredient).options(joinedload(Ingredient.supplier)).filter(Ingredient.is_active.is_(True))
    items = query.order_by(Ingredient.name).all()
    if low_stock_only: items = [i for i in items if i.stock_qty <= i.reorder_level]
    return [ingredient_dict(i) for i in items]

@app.post("/api/ingredients", status_code=201, tags=["inventory"])
def create_ingredient(payload: IngredientInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    data = payload.model_dump(); opening_stock = data.pop("stock_qty")
    item = Ingredient(**data, stock_qty=Decimal("0")); db.add(item); db.flush()
    if opening_stock > 0:
        db.add(InventoryMovement(ingredient_id=item.id, quantity=opening_stock, movement_type="IN", reason="Opening stock", created_by=user.id))
    record_audit(db, user.id, "create", "ingredient", item.id); commit_or_409(db, "Ingredient name already exists")
    db.refresh(item)  # stock_qty is set by the DB trigger, so reload it
    item = db.query(Ingredient).options(joinedload(Ingredient.supplier)).filter(Ingredient.id == item.id).first()
    return ingredient_dict(item)

@app.patch("/api/ingredients/{ingredient_id}", tags=["inventory"])
def update_ingredient(ingredient_id: int, payload: IngredientUpdate, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not item: raise HTTPException(404, "Ingredient not found")
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(item, k, v)
    record_audit(db, user.id, "update", "ingredient", item.id); commit_or_409(db, "Ingredient could not be updated")
    item = db.query(Ingredient).options(joinedload(Ingredient.supplier)).filter(Ingredient.id == item.id).first()
    return ingredient_dict(item)

@app.delete("/api/ingredients/{ingredient_id}", tags=["inventory"])
def deactivate_ingredient(ingredient_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not item: raise HTTPException(404, "Ingredient not found")
    item.is_active = False; record_audit(db, user.id, "deactivate", "ingredient", item.id); db.commit()
    return {"message": "Ingredient archived"}

@app.get("/api/inventory/movements", tags=["inventory"])
def list_movements(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(InventoryMovement).options(joinedload(InventoryMovement.ingredient)).order_by(InventoryMovement.created_at.desc()).limit(limit).all()
    return [{"id": m.id, "ingredient_id": m.ingredient_id, "ingredient_name": m.ingredient.name,
             "quantity": as_float(m.quantity), "movement_type": m.movement_type, "reason": m.reason,
             "reference_order_id": m.reference_order_id, "created_by": m.created_by, "created_at": m.created_at} for m in rows]

@app.post("/api/inventory/movements", status_code=201, tags=["inventory"])
def create_movement(payload: MovementInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    ingredient = db.query(Ingredient).filter(Ingredient.id == payload.ingredient_id, Ingredient.is_active.is_(True)).first()
    if not ingredient: raise HTTPException(404, "Ingredient not found")
    if payload.movement_type in ("IN", "OUT") and payload.quantity <= 0:
        raise HTTPException(422, "IN and OUT quantities must be greater than zero")
    if payload.movement_type == "ADJUST" and payload.quantity == 0:
        raise HTTPException(422, "Adjustment quantity cannot be zero")
    if payload.movement_type == "OUT" and ingredient.stock_qty < payload.quantity:
        raise HTTPException(409, f"Insufficient stock. Available: {ingredient.stock_qty} {ingredient.unit}")
    if payload.movement_type == "ADJUST" and ingredient.stock_qty + payload.quantity < 0:
        raise HTTPException(409, "Adjustment would result in negative stock")
    item = InventoryMovement(ingredient_id=payload.ingredient_id, quantity=payload.quantity,
                             movement_type=payload.movement_type, reason=payload.reason, created_by=user.id)
    db.add(item); db.flush(); record_audit(db, user.id, "create", "inventory_movement", item.id, {"type": payload.movement_type})
    db.commit()
    db.refresh(ingredient)
    return {"message": "Inventory movement recorded", "ingredient": ingredient_dict(ingredient)}

@app.get("/api/inventory/forecast", tags=["AI inventory forecast"])
def inventory_forecast(db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    """A transparent, database-driven 28-day moving-average forecast (no paid AI key required)."""
    since = datetime.now() - timedelta(days=28)
    sales_rows = db.query(OrderItem.product_id, func.sum(OrderItem.quantity).label("units"))\
        .join(RestaurantOrder, OrderItem.order_id == RestaurantOrder.id)\
        .filter(RestaurantOrder.created_at >= since, RestaurantOrder.status.notin_(["cancelled"]))\
        .group_by(OrderItem.product_id).all()
    units_by_product = {int(row.product_id): float(row.units or 0) for row in sales_rows}
    ingredients = db.query(Ingredient).options(joinedload(Ingredient.supplier)).filter(Ingredient.is_active.is_(True)).all()
    rows = []
    for ingredient in ingredients:
        recipe_rows = db.query(ProductIngredient).filter(ProductIngredient.ingredient_id == ingredient.id).all()
        observed_28_day_usage = sum(units_by_product.get(int(r.product_id), 0) * float(r.quantity_per_unit) for r in recipe_rows)
        avg_week = observed_28_day_usage / 4.0
        safety_buffer = avg_week * 0.15
        recommended = max(0.0, avg_week + safety_buffer - float(ingredient.stock_qty))
        rows.append({"ingredient_id": ingredient.id, "ingredient_name": ingredient.name, "unit": ingredient.unit,
                     "stock_qty": as_float(ingredient.stock_qty), "reorder_level": as_float(ingredient.reorder_level),
                     "observed_usage_28_days": round(observed_28_day_usage, 3),
                     "forecast_weekly_usage": round(avg_week, 3), "safety_buffer": round(safety_buffer, 3),
                     "recommended_purchase_qty": round(recommended, 3),
                     "unit_cost": as_float(ingredient.unit_cost),
                     "estimated_purchase_cost": round(recommended * as_float(ingredient.unit_cost), 2),
                     "supplier_id": ingredient.supplier_id,
                     "supplier_name": ingredient.supplier.name if ingredient.supplier else "Assign a supplier",
                     "confidence": "medium" if observed_28_day_usage > 0 else "low",
                     "method": "28-day sales moving average + 15% safety buffer"})
    rows.sort(key=lambda r: (r["recommended_purchase_qty"] > 0, r["recommended_purchase_qty"]), reverse=True)
    return {"generated_at": datetime.now(), "period_days": 28, "forecast_horizon_days": 7,
            "summary": {"ingredients_analyzed": len(rows), "items_to_reorder": sum(1 for r in rows if r["recommended_purchase_qty"] > 0),
                        "estimated_purchase_cost": round(sum(r["estimated_purchase_cost"] for r in rows), 2)},
            "notice": "Forecasts are estimates derived from recorded order history and recipe quantities. New menus or unusual demand can reduce accuracy.",
            "items": rows}

# -------------------------------- Dining tables -------------------------------
@app.get("/api/tables", tags=["floor management"])
def list_tables(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{"id": t.id, "table_number": t.table_number, "capacity": t.capacity, "status": t.status, "location_note": t.location_note}
            for t in db.query(DiningTable).order_by(DiningTable.table_number).all()]

@app.post("/api/tables", status_code=201, tags=["floor management"])
def create_table(payload: TableInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = DiningTable(**payload.model_dump()); db.add(item); db.flush(); record_audit(db, user.id, "create", "dining_table", item.id)
    commit_or_409(db, "That table number already exists")
    return {"id": item.id, **payload.model_dump()}

@app.patch("/api/tables/{table_id}", tags=["floor management"])
def update_table(table_id: int, payload: TableUpdate, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager", "cashier"))):
    item = db.query(DiningTable).filter(DiningTable.id == table_id).first()
    if not item: raise HTTPException(404, "Table not found")
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(item, k, v)
    commit_or_409(db, "Table update conflicts with existing data")
    return {"id": item.id, "table_number": item.table_number, "capacity": item.capacity, "status": item.status, "location_note": item.location_note}

@app.delete("/api/tables/{table_id}", tags=["floor management"])
def delete_table(table_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(DiningTable).filter(DiningTable.id == table_id).first()
    if not item: raise HTTPException(404, "Table not found")
    if item.status == "occupied": raise HTTPException(409, "Cannot delete an occupied table")
    db.delete(item); db.commit(); return {"message": "Table deleted"}

# ----------------------------------- Orders ----------------------------------
@app.get("/api/orders", tags=["orders"])
def list_orders(status_filter: Optional[str] = None, limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = db.query(RestaurantOrder).options(joinedload(RestaurantOrder.table), joinedload(RestaurantOrder.user))
    if status_filter: query = query.filter(RestaurantOrder.status == status_filter)
    rows = query.order_by(RestaurantOrder.created_at.desc()).limit(limit).all()
    return [order_dict(o, db) for o in rows]

@app.get("/api/orders/{order_id}", tags=["orders"])
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item = db.query(RestaurantOrder).options(joinedload(RestaurantOrder.table), joinedload(RestaurantOrder.user)).filter(RestaurantOrder.id == order_id).first()
    if not item: raise HTTPException(404, "Order not found")
    return order_dict(item, db)

@app.post("/api/orders", status_code=201, tags=["orders"])
def create_order(payload: OrderInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager", "cashier"))):
    if payload.table_id and not db.query(DiningTable.id).filter(DiningTable.id == payload.table_id).first():
        raise HTTPException(422, "Dining table does not exist")
    product_ids = list({line.product_id for line in payload.items})
    product_map = {p.id: p for p in db.query(Product).filter(Product.id.in_(product_ids), Product.is_available.is_(True)).all()}
    missing = set(product_ids) - set(product_map)
    if missing: raise HTTPException(422, f"Unavailable or unknown products: {sorted(missing)}")
    subtotal = Decimal("0.00")
    recipe_needs: dict[int, Decimal] = {}
    for line in payload.items:
        product = product_map[line.product_id]
        subtotal += Decimal(product.price) * line.quantity
        for recipe in db.query(ProductIngredient).filter(ProductIngredient.product_id == product.id).all():
            recipe_needs[recipe.ingredient_id] = recipe_needs.get(recipe.ingredient_id, Decimal("0")) + Decimal(recipe.quantity_per_unit) * line.quantity
    if recipe_needs:
        available = {i.id: i for i in db.query(Ingredient).filter(Ingredient.id.in_(list(recipe_needs))).all()}
        for ingredient_id, need in recipe_needs.items():
            ingredient = available.get(ingredient_id)
            if not ingredient or ingredient.stock_qty < need:
                name = ingredient.name if ingredient else f"Ingredient {ingredient_id}"
                stock = ingredient.stock_qty if ingredient else 0
                unit = ingredient.unit if ingredient else "units"
                raise HTTPException(409, f"Not enough {name}. Need {need} {unit}; stock is {stock} {unit}.")
    tax = (subtotal * Decimal(str(settings.tax_rate))).quantize(Decimal("0.01"))
    total = subtotal + tax
    item = RestaurantOrder(order_number=f"POS-{datetime.now():%y%m%d}-{uuid4().hex[:6].upper()}",
                           table_id=payload.table_id, created_by=user.id, status="pending", subtotal=subtotal,
                           tax=tax, total=total, notes=payload.notes)
    db.add(item); db.flush()
    for line in payload.items:
        product = product_map[line.product_id]
        db.add(OrderItem(order_id=item.id, product_id=product.id, quantity=line.quantity,
                         unit_price=product.price, line_total=Decimal(product.price) * line.quantity,
                         kitchen_status="queued", notes=line.notes))
    db.flush()  # The SQL trigger consumes recipe ingredients from inventory.
    db.add(Payment(order_id=item.id, amount=total, method=payload.payment_method, status="paid", transaction_ref=payload.transaction_ref))
    if payload.table_id:
        table = db.query(DiningTable).filter(DiningTable.id == payload.table_id).first(); table.status = "occupied"
    record_audit(db, user.id, "create", "order", item.id, {"order_number": item.order_number, "total": str(total)})
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, "Order was not saved. Confirm the MySQL schema triggers have been installed and retry.") from exc
    item = db.query(RestaurantOrder).options(joinedload(RestaurantOrder.table), joinedload(RestaurantOrder.user)).filter(RestaurantOrder.id == item.id).first()
    return order_dict(item, db)

@app.patch("/api/orders/{order_id}/status", tags=["orders"])
def update_order_status(order_id: int, payload: OrderStatusInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager", "cashier", "kitchen"))):
    item = db.query(RestaurantOrder).filter(RestaurantOrder.id == order_id).first()
    if not item: raise HTTPException(404, "Order not found")
    if item.status in ("completed", "cancelled"): raise HTTPException(409, "Completed or cancelled orders cannot be changed")
    if payload.status == "completed" and item.status not in ("served", "ready"):
        raise HTTPException(409, "An order must be served or ready before completing it")
    item.status = payload.status
    if payload.status == "completed": item.completed_at = datetime.now()
    if payload.status in ("served", "completed", "cancelled") and item.table_id:
        table = db.query(DiningTable).filter(DiningTable.id == item.table_id).first()
        if table: table.status = "available"
    record_audit(db, user.id, "status_change", "order", item.id, {"status": payload.status}); db.commit()
    item = db.query(RestaurantOrder).options(joinedload(RestaurantOrder.table), joinedload(RestaurantOrder.user)).filter(RestaurantOrder.id == item.id).first()
    return order_dict(item, db)

@app.patch("/api/order-items/{item_id}/kitchen-status", tags=["kitchen"])
def update_kitchen_status(item_id: int, payload: KitchenItemStatusInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager", "kitchen", "cashier"))):
    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item: raise HTTPException(404, "Order item not found")
    order = db.query(RestaurantOrder).filter(RestaurantOrder.id == item.order_id).first()
    if order.status in ("completed", "cancelled"): raise HTTPException(409, "This order is already closed")
    item.kitchen_status = payload.kitchen_status
    rows = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    if rows and all(r.kitchen_status in ("ready", "served", "cancelled") for r in rows):
        if any(r.kitchen_status == "ready" for r in rows): order.status = "ready"
        elif all(r.kitchen_status in ("served", "cancelled") for r in rows): order.status = "served"
    elif any(r.kitchen_status == "preparing" for r in rows): order.status = "preparing"
    record_audit(db, user.id, "kitchen_status", "order_item", item.id, {"status": payload.kitchen_status}); db.commit()
    return order_dict(db.query(RestaurantOrder).options(joinedload(RestaurantOrder.table), joinedload(RestaurantOrder.user)).filter(RestaurantOrder.id == order.id).first(), db)

@app.delete("/api/orders/{order_id}", tags=["orders"])
def cancel_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(RestaurantOrder).filter(RestaurantOrder.id == order_id).first()
    if not item: raise HTTPException(404, "Order not found")
    if item.status not in ("pending",): raise HTTPException(409, "Only pending orders can be cancelled; kitchen orders need a status update")
    item.status = "cancelled"
    if item.table_id:
        table = db.query(DiningTable).filter(DiningTable.id == item.table_id).first()
        if table: table.status = "available"
    record_audit(db, user.id, "cancel", "order", item.id); db.commit()
    return {"message": "Order cancelled. Consumed ingredients are not automatically returned to stock; record a stock adjustment if required."}

@app.get("/api/kitchen/tickets", tags=["kitchen"])
def kitchen_tickets(db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager", "kitchen", "cashier"))):
    orders = db.query(RestaurantOrder).options(joinedload(RestaurantOrder.table), joinedload(RestaurantOrder.user))\
        .filter(RestaurantOrder.status.in_(["pending", "preparing", "ready"]))\
        .order_by(RestaurantOrder.created_at.asc()).all()
    return [order_dict(o, db) for o in orders]

# ------------------------------- Reports / KPIs ------------------------------
@app.get("/api/dashboard/summary", tags=["dashboard"])
def dashboard_summary(db: Session = Depends(get_db), user: User = Depends(current_user)):
    today = date.today()
    today_orders = db.query(RestaurantOrder).filter(func.date(RestaurantOrder.created_at) == today,
                    RestaurantOrder.status.notin_(["cancelled"])).all()
    sales = sum(as_float(o.total) for o in today_orders if o.status in ("served", "completed", "ready", "preparing", "pending"))
    low_stock = db.query(Ingredient).filter(Ingredient.is_active.is_(True), Ingredient.stock_qty <= Ingredient.reorder_level).count()
    active_orders = db.query(RestaurantOrder).filter(RestaurantOrder.status.in_(["pending", "preparing", "ready"])).count()
    best_rows = db.query(Product.name, func.sum(OrderItem.quantity).label("units"), func.sum(OrderItem.line_total).label("revenue"))\
        .join(OrderItem, Product.id == OrderItem.product_id).join(RestaurantOrder, OrderItem.order_id == RestaurantOrder.id)\
        .filter(RestaurantOrder.status.in_(["served", "completed"]), RestaurantOrder.created_at >= datetime.now() - timedelta(days=30))\
        .group_by(Product.id, Product.name).order_by(desc("units")).limit(5).all()
    recent = db.query(RestaurantOrder).options(joinedload(RestaurantOrder.table), joinedload(RestaurantOrder.user)).order_by(RestaurantOrder.created_at.desc()).limit(6).all()
    week_rows = db.query(func.date(RestaurantOrder.created_at).label("day"), func.sum(RestaurantOrder.total).label("sales"))\
        .filter(RestaurantOrder.created_at >= datetime.now() - timedelta(days=6), RestaurantOrder.status.in_(["served", "completed"]))\
        .group_by(func.date(RestaurantOrder.created_at)).all()
    week_map = {str(r.day): as_float(r.sales) for r in week_rows}
    chart = [{"date": str(today - timedelta(days=n)), "label": (today - timedelta(days=n)).strftime("%a"), "sales": round(week_map.get(str(today - timedelta(days=n)), 0), 2)} for n in reversed(range(7))]
    return {"today_sales": round(sales, 2), "today_orders": len(today_orders),
            "average_ticket": round(sales / len(today_orders), 2) if today_orders else 0,
            "active_orders": active_orders, "low_stock_count": low_stock,
            "top_products": [{"name": r.name, "units_sold": int(r.units or 0), "revenue": as_float(r.revenue)} for r in best_rows],
            "sales_last_7_days": chart, "recent_orders": [order_dict(o, db) for o in recent]}

@app.get("/api/reports/sales", tags=["reports"])
def sales_report(days: int = Query(default=7, ge=1, le=365), db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    cutoff = datetime.now() - timedelta(days=days - 1)
    rows = db.query(func.date(RestaurantOrder.created_at).label("sales_date"), func.count(RestaurantOrder.id).label("orders"),
                    func.sum(RestaurantOrder.total).label("sales"), func.avg(RestaurantOrder.total).label("avg_order"))\
        .filter(RestaurantOrder.created_at >= cutoff, RestaurantOrder.status.in_(["served", "completed"]))\
        .group_by(func.date(RestaurantOrder.created_at)).order_by(func.date(RestaurantOrder.created_at)).all()
    return {"days": days, "rows": [{"date": str(r.sales_date), "orders": int(r.orders), "sales": as_float(r.sales), "average_order": as_float(r.avg_order)} for r in rows]}

@app.get("/api/reports/product-sales", tags=["reports"])
def product_sales(db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    rows = db.query(Product.name, Category.name.label("category"), func.coalesce(func.sum(OrderItem.quantity), 0).label("units"),
                    func.coalesce(func.sum(OrderItem.line_total), 0).label("revenue"))\
        .join(Category, Category.id == Product.category_id).outerjoin(OrderItem, OrderItem.product_id == Product.id)\
        .outerjoin(RestaurantOrder, RestaurantOrder.id == OrderItem.order_id)\
        .filter((RestaurantOrder.id.is_(None)) | (RestaurantOrder.status.in_(["served", "completed"])))\
        .group_by(Product.id, Product.name, Category.name).order_by(desc("revenue")).all()
    return [{"product": r.name, "category": r.category, "units_sold": int(r.units or 0), "revenue": as_float(r.revenue)} for r in rows]

# ---------------------------------- Shifts -----------------------------------
@app.get("/api/shifts", tags=["staff"])
def list_shifts(db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    shifts = db.query(Shift).order_by(Shift.starts_at.desc()).all()
    result = []
    for shift in shifts:
        assignments = db.query(ShiftAssignment).filter(ShiftAssignment.shift_id == shift.id).all()
        members = []
        for assignment in assignments:
            staff = db.query(User).filter(User.id == assignment.user_id).first()
            if staff: members.append({"id": staff.id, "full_name": staff.full_name, "role": staff.role.name if staff.role else "staff"})
        result.append({"id": shift.id, "title": shift.title, "starts_at": shift.starts_at, "ends_at": shift.ends_at, "notes": shift.notes, "staff": members})
    return result

@app.post("/api/shifts", status_code=201, tags=["staff"])
def create_shift(payload: ShiftInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    if payload.ends_at <= payload.starts_at: raise HTTPException(422, "Shift end must be after shift start")
    item = Shift(**payload.model_dump()); db.add(item); db.flush(); record_audit(db, user.id, "create", "shift", item.id); db.commit()
    return {"id": item.id, "title": item.title, "starts_at": item.starts_at, "ends_at": item.ends_at, "notes": item.notes}

@app.patch("/api/shifts/{shift_id}", tags=["staff"])
def update_shift(shift_id: int, payload: ShiftUpdate, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Shift).filter(Shift.id == shift_id).first()
    if not item: raise HTTPException(404, "Shift not found")
    data = payload.model_dump(exclude_unset=True)
    starts = data.get("starts_at", item.starts_at)
    ends = data.get("ends_at", item.ends_at)
    if starts and ends and ends <= starts: raise HTTPException(422, "Shift end must be after shift start")
    for key, value in data.items(): setattr(item, key, value)
    record_audit(db, user.id, "update", "shift", item.id); db.commit()
    return {"id": item.id, "title": item.title, "starts_at": item.starts_at, "ends_at": item.ends_at, "notes": item.notes}

@app.get("/api/shift-assignments", tags=["staff"])
def list_shift_assignments(shift_id: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    query = db.query(ShiftAssignment)
    if shift_id is not None: query = query.filter(ShiftAssignment.shift_id == shift_id)
    result = []
    for assignment in query.order_by(ShiftAssignment.shift_id, ShiftAssignment.user_id).all():
        staff = db.query(User).options(joinedload(User.role)).filter(User.id == assignment.user_id).first()
        shift = db.query(Shift).filter(Shift.id == assignment.shift_id).first()
        result.append({"id": assignment.id, "shift_id": assignment.shift_id, "shift_title": shift.title if shift else "Deleted shift",
                       "user_id": assignment.user_id, "full_name": staff.full_name if staff else "Deleted user",
                       "role": staff.role.name if staff and staff.role else "staff", "assigned_at": assignment.assigned_at})
    return result

@app.post("/api/shift-assignments", status_code=201, tags=["staff"])
def create_shift_assignment(payload: ShiftAssignmentInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    if not db.query(Shift.id).filter(Shift.id == payload.shift_id).first(): raise HTTPException(404, "Shift not found")
    if not db.query(User.id).filter(User.id == payload.user_id, User.is_active.is_(True)).first(): raise HTTPException(404, "Active staff member not found")
    item = ShiftAssignment(shift_id=payload.shift_id, user_id=payload.user_id); db.add(item); db.flush()
    record_audit(db, user.id, "assign", "shift_assignment", item.id)
    commit_or_409(db, "This staff member is already assigned to that shift")
    return {"id": item.id, "shift_id": item.shift_id, "user_id": item.user_id}

@app.delete("/api/shift-assignments/{assignment_id}", tags=["staff"])
def delete_shift_assignment(assignment_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(ShiftAssignment).filter(ShiftAssignment.id == assignment_id).first()
    if not item: raise HTTPException(404, "Shift assignment not found")
    db.delete(item); record_audit(db, user.id, "unassign", "shift_assignment", assignment_id); db.commit()
    return {"message": "Staff member removed from shift"}

@app.delete("/api/shifts/{shift_id}", tags=["staff"])
def delete_shift(shift_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    item = db.query(Shift).filter(Shift.id == shift_id).first()
    if not item: raise HTTPException(404, "Shift not found")
    db.delete(item); db.commit(); return {"message": "Shift deleted"}

# ----------------------------- Purchase ordering -----------------------------
@app.get("/api/purchase-orders", tags=["purchasing"])
def list_purchase_orders(db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    rows = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.supplier)).order_by(PurchaseOrder.order_date.desc()).all()
    result = []
    for row in rows:
        lines = db.query(PurchaseOrderItem).options(joinedload(PurchaseOrderItem.ingredient)).filter(PurchaseOrderItem.purchase_order_id == row.id).all()
        result.append({"id": row.id, "supplier_id": row.supplier_id, "supplier_name": row.supplier.name,
                       "status": row.status, "total_cost": as_float(row.total_cost), "order_date": row.order_date,
                       "expected_date": row.expected_date, "received_at": row.received_at, "notes": row.notes,
                       "items": [{"ingredient_id": li.ingredient_id, "ingredient_name": li.ingredient.name,
                                  "quantity": as_float(li.quantity), "unit": li.ingredient.unit,
                                  "unit_cost": as_float(li.unit_cost), "line_total": as_float(li.line_total)} for li in lines]})
    return result

@app.post("/api/purchase-orders", status_code=201, tags=["purchasing"])
def create_purchase_order(payload: PurchaseOrderInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    if not db.query(Supplier.id).filter(Supplier.id == payload.supplier_id, Supplier.is_active.is_(True)).first(): raise HTTPException(422, "Supplier does not exist")
    row = PurchaseOrder(supplier_id=payload.supplier_id, created_by=user.id, status="ordered", expected_date=payload.expected_date, notes=payload.notes, total_cost=0)
    db.add(row); db.flush(); total = Decimal("0.00")
    for line in payload.items:
        ingredient = db.query(Ingredient).filter(Ingredient.id == line.ingredient_id, Ingredient.is_active.is_(True)).first()
        if not ingredient: raise HTTPException(422, f"Ingredient {line.ingredient_id} does not exist")
        unit_cost = line.unit_cost if line.unit_cost is not None else ingredient.unit_cost
        line_total = Decimal(unit_cost) * line.quantity; total += line_total
        db.add(PurchaseOrderItem(purchase_order_id=row.id, ingredient_id=ingredient.id, quantity=line.quantity, unit_cost=unit_cost, line_total=line_total))
    row.total_cost = total
    record_audit(db, user.id, "create", "purchase_order", row.id); commit_or_409(db, "Could not save purchase order")
    return {"id": row.id, "status": row.status, "total_cost": as_float(row.total_cost), "message": "Purchase order created"}

@app.patch("/api/purchase-orders/{purchase_order_id}", tags=["purchasing"])
def update_purchase_order(purchase_order_id: int, payload: PurchaseOrderStatusInput, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    row = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not row: raise HTTPException(404, "Purchase order not found")
    if row.status == "received": raise HTTPException(409, "Received purchase orders cannot be changed")
    row.status = payload.status
    if "expected_date" in payload.model_fields_set: row.expected_date = payload.expected_date
    if "notes" in payload.model_fields_set: row.notes = payload.notes
    record_audit(db, user.id, "update", "purchase_order", row.id, {"status": row.status}); db.commit()
    return {"id": row.id, "status": row.status, "expected_date": row.expected_date, "notes": row.notes}

@app.delete("/api/purchase-orders/{purchase_order_id}", tags=["purchasing"])
def delete_purchase_order(purchase_order_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    row = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not row: raise HTTPException(404, "Purchase order not found")
    if row.status not in ("draft", "cancelled"): raise HTTPException(409, "Only draft or cancelled purchase orders can be deleted")
    record_audit(db, user.id, "delete", "purchase_order", row.id); db.delete(row); db.commit()
    return {"message": "Purchase order deleted"}

@app.post("/api/purchase-orders/{purchase_order_id}/receive", tags=["purchasing"])
def receive_purchase_order(purchase_order_id: int, db: Session = Depends(get_db), user: User = Depends(allow_roles("admin", "manager"))):
    row = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not row: raise HTTPException(404, "Purchase order not found")
    if row.status == "received": raise HTTPException(409, "Purchase order was already received")
    if row.status == "cancelled": raise HTTPException(409, "Cancelled purchase orders cannot be received")
    lines = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.purchase_order_id == row.id).all()
    for line in lines:
        db.add(InventoryMovement(ingredient_id=line.ingredient_id, quantity=line.quantity, movement_type="IN",
                                 reason=f"Received purchase order #{row.id}", created_by=user.id))
    row.status = "received"; row.received_at = datetime.now()
    record_audit(db, user.id, "receive", "purchase_order", row.id); db.commit()
    return {"message": "Purchase order received and stock balances updated", "id": row.id, "status": row.status}

@app.get("/api/audit-logs", tags=["security"])
def list_audit_logs(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db), user: User = Depends(allow_roles("admin"))):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [{"id": r.id, "user_id": r.user_id, "action": r.action, "entity": r.entity,
             "entity_id": r.entity_id, "details": r.details, "created_at": r.created_at} for r in rows]

@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request, exc):
    return JSONResponse(status_code=500, content={"detail": "Database operation failed. Check the API logs and verify your MySQL schema is installed."})
