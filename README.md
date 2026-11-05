# Project NOAH #8 — Restaurant POS & Kitchen Management

A browser-based full-stack restaurant operations system built for the PROJECT NOAH requirements. The stack is **MySQL 8 + Python + FastAPI + React + Tailwind CSS**. The interface is desktop-first but responsive on small screens; it is a web app, not a native mobile app.

## What is included

- **POS / checkout:** product search, category filters, cart quantities, dine-in table or takeout, payment method selection (cash, GCash, card, other), VAT calculation, order receipt reference, and database persistence.
- **Kitchen display:** active kitchen tickets, order/item statuses (queued → preparing → ready → served), timestamps, table number, and special notes.
- **Menu management:** categories, products, prices, preparation times, availability, and per-product ingredient recipes.
- **Inventory:** normalized ingredient list, supplier association, opening stock, stock-in/out movements, reorder levels, current stock valuation, and low-stock list.
- **Predictive purchasing:** database-driven 28-day moving-average usage forecast, 7-day projected demand, 15% safety buffer, suggested buy quantity, and estimated purchase cost. No paid AI key is required. It is an explainable baseline forecasting model, not a guarantee of future demand.
- **Purchasing:** suppliers, purchase orders, receiving goods, and inventory updates on receipt.
- **Tables / team:** table status and capacity; user accounts with Admin, Manager, Cashier, and Kitchen roles; shift and shift-assignment tables and shift endpoints.
- **Reporting:** overview KPIs, daily sales chart, top products, sales and product-sales API reports, audit log, Swagger API docs.
- **Security basics:** JWT bearer tokens, bcrypt password hashing, role-based route authorization, Pydantic validation, parameterized SQL via SQLAlchemy, CORS configuration, audit logs, and password secrets loaded from environment variables.

## Quick start with Docker (recommended)

Requirements: Docker Desktop (or Docker Engine) with Docker Compose.

1. Copy `.env.example` to `.env` in the project root.
2. Open `.env` and change `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `JWT_SECRET`. Use URL-safe characters for the database password because it is inserted into `DATABASE_URL`.
3. From the project root, run:

   ```bash
   docker compose up --build
   ```

4. Open the app at **http://localhost:8080**.
5. Open interactive API documentation at **http://localhost:8000/docs**. API health check: **http://localhost:8000/health**.

Docker starts MySQL, applies `backend/sql/schema.sql` on a fresh database volume (tables, views, procedures, and triggers), waits for MySQL, seeds demo roles/menu/ingredients/tables, and launches the FastAPI and web containers.

### Demo sign-in accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@noahpos.local` | `Admin123!` |
| Manager | `manager@noahpos.local` | `Manager123!` |
| Cashier | `cashier@noahpos.local` | `Cashier123!` |
| Kitchen | `kitchen@noahpos.local` | `Kitchen123!` |

The seed step is idempotent: it adds the demo data when it is missing and does not reset existing passwords or delete user records. **Change the demo passwords and secret values before using this system outside a classroom/demo environment.**

## Run services without Docker

### 1. MySQL

Install MySQL 8.0.16+ and create an empty database/user, then import the schema. Example using a local terminal:

```sql
CREATE DATABASE restaurant_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'your_local_password';
GRANT ALL PRIVILEGES ON restaurant_pos.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
```

Import `backend/sql/schema.sql` into the `restaurant_pos` database using MySQL Workbench or the MySQL CLI. The SQL includes triggers and stored procedures, so use a client that supports MySQL's `DELIMITER` directive when importing.

### 2. FastAPI

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and change `DATABASE_URL` to your local MySQL host/user/password, e.g. `mysql+pymysql://pos_user:your_local_password@127.0.0.1:3306/restaurant_pos?charset=utf8mb4`. Set `JWT_SECRET` to a long random value. Then run:

```bash
python -m app.wait_for_db
python -m app.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. React + Tailwind CSS

```bash
cd frontend
npm install
# Copy .env.example to .env if you need to change VITE_API_URL.
npm run dev
```

Open **http://localhost:5173**. Ensure `CORS_ORIGINS` in the backend includes this frontend origin. `VITE_API_URL` is a build-time setting; for production builds, point it at the deployed API URL.

## Database design

The schema uses 17 interrelated tables: `roles`, `users`, `categories`, `suppliers`, `ingredients`, `products`, `product_ingredients`, `dining_tables`, `shifts`, `shift_assignments`, `restaurant_orders`, `order_items`, `payments`, `purchase_orders`, `purchase_order_items`, `inventory_movements`, and `audit_logs`.

- Composite primary key on `product_ingredients` prevents duplicate ingredient rows per recipe.
- `purchase_order_items` has a unique `(purchase_order_id, ingredient_id)` pair.
- Foreign keys enforce referential integrity; order history is preserved by archiving products instead of deleting products referenced by prior order lines.
- Product recipes map menu-item sales to ingredient usage.
- Stock balances are updated by the `trg_inventory_movement_balance` trigger when ledger movements are inserted. The `trg_order_item_consumes_ingredients` trigger writes ingredient OUT movements after order item insertion.
- The schema contains three views (`v_daily_sales`, `v_low_stock_ingredients`, `v_product_sales`), three procedures (`sp_complete_order`, `sp_restock_ingredient`, `sp_low_stock_ingredients`), and two triggers. Reports include joins, aggregation, grouping, and date-based subqueries/filters.

**Important:** the inventory trigger definitions must exist for order checkout and inventory movement posting to update stock levels. The normal Docker installation creates them automatically. For a pre-existing MySQL schema, import the SQL and inspect your schema before starting the app.

## Main API routes

All protected routes use `Authorization: Bearer <token>` after `POST /api/auth/login`.

| Area | Main routes |
| --- | --- |
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Staff | `GET/POST /api/users`, `PATCH/DELETE /api/users/{id}`, `GET/POST/PATCH/DELETE /api/shifts`, `GET/POST/DELETE /api/shift-assignments` |
| Categories | `GET/POST/PATCH/DELETE /api/categories` |
| Menu | `GET/POST/PATCH/DELETE /api/products` |
| Ingredients | `GET/POST/PATCH/DELETE /api/ingredients`, `GET/POST /api/inventory/movements` |
| Forecast | `GET /api/inventory/forecast` |
| Suppliers / purchase orders | `GET/POST/PATCH/DELETE /api/suppliers`, `GET/POST/PATCH/DELETE /api/purchase-orders`, `POST /api/purchase-orders/{id}/receive` |
| Dining tables | `GET/POST/PATCH/DELETE /api/tables` |
| Orders / checkout | `GET/POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/status`, `DELETE /api/orders/{id}` |
| Kitchen | `GET /api/kitchen/tickets`, `PATCH /api/order-items/{id}/kitchen-status` |
| Reports | `GET /api/dashboard/summary`, `GET /api/reports/sales`, `GET /api/reports/product-sales`, `GET /api/audit-logs` |

Full API descriptions and schemas are available at `/docs` while the API is running.

## Business rules and limitations to know

- The checkout currently records payment as paid at the time the cashier confirms checkout. It stores a payment method and optional transaction reference; it does **not** connect to or verify a live GCash merchant API. A real payment gateway would require a provider account and server-side callback verification.
- The VAT rate defaults to 12% and is configurable through `TAX_RATE`. Confirm the correct tax/accounting treatment with the restaurant before real use.
- Recipe-linked ingredient stock is consumed as order lines are inserted. If a product has no recipe, it remains sellable but its ingredient usage cannot be forecast or consumed automatically.
- Inventory forecasts are estimates derived from the recorded 28-day history, recipe quantities, and a safety buffer. New items with no sales history are labelled low confidence.
- This is a class-project foundation, not a certified fiscal POS. Before production use, add automated backup/restore, HTTPS and secure deployment secrets, access/refresh token policies, formal migrations, more extensive automated tests, receipt printer integration, real gateway integration, and finance/legal review.

## Reset demo database

To remove all local Docker database data **(destructive)**, run:

```bash
docker compose down -v
```

Then `docker compose up --build` again. Do not run this command if you need to keep your database.
