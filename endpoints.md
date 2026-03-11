# OFS API Endpoints

Base URL: `http://localhost:5000`

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

**Response:**
```json
{"status": "OK"}
```

---

## Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all active products |
| POST | `/api/products` | Create a new product |

### GET /api/products

Returns all active products from the database.

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Bananas Bunch",
      "price": 1.99,
      "weight": 2.5,
      "category": "Fresh Produce",
      "active": 1,
      "image": "",
      "description": ""
    }
  ]
}
```

### POST /api/products

Creates a new product and initializes its inventory entry.

**Request Body:**
```json
{
  "name": "Organic Kale",
  "price": 3.49,
  "weight": 0.75,
  "category_id": 1,
  "quantity": 50
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Product name |
| price | number | Yes | Price in dollars |
| weight | number | Yes | Weight in pounds |
| category_id | int | Yes | FK to ProductCategory (1=Fresh Produce, 2=Deli Meats, 3=Dairy) |
| quantity | int | No | Initial inventory quantity (default 0) |

**Response (201):**
```json
{
  "product": {
    "id": 11,
    "name": "Organic Kale",
    "price": 3.49,
    "weight": 0.75,
    "category": "Fresh Produce"
  }
}
```

**Errors:**
- `400` — Missing required fields or invalid category_id

---

## Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | Get all inventory items |
| PUT | `/api/inventory/<product_id>` | Update stock quantity for a product |

### GET /api/inventory

Returns inventory joined with product and category info.

**Response:**
```json
{
  "inventory": [
    {
      "id": 1,
      "name": "Bananas Bunch",
      "category": "Fresh Produce",
      "price": 1.99,
      "quantity": 120,
      "reserved": 4,
      "lowStockThreshold": 20
    }
  ]
}
```

### PUT /api/inventory/:product_id

Updates the quantity in stock for a given product.

**Request Body:**
```json
{
  "quantity": 150
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| quantity | int | Yes | New stock quantity (must be >= 0) |

**Response (200):**
```json
{
  "item": {
    "id": 1,
    "name": "Bananas Bunch",
    "category": "Fresh Produce",
    "price": 1.99,
    "quantity": 150,
    "reserved": 4,
    "lowStockThreshold": 20
  }
}
```

**Errors:**
- `400` — Missing quantity or quantity is negative
- `404` — Product not found in inventory

---

## Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart/<customer_id>` | Get a customer's active cart |
| POST | `/api/cart/<customer_id>` | Add a product to the cart |

### GET /api/cart/:customer_id

Returns all items in the customer's active (INPROGRESS) order.

**Response:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "order_id": 3,
      "product_id": 1,
      "name": "Bananas Bunch",
      "price": 1.99,
      "category": "Fresh Produce",
      "quantity": 2,
      "price_at_checkout": 1.99
    }
  ]
}
```

### POST /api/cart/:customer_id

Adds a product to the customer's cart. Creates a new INPROGRESS order if one doesn't exist. If the product is already in the cart, the quantity is incremented.

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product_id | int | Yes | ID of the product to add |
| quantity | int | No | Number of units to add (default 1, must be >= 1) |

**Response (201):**
```json
{
  "order_id": 3,
  "product_id": 1,
  "quantity": 2
}
```

**Errors:**
- `400` — Missing product_id or invalid quantity
- `404` — Customer not found or product not found/inactive
