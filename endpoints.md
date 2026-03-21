# OFS API Endpoints

Base URL: `http://localhost:5001`

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

---

## Customer Profiles & Addresses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/{userId}/profile` | Fetch a customer's profile, addresses, and preferences |
| POST | `/api/customers/{userId}/profile` | Create or update substitution notes/default address |
| POST | `/api/customers/{userId}/addresses` | Add a new delivery address |
| PUT | `/api/customers/{userId}/addresses/{addressId}` | Update an existing address |
| PUT | `/api/customers/{userId}/default-address` | Set the default delivery address |
| DELETE | `/api/customers/{userId}/addresses/{addressId}` | Remove a saved address |

### Auth
All customer profile endpoints require a valid JWT via `Authorization: Bearer <token>`. Users may only access their own `{userId}` resources.

### GET /api/customers/{userId}/profile

Returns the customer's profile plus saved addresses and preferences.

**Response:**
```json
{
  "profile": {
    "userId": 1,
    "defaultAddressId": 5,
    "substitutionPreference": "No substitutions",
    "notes": "Preferred organic",
    "createdAt": "2026-03-20T12:00:00Z",
    "updatedAt": "2026-03-20T12:00:00Z"
  },
  "addresses": [
    {
      "id": 5,
      "label": "Home",
      "streetLine1": "123 Maple St",
      "city": "San Jose",
      "state": "CA",
      "postalCode": "95112",
      "deliveryInstructions": "Leave at porch",
      "isDefault": true
    }
  ],
  "preferences": [
    {
      "id": 7,
      "type": "DIET",
      "value": "VEGAN",
      "source": "USER"
    }
  ]
}
```

### POST /api/customers/{userId}/profile

Updates profile fields. All fields optional; omitting a field leaves it unchanged.

**Request Body:**
```json
{
  "substitutionPreference": "Allow close substitutes",
  "notes": "Allergic to peanuts",
  "defaultAddressId": 5
}
```

**Response (201):**
```json
{
  "profile": {
    "userId": 1,
    "defaultAddressId": 5,
    "substitutionPreference": "Allow close substitutes",
    "notes": "Allergic to peanuts",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### POST /api/customers/{userId}/addresses

Creates a new address. First address or `isDefault=true` makes it the default.

**Request Body:**
```json
{
  "label": "Work",
  "streetLine1": "456 Willow Ave",
  "streetLine2": "Suite 5B",
  "city": "San Jose",
  "state": "CA",
  "postalCode": "95126",
  "deliveryInstructions": "Buzz 203",
  "isDefault": false
}
```

### PUT /api/customers/{userId}/addresses/{addressId}

Updates an existing address (same body shape as POST). Setting `isDefault=true` promotes it to default.

### PUT /api/customers/{userId}/default-address

**Request Body:**
```json
{
  "addressId": 5
}
```

Sets the specified address as default.

### DELETE /api/customers/{userId}/addresses/{addressId}

Deletes an address. If the address was default, another address becomes default (if available) or `defaultAddressId` becomes `null`.

**Errors (all endpoints):**
- `401` — Missing/invalid token
- `403` — Accessing another user's data
- `404` — Profile/address not found
