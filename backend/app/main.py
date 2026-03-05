from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/health")
def health():
    return {"status": "OK"}

@app.route("/api/products")
def get_products():
    """Return a list of sample products for the catalog."""
    products = [
        {
            "id": 1,
            "name": "Organic Apples",
            "price": 4.99,
            "category": "Fruits",
            "image": "",
            "description": "Fresh, crispy organic apples from local farms"
        },
        {
            "id": 2,
            "name": "Fresh Spinach",
            "price": 3.49,
            "category": "Vegetables",
            "image": "",
            "description": "Nutrient-rich organic spinach leaves"
        },
        {
            "id": 3,
            "name": "Free-Range Eggs",
            "price": 5.99,
            "category": "Dairy",
            "image": "",
            "description": "Farm-fresh eggs from free-range chickens"
        },
        {
            "id": 4,
            "name": "Organic Bananas",
            "price": 2.99,
            "category": "Fruits",
            "image": "",
            "description": "Sweet and ripe organic bananas"
        },
        {
            "id": 5,
            "name": "Whole Milk",
            "price": 4.49,
            "category": "Dairy",
            "image": "",
            "description": "Creamy whole milk from grass-fed cows"
        },
        {
            "id": 6,
            "name": "Organic Carrots",
            "price": 2.79,
            "category": "Vegetables",
            "image": "",
            "description": "Crunchy organic carrots, perfect for snacking"
        },
        {
            "id": 7,
            "name": "Sourdough Bread",
            "price": 5.49,
            "category": "Bakery",
            "image": "",
            "description": "Artisan sourdough bread, freshly baked"
        },
        {
            "id": 8,
            "name": "Grass-Fed Beef",
            "price": 12.99,
            "category": "Meat",
            "image": "",
            "description": "Premium grass-fed beef, locally sourced"
        },
        {
            "id": 9,
            "name": "Orange Juice",
            "price": 4.99,
            "category": "Beverages",
            "image": "",
            "description": "Freshly squeezed organic orange juice"
        },
        {
            "id": 10,
            "name": "Organic Strawberries",
            "price": 6.49,
            "category": "Fruits",
            "image": "",
            "description": "Sweet organic strawberries, pesticide-free"
        },
        {
            "id": 11,
            "name": "Cheddar Cheese",
            "price": 7.99,
            "category": "Dairy",
            "image": "",
            "description": "Aged cheddar cheese from local dairy"
        },
        {
            "id": 12,
            "name": "Organic Broccoli",
            "price": 3.29,
            "category": "Vegetables",
            "image": "",
            "description": "Fresh organic broccoli florets"
        }
    ]
    return jsonify({"products": products})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)