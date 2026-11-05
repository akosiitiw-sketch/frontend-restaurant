"""Idempotent demo data for Project NOAH POS. Change demo passwords before deployment."""
from decimal import Decimal
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models
from app.models import Role, User, Category, Supplier, Ingredient, Product, ProductIngredient, DiningTable, InventoryMovement
from app.security import hash_password

DEMO_USERS = [
    ("NOAH Administrator", "admin@noahpos.local", "Admin123!", "admin"),
    ("Restaurant Manager", "manager@noahpos.local", "Manager123!", "manager"),
    ("Front Cashier", "cashier@noahpos.local", "Cashier123!", "cashier"),
    ("Kitchen Staff", "kitchen@noahpos.local", "Kitchen123!", "kitchen"),
]

MENU = [
    ("Rice Meals", "Comforting Filipino rice meals"),
    ("Burgers", "Grilled burgers and sandwiches"),
    ("Pasta", "Pasta bowls"),
    ("Drinks", "Cold drinks"),
    ("Sides", "Snacks and sides"),
    ("Salads", "Fresh salads"),
    ("Pizza", "Oven-baked pizza"),
    ("Desserts", "Sweet treats"),
]

def seed():
    # SQL schema is normally installed by MySQL's docker-entrypoint-initdb.d.
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        for name, description in [("admin", "Full system access"), ("manager", "Restaurant operations and reports"), ("cashier", "POS and customer orders"), ("kitchen", "Kitchen tickets and preparation")]:
            if not db.query(Role).filter_by(name=name).first(): db.add(Role(name=name, description=description))
        db.flush()
        for full_name, email, password, role_name in DEMO_USERS:
            if not db.query(User).filter_by(email=email).first():
                db.add(User(full_name=full_name, email=email, password_hash=hash_password(password), role_id=db.query(Role).filter_by(name=role_name).one().id, is_active=True))
        db.flush()
        for name, description in MENU:
            if not db.query(Category).filter_by(name=name).first(): db.add(Category(name=name, description=description, is_active=True))
        db.flush()
        supplier = db.query(Supplier).filter_by(name="NOAH Fresh & Grocery Supply").first()
        if not supplier:
            supplier = Supplier(name="NOAH Fresh & Grocery Supply", contact_person="Demo Supplier", phone="09170000000", email="supplier@noahpos.local", address="Metro Manila", is_active=True)
            db.add(supplier); db.flush()
        ingredients_seed = [
            ("Chicken breast", "g", 6000, 1200, 0.28),
            ("Pork slices", "g", 4500, 1000, 0.32),
            ("Rice", "g", 10000, 2500, 0.07),
            ("Burger patty", "pc", 48, 12, 28.00),
            ("Burger bun", "pc", 50, 12, 8.00),
            ("Cheese slice", "pc", 60, 15, 5.00),
            ("Pasta noodles", "g", 3000, 750, 0.12),
            ("Tomato sauce", "ml", 2500, 600, 0.09),
            ("Iced tea", "ml", 5000, 1000, 0.04),
            ("Potatoes", "g", 4000, 800, 0.10),
            ("Cooking oil", "ml", 3000, 700, 0.08),
            ("Garlic", "g", 500, 100, 0.20),
            ("Romaine lettuce", "g", 3000, 600, 0.12),
            ("Parmesan cheese", "g", 1500, 300, 0.90),
            ("Mozzarella cheese", "g", 3000, 600, 0.45),
            ("Pizza dough", "pc", 30, 8, 25.00),
            ("Cooking cream", "ml", 3000, 600, 0.15),
            ("Chocolate cake slice", "pc", 30, 8, 35.00),
            ("Espresso coffee", "g", 2000, 400, 1.20),
            ("Fresh milk", "ml", 10000, 2000, 0.07),
            ("Fresh fruit", "g", 8000, 1500, 0.12),
        ]
        new_ingredients = []
        for name, unit, stock, reorder, cost in ingredients_seed:
            found = db.query(Ingredient).filter_by(name=name).first()
            if not found:
                found = Ingredient(name=name, unit=unit, stock_qty=Decimal("0"), reorder_level=Decimal(str(reorder)), unit_cost=Decimal(str(cost)), supplier_id=supplier.id, is_active=True)
                db.add(found); db.flush()
                new_ingredients.append((found.id, Decimal(str(stock))))
        db.flush()
        # Stock is ledger-driven; the SQL trigger applies these initial IN movements.
        admin_id = db.query(User).filter_by(email="admin@noahpos.local").one().id
        for ingredient_id, qty in new_ingredients:
            db.add(InventoryMovement(ingredient_id=ingredient_id, quantity=qty, movement_type="IN", reason="Demo opening balance", created_by=admin_id))
        db.flush()
        products_seed = [
            ("Chicken Inasal Rice", "Rice Meals", "Grilled chicken with garlic rice", 189.00, 14, [("Chicken breast", 180), ("Rice", 250), ("Cooking oil", 10), ("Garlic", 5)], "/images/chicken_inasal.jpg"),
            ("Pork Sisig Rice", "Rice Meals", "Sizzling-style pork sisig rice bowl", 179.00, 12, [("Pork slices", 160), ("Rice", 250), ("Cooking oil", 10), ("Garlic", 5)], "/images/pork_sisig_rice.jpg"),
            ("Classic Cheeseburger", "Burgers", "Beef patty, cheese and toasted bun", 149.00, 10, [("Burger patty", 1), ("Burger bun", 1), ("Cheese slice", 1)], "/images/classic_cheeseburger.jpg"),
            ("Double Cheeseburger", "Burgers", "Two patties with melted cheese", 209.00, 12, [("Burger patty", 2), ("Burger bun", 1), ("Cheese slice", 2)], "/images/double_cheeseburger.jpg"),
            ("Filipino-Style Spaghetti", "Pasta", "Sweet tomato sauce with pasta", 139.00, 12, [("Pasta noodles", 150), ("Tomato sauce", 120), ("Cooking oil", 5), ("Garlic", 3)], "/images/filipino_spaghetti.jpg"),
            ("Iced Tea", "Drinks", "House-brewed iced tea", 39.00, 2, [("Iced tea", 350)], "/images/ice_tea.jpg"),
            ("French Fries", "Sides", "Crispy potato fries", 69.00, 7, [("Potatoes", 180), ("Cooking oil", 15)], "/images/french_fries.jpg"),
            ("Garlic Rice", "Sides", "Steamed rice tossed with garlic", 39.00, 4, [("Rice", 200), ("Cooking oil", 5), ("Garlic", 3)], "/images/garlic_rice.jpg"),
            ("Chicken Caesar Salad", "Salads", "Grilled chicken, romaine, parmesan and croutons", 169.00, 8, [("Chicken breast", 120), ("Romaine lettuce", 100), ("Parmesan cheese", 15)], "/images/chicken_caesar_salad.jpg"),
            ("Margherita Pizza", "Pizza", "Tomato, mozzarella and fresh basil", 299.00, 18, [("Pizza dough", 1), ("Tomato sauce", 80), ("Mozzarella cheese", 120)], "/images/margherita_pizza.jpg"),
            ("Sizzling Sisig", "Rice Meals", "Sizzling pork sisig topped with egg", 189.00, 12, [("Pork slices", 180), ("Cooking oil", 10), ("Garlic", 5)], "/images/sizzling_sisig.jpg"),
            ("Spaghetti Carbonara", "Pasta", "Creamy spaghetti with savory bits and parmesan", 169.00, 12, [("Pasta noodles", 150), ("Parmesan cheese", 15), ("Pork slices", 40), ("Cooking cream", 80)], "/images/spaghetti_carbonara.jpg"),
            ("Creamy Chicken Alfredo", "Pasta", "Fettuccine in cream sauce with grilled chicken", 189.00, 14, [("Pasta noodles", 150), ("Chicken breast", 120), ("Cooking cream", 100), ("Parmesan cheese", 20)], "/images/chicken_alfredo.jpg"),
            ("Ice Latte", "Drinks", "Chilled espresso with fresh milk", 99.00, 3, [("Espresso coffee", 18), ("Fresh milk", 200)], "/images/ice_latte.jpg"),
            ("Fresh Juice", "Drinks", "Freshly blended fruit juice", 79.00, 4, [("Fresh fruit", 250)], "/images/fresh_juice.jpg"),
            ("Chocolate Cake", "Desserts", "Rich chocolate cake with ganache", 119.00, 2, [("Chocolate cake slice", 1)], "/images/chocolate_cake.jpg"),
        ]
        for name, category_name, description, price, prep, recipe, image in products_seed:
            product = db.query(Product).filter_by(name=name).first()
            if product and not product.image_url:
                product.image_url = image
            if not product:
                category = db.query(Category).filter_by(name=category_name).one()
                product = Product(category_id=category.id, name=name, description=description, price=Decimal(str(price)), image_url=image, prep_time_minutes=prep, is_available=True)
                db.add(product); db.flush()
                for ingredient_name, quantity in recipe:
                    ingredient = db.query(Ingredient).filter_by(name=ingredient_name).one()
                    db.add(ProductIngredient(product_id=product.id, ingredient_id=ingredient.id, quantity_per_unit=Decimal(str(quantity))))
        for number, capacity, note in [("T01", 2, "Window"), ("T02", 2, "Window"), ("T03", 4, "Center"), ("T04", 4, "Center"), ("T05", 6, "Family"), ("T06", 6, "Family"), ("T07", 2, "Counter")]:
            if not db.query(DiningTable).filter_by(table_number=number).first():
                db.add(DiningTable(table_number=number, capacity=capacity, status="available", location_note=note))
        db.commit()
        print("Demo data is ready. Accounts:")
        for _, email, password, role in DEMO_USERS:
            print(f"  {role:7} {email} / {password}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
