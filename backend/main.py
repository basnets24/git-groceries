from flask import Flask, jsonify, request
from flask_cors import CORS

from routes.auth import auth_bp

app = Flask(__name__)
CORS(app)

LOW_STOCK_THRESHOLD = 20

@app.route("/api/health")
def health():
    return {"status": "OK"}

app.register_blueprint(auth_bp)

@app.route("/api/products")
def get_products():
    """Return all active products from the database."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT p.ProductID    AS id,
               p.Name         AS name,
               p.Price        AS price,
               p.WeightLbs    AS weight,
               pc.Name        AS category,
               p.IsActive     AS active
        FROM Product p
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE p.IsActive = TRUE
        ORDER BY p.ProductID
        """
    )
    products = cursor.fetchall()
    for p in products:
        p["price"] = float(p["price"])
        p["weight"] = float(p["weight"])
        p["image"] = ""
        p["description"] = ""
    cursor.close()
    conn.close()
    return jsonify({"products": products})


@app.route("/api/inventory")
def get_inventory():
    """Return inventory joined with product info."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT p.ProductID        AS id,
               p.Name             AS name,
               pc.Name            AS category,
               p.Price            AS price,
               i.QuantityInStock  AS quantity,
               i.ReservedQty     AS reserved
        FROM Inventory i
        JOIN Product p  ON i.ProductID = p.ProductID
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        ORDER BY p.ProductID
        """
    )
    inventory = cursor.fetchall()
    for item in inventory:
        item["price"] = float(item["price"])
        item["lowStockThreshold"] = LOW_STOCK_THRESHOLD
    cursor.close()
    conn.close()
    return jsonify({"inventory": inventory})


@app.route("/api/inventory/<int:product_id>", methods=["PUT"])
def update_inventory(product_id):
    """Update the quantity in stock for a product."""
    data = request.get_json()
    if data is None or "quantity" not in data:
        return jsonify({"error": "Missing 'quantity' in request body"}), 400

    quantity = data["quantity"]
    if not isinstance(quantity, int) or quantity < 0:
        return jsonify({"error": "Quantity must be a non-negative integer"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT ProductID FROM Inventory WHERE ProductID = %s", (product_id,)
    )
    if cursor.fetchone() is None:
        cursor.close()
        conn.close()
        return jsonify({"error": "Product not found in inventory"}), 404

    cursor.execute(
        "UPDATE Inventory SET QuantityInStock = %s WHERE ProductID = %s",
        (quantity, product_id),
    )
    conn.commit()

    cursor.execute(
        """
        SELECT p.ProductID        AS id,
               p.Name             AS name,
               pc.Name            AS category,
               p.Price            AS price,
               i.QuantityInStock  AS quantity,
               i.ReservedQty     AS reserved
        FROM Inventory i
        JOIN Product p  ON i.ProductID = p.ProductID
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE i.ProductID = %s
        """,
        (product_id,),
    )
    updated = cursor.fetchone()
    updated["price"] = float(updated["price"])
    updated["lowStockThreshold"] = LOW_STOCK_THRESHOLD

    cursor.close()
    conn.close()
    return jsonify({"item": updated})


@app.route("/api/products", methods=["POST"])
def create_product():
    """Add a new product to the catalog and initialize its inventory."""
    data = request.get_json()
    required = ["name", "price", "weight", "category_id"]
    if data is None or not all(k in data for k in required):
        return jsonify({"error": f"Missing required fields: {required}"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT ProductCategoryID FROM ProductCategory WHERE ProductCategoryID = %s",
        (data["category_id"],),
    )
    if cursor.fetchone() is None:
        cursor.close()
        conn.close()
        return jsonify({"error": "Invalid category_id"}), 400

    cursor.execute(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive)
        VALUES (%s, %s, %s, %s, TRUE)
        """,
        (data["name"], data["price"], data["weight"], data["category_id"]),
    )
    product_id = cursor.lastrowid

    initial_qty = data.get("quantity", 0)
    cursor.execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, %s, 0)",
        (product_id, initial_qty),
    )
    conn.commit()

    cursor.execute(
        """
        SELECT p.ProductID AS id, p.Name AS name, p.Price AS price,
               p.WeightLbs AS weight, pc.Name AS category
        FROM Product p
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE p.ProductID = %s
        """,
        (product_id,),
    )
    product = cursor.fetchone()
    product["price"] = float(product["price"])
    product["weight"] = float(product["weight"])

    cursor.close()
    conn.close()
    return jsonify({"product": product}), 201


@app.route("/api/cart/<int:customer_id>")
def get_cart(customer_id):
    """Get the active cart (INPROGRESS order) for a customer."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT so.ShoppingOrderID AS order_id,
               soi.ProductID      AS product_id,
               p.Name             AS name,
               p.Price            AS price,
               pc.Name            AS category,
               soi.Quantity       AS quantity,
               soi.PriceAtCheckout AS price_at_checkout
        FROM ShoppingOrder so
        JOIN ShoppingOrderItem soi ON so.ShoppingOrderID = soi.ShoppingOrderID
        JOIN Product p ON soi.ProductID = p.ProductID
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE so.CustomerID = %s AND so.Status = 'INPROGRESS'
        ORDER BY soi.ProductID
        """,
        (customer_id,),
    )
    items = cursor.fetchall()
    for item in items:
        item["price"] = float(item["price"])
        item["price_at_checkout"] = float(item["price_at_checkout"])

    cursor.close()
    conn.close()
    return jsonify({"customer_id": customer_id, "items": items})


@app.route("/api/cart/<int:customer_id>", methods=["POST"])
def add_to_cart(customer_id):
    """Add a product to the customer's cart. Creates an order if none exists."""
    data = request.get_json()
    if data is None or "product_id" not in data:
        return jsonify({"error": "Missing 'product_id' in request body"}), 400

    product_id = data["product_id"]
    quantity = data.get("quantity", 1)

    if not isinstance(quantity, int) or quantity < 1:
        return jsonify({"error": "Quantity must be a positive integer"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # Verify customer exists
    cursor.execute(
        "SELECT CustomerID FROM Customer WHERE CustomerID = %s", (customer_id,)
    )
    if cursor.fetchone() is None:
        cursor.close()
        conn.close()
        return jsonify({"error": "Customer not found"}), 404

    # Verify product exists and get its price/weight
    cursor.execute(
        "SELECT ProductID, Price, WeightLbs FROM Product WHERE ProductID = %s AND IsActive = TRUE",
        (product_id,),
    )
    product = cursor.fetchone()
    if product is None:
        cursor.close()
        conn.close()
        return jsonify({"error": "Product not found or inactive"}), 404

    # Find or create an INPROGRESS order for this customer
    cursor.execute(
        """
        SELECT ShoppingOrderID FROM ShoppingOrder
        WHERE CustomerID = %s AND Status = 'INPROGRESS'
        LIMIT 1
        """,
        (customer_id,),
    )
    order = cursor.fetchone()

    if order is None:
        cursor.execute(
            """
            INSERT INTO ShoppingOrder (CustomerID, Street, City, State, Zip, Status)
            VALUES (%s, '', '', '', '', 'INPROGRESS')
            """,
            (customer_id,),
        )
        order_id = cursor.lastrowid
    else:
        order_id = order["ShoppingOrderID"]

    # Check if product already in cart — update quantity if so
    cursor.execute(
        """
        SELECT Quantity FROM ShoppingOrderItem
        WHERE ShoppingOrderID = %s AND ProductID = %s
        """,
        (order_id, product_id),
    )
    existing = cursor.fetchone()

    if existing:
        new_qty = existing["Quantity"] + quantity
        cursor.execute(
            """
            UPDATE ShoppingOrderItem SET Quantity = %s
            WHERE ShoppingOrderID = %s AND ProductID = %s
            """,
            (new_qty, order_id, product_id),
        )
    else:
        cursor.execute(
            """
            INSERT INTO ShoppingOrderItem
                (ShoppingOrderID, ProductID, Quantity, PriceAtCheckout, WeightAtCheckout)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (order_id, product_id, quantity, product["Price"], product["WeightLbs"]),
        )

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify(
        {"order_id": order_id, "product_id": product_id, "quantity": quantity}
    ), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
