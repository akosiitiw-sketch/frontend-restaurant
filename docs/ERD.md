# Project NOAH POS — ERD (logical relationships)

```mermaid
erDiagram
  roles ||--o{ users : assigns
  categories ||--o{ products : groups
  suppliers o|--o{ ingredients : supplies
  products ||--o{ product_ingredients : has_recipe
  ingredients ||--o{ product_ingredients : ingredient
  dining_tables o|--o{ restaurant_orders : seats
  users ||--o{ restaurant_orders : creates
  restaurant_orders ||--|{ order_items : contains
  products ||--o{ order_items : sold_as
  restaurant_orders ||--o{ payments : paid_by
  suppliers ||--o{ purchase_orders : receives_orders
  users ||--o{ purchase_orders : creates
  purchase_orders ||--|{ purchase_order_items : contains
  ingredients ||--o{ purchase_order_items : ordered_as
  ingredients ||--o{ inventory_movements : ledger
  restaurant_orders o|--o{ inventory_movements : consumes
  users o|--o{ inventory_movements : records
  shifts ||--o{ shift_assignments : contains
  users ||--o{ shift_assignments : assigned
  users o|--o{ audit_logs : performs
```

The ERD is logical; `product_ingredients` and `shift_assignments` are associative tables. `inventory_movements` is the stock ledger. Current ingredient stock is maintained through the ledger trigger so every incoming/outgoing change has a traceable reason and timestamp.
