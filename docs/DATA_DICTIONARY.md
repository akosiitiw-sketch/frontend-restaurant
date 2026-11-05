# Project NOAH POS — Data Dictionary & SQL Evidence

## Tables and roles

| Table | Purpose | Important keys / fields |
|---|---|---|
| `roles` | Access roles | `id` PK, unique `name` |
| `users` | Staff accounts | `role_id` FK, unique `email`, `password_hash`, `is_active` |
| `categories` | Product categories | unique `name`, `is_active` |
| `suppliers` | Ingredient vendors | name, contacts, address, active flag |
| `ingredients` | Stock items | `supplier_id` FK, current `stock_qty`, `unit`, `reorder_level`, `unit_cost` |
| `products` | Sellable menu items | `category_id` FK, `price`, prep time, availability |
| `product_ingredients` | Bill of materials / recipe | composite PK (`product_id`, `ingredient_id`), `quantity_per_unit` |
| `dining_tables` | Restaurant floor tables | unique `table_number`, capacity, status |
| `shifts` | Staff shifts | title, start and end datetime |
| `shift_assignments` | Staff/shift bridge | `shift_id` FK, `user_id` FK, unique shift/user pair |
| `restaurant_orders` | POS sales header | unique order number, table/user FKs, status, subtotal, tax, total |
| `order_items` | Line-item detail | order/product FKs, quantity, unit price, line total, kitchen status |
| `payments` | Payment records | order FK, amount, method, status, transaction reference |
| `purchase_orders` | Supplier purchase header | supplier/user FKs, status, total cost, expected/received dates |
| `purchase_order_items` | Ingredients ordered | purchase-order/ingredient FKs, quantity, unit cost, line total |
| `inventory_movements` | Inventory ledger | ingredient FK, IN/OUT/ADJUST, quantity, reason, related order/user |
| `audit_logs` | Sensitive-action log | optional user FK, action, entity, JSON details, timestamp |

## Advanced SQL objects

### Views
- `v_daily_sales`: daily order count, gross sales, and average order value for served/completed orders.
- `v_low_stock_ingredients`: active ingredients at or below reorder point, including supplier information.
- `v_product_sales`: product/category sales aggregate, joined across products, categories, order items, and orders.

### Stored procedures
- `sp_complete_order(p_order_id)`: completes an order currently ready/served and returns the affected-row count.
- `sp_restock_ingredient(p_ingredient_id, p_quantity, p_user_id)`: validates positive quantity and inserts an IN ledger movement.
- `sp_low_stock_ingredients()`: returns the current low-stock list sorted by need.

### Triggers
- `trg_inventory_movement_balance`: updates the ingredient balance after an IN, OUT, or signed ADJUST movement is inserted.
- `trg_order_item_consumes_ingredients`: writes OUT ledger movements for recipe ingredients after each order item is inserted.

### Example multi-table query

```sql
SELECT c.name AS category,
       p.name AS product,
       SUM(oi.quantity) AS units_sold,
       SUM(oi.line_total) AS revenue
FROM categories AS c
JOIN products AS p ON p.category_id = c.id
JOIN order_items AS oi ON oi.product_id = p.id
JOIN restaurant_orders AS o ON o.id = oi.order_id
WHERE o.status IN ('served', 'completed')
  AND o.created_at >= CURRENT_DATE - INTERVAL 30 DAY
GROUP BY c.id, c.name, p.id, p.name
HAVING SUM(oi.quantity) > 0
ORDER BY revenue DESC;
```

### Example subquery for top sellers

```sql
SELECT p.name, sales.units_sold
FROM products AS p
JOIN (
  SELECT oi.product_id, SUM(oi.quantity) AS units_sold
  FROM order_items AS oi
  JOIN restaurant_orders AS o ON o.id = oi.order_id
  WHERE o.status IN ('served', 'completed')
  GROUP BY oi.product_id
) AS sales ON sales.product_id = p.id
ORDER BY sales.units_sold DESC
LIMIT 5;
```
