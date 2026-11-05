from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, ForeignKey, JSON, Numeric, SmallInteger, String, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(40), unique=True, nullable=False)
    description = Column(String(255))

class User(Base):
    __tablename__ = "users"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    role_id = Column(BigInteger, ForeignKey("roles.id"), nullable=False)
    full_name = Column(String(120), nullable=False)
    email = Column(String(190), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    role = relationship("Role")

class Category(Base):
    __tablename__ = "categories"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(90), unique=True, nullable=False)
    description = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(140), nullable=False)
    contact_person = Column(String(120))
    phone = Column(String(40))
    email = Column(String(190))
    address = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    supplier_id = Column(BigInteger, ForeignKey("suppliers.id", ondelete="SET NULL"))
    name = Column(String(140), unique=True, nullable=False)
    unit = Column(String(24), nullable=False)
    stock_qty = Column(Numeric(12, 3), nullable=False, default=0)
    reorder_level = Column(Numeric(12, 3), nullable=False, default=0)
    unit_cost = Column(Numeric(12, 2), nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    supplier = relationship("Supplier")

class Product(Base):
    __tablename__ = "products"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    category_id = Column(BigInteger, ForeignKey("categories.id"), nullable=False)
    name = Column(String(140), nullable=False)
    description = Column(String(500))
    price = Column(Numeric(12, 2), nullable=False)
    image_url = Column(String(500))
    prep_time_minutes = Column(SmallInteger, nullable=False, default=10)
    is_available = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    category = relationship("Category")

class ProductIngredient(Base):
    __tablename__ = "product_ingredients"
    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    ingredient_id = Column(BigInteger, ForeignKey("ingredients.id"), primary_key=True)
    quantity_per_unit = Column(Numeric(12, 3), nullable=False)
    ingredient = relationship("Ingredient")
    product = relationship("Product")

class DiningTable(Base):
    __tablename__ = "dining_tables"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    table_number = Column(String(20), unique=True, nullable=False)
    capacity = Column(SmallInteger, nullable=False, default=2)
    status = Column(String(24), nullable=False, default="available")
    location_note = Column(String(120))

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    notes = Column(String(255))

class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    shift_id = Column(BigInteger, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    __table_args__ = (UniqueConstraint("shift_id", "user_id", name="uq_shift_user"),)

class RestaurantOrder(Base):
    __tablename__ = "restaurant_orders"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_number = Column(String(32), unique=True, nullable=False)
    table_id = Column(BigInteger, ForeignKey("dining_tables.id", ondelete="SET NULL"))
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    status = Column(String(24), nullable=False, default="pending")
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)
    notes = Column(String(500))
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    completed_at = Column(DateTime)
    table = relationship("DiningTable")
    user = relationship("User")
    items = relationship("OrderItem", cascade="all, delete-orphan")
    payments = relationship("Payment", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("restaurant_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(BigInteger, ForeignKey("products.id"), nullable=False)
    quantity = Column(SmallInteger, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)
    kitchen_status = Column(String(24), nullable=False, default="queued")
    notes = Column(String(255))
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    product = relationship("Product")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("restaurant_orders.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    method = Column(String(24), nullable=False)
    status = Column(String(24), nullable=False, default="paid")
    transaction_ref = Column(String(120))
    paid_at = Column(TIMESTAMP, server_default=func.current_timestamp())

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    supplier_id = Column(BigInteger, ForeignKey("suppliers.id"), nullable=False)
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    status = Column(String(24), nullable=False, default="draft")
    total_cost = Column(Numeric(12, 2), nullable=False, default=0)
    order_date = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    expected_date = Column(Date)
    received_at = Column(DateTime)
    notes = Column(String(255))
    supplier = relationship("Supplier")
    items = relationship("PurchaseOrderItem", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(BigInteger, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    unit_cost = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)
    ingredient = relationship("Ingredient")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ingredient_id = Column(BigInteger, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    movement_type = Column(String(12), nullable=False)
    reason = Column(String(255), nullable=False)
    reference_order_id = Column(BigInteger, ForeignKey("restaurant_orders.id", ondelete="SET NULL"))
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    ingredient = relationship("Ingredient")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(80), nullable=False)
    entity = Column(String(80), nullable=False)
    entity_id = Column(BigInteger)
    details = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
