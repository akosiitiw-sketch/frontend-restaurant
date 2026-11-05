-- Project NOAH #8: Restaurant POS & Kitchen Management
-- MySQL 8.0+ | 3NF-oriented relational schema

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(90) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  contact_person VARCHAR(120) NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  address VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_suppliers_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ingredients (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id BIGINT UNSIGNED NULL,
  name VARCHAR(140) NOT NULL UNIQUE,
  unit VARCHAR(24) NOT NULL,
  stock_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ingredients_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_ingredients_stock (stock_qty, reorder_level)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(140) NOT NULL,
  description VARCHAR(500) NULL,
  price DECIMAL(12,2) NOT NULL,
  image_url VARCHAR(500) NULL,
  prep_time_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_products_name (name),
  INDEX idx_products_category (category_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_ingredients (
  product_id BIGINT UNSIGNED NOT NULL,
  ingredient_id BIGINT UNSIGNED NOT NULL,
  quantity_per_unit DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (product_id, ingredient_id),
  CONSTRAINT fk_recipe_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  CHECK (quantity_per_unit > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dining_tables (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(20) NOT NULL UNIQUE,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 2,
  status VARCHAR(24) NOT NULL DEFAULT 'available',
  location_note VARCHAR(120) NULL,
  CHECK (status IN ('available','occupied','reserved','cleaning'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shifts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  notes VARCHAR(255) NULL,
  CHECK (ends_at > starts_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shift_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shift_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shift_user (shift_id, user_id),
  CONSTRAINT fk_assignment_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS restaurant_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  table_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES dining_tables(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_orders_created_status (created_at, status),
  CHECK (status IN ('pending','preparing','ready','served','completed','cancelled'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  kitchen_status VARCHAR(24) NOT NULL DEFAULT 'queued',
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order_items_kitchen (kitchen_status, created_at),
  CHECK (quantity > 0),
  CHECK (kitchen_status IN ('queued','preparing','ready','served','cancelled'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(24) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'paid',
  transaction_ref VARCHAR(120) NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  INDEX idx_payments_paid (paid_at, status),
  CHECK (method IN ('cash','gcash','card','other')),
  CHECK (status IN ('pending','paid','failed','refunded'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expected_date DATE NULL,
  received_at DATETIME NULL,
  notes VARCHAR(255) NULL,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_po_user FOREIGN KEY (created_by) REFERENCES users(id),
  CHECK (status IN ('draft','ordered','received','cancelled'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  ingredient_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_poi_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_poi_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  UNIQUE KEY uq_po_ingredient (purchase_order_id, ingredient_id),
  CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ingredient_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  movement_type VARCHAR(12) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  reference_order_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movements_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  CONSTRAINT fk_movements_order FOREIGN KEY (reference_order_id) REFERENCES restaurant_orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_movements_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_movements_ingredient_date (ingredient_id, created_at),
  CHECK (movement_type IN ('IN','OUT','ADJUST'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- Reporting views (JOINs + aggregate functions).
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT DATE(o.created_at) AS sales_date,
       COUNT(DISTINCT o.id) AS order_count,
       COALESCE(SUM(o.total), 0) AS gross_sales,
       COALESCE(AVG(o.total), 0) AS average_order_value
FROM restaurant_orders o
WHERE o.status IN ('served','completed')
GROUP BY DATE(o.created_at);

CREATE OR REPLACE VIEW v_low_stock_ingredients AS
SELECT i.id, i.name, i.unit, i.stock_qty, i.reorder_level,
       s.name AS supplier_name, i.unit_cost
FROM ingredients i
LEFT JOIN suppliers s ON s.id = i.supplier_id
WHERE i.is_active = TRUE AND i.stock_qty <= i.reorder_level;

CREATE OR REPLACE VIEW v_product_sales AS
SELECT p.id AS product_id, p.name AS product_name, c.name AS category_name,
       COALESCE(SUM(CASE WHEN o.status IN ('served','completed') THEN oi.quantity ELSE 0 END), 0) AS units_sold,
       COALESCE(SUM(CASE WHEN o.status IN ('served','completed') THEN oi.line_total ELSE 0 END), 0) AS revenue
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN restaurant_orders o ON o.id = oi.order_id
GROUP BY p.id, p.name, c.name;

DROP PROCEDURE IF EXISTS sp_complete_order;
DROP PROCEDURE IF EXISTS sp_restock_ingredient;
DROP PROCEDURE IF EXISTS sp_low_stock_ingredients;
DROP TRIGGER IF EXISTS trg_inventory_movement_balance;
DROP TRIGGER IF EXISTS trg_order_item_consumes_ingredients;

DELIMITER $$
CREATE PROCEDURE sp_complete_order(IN p_order_id BIGINT UNSIGNED)
BEGIN
  UPDATE restaurant_orders
  SET status = 'completed', completed_at = NOW(), updated_at = NOW()
  WHERE id = p_order_id AND status IN ('served','ready');
  SELECT ROW_COUNT() AS rows_updated;
END$$

CREATE PROCEDURE sp_restock_ingredient(
  IN p_ingredient_id BIGINT UNSIGNED,
  IN p_quantity DECIMAL(12,3),
  IN p_user_id BIGINT UNSIGNED
)
BEGIN
  IF p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Restock quantity must be greater than zero';
  END IF;
  INSERT INTO inventory_movements (ingredient_id, quantity, movement_type, reason, created_by)
  VALUES (p_ingredient_id, p_quantity, 'IN', 'Restocked by stored procedure', p_user_id);
  SELECT id, name, stock_qty, unit FROM ingredients WHERE id = p_ingredient_id;
END$$

CREATE PROCEDURE sp_low_stock_ingredients()
BEGIN
  SELECT id, name, unit, stock_qty, reorder_level, supplier_name
  FROM v_low_stock_ingredients
  ORDER BY (reorder_level - stock_qty) DESC, name;
END$$

CREATE TRIGGER trg_inventory_movement_balance
AFTER INSERT ON inventory_movements
FOR EACH ROW
BEGIN
  IF NEW.movement_type = 'IN' THEN
    UPDATE ingredients SET stock_qty = stock_qty + NEW.quantity WHERE id = NEW.ingredient_id;
  ELSEIF NEW.movement_type = 'OUT' THEN
    UPDATE ingredients SET stock_qty = stock_qty - NEW.quantity WHERE id = NEW.ingredient_id;
  ELSEIF NEW.movement_type = 'ADJUST' THEN
    UPDATE ingredients SET stock_qty = stock_qty + NEW.quantity WHERE id = NEW.ingredient_id;
  END IF;
END$$

CREATE TRIGGER trg_order_item_consumes_ingredients
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  INSERT INTO inventory_movements
    (ingredient_id, quantity, movement_type, reason, reference_order_id, created_by)
  SELECT pi.ingredient_id,
         pi.quantity_per_unit * NEW.quantity,
         'OUT',
         CONCAT('Recipe consumption for order item #', NEW.id),
         NEW.order_id,
         (SELECT ro.created_by FROM restaurant_orders ro WHERE ro.id = NEW.order_id)
  FROM product_ingredients pi
  WHERE pi.product_id = NEW.product_id;
END$$
DELIMITER ;
