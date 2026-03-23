from flask import Flask
from flask_cors import CORS

from modules.auth.routes import auth_bp
from modules.cart.routes import cart_bp
from modules.customer.routes import customer_bp
from modules.inventory.routes import inventory_bp
from modules.products.routes import products_bp

app = Flask(__name__)
CORS(app)

@app.route("/api/health")
def health():
    return {"status": "OK"}

app.register_blueprint(auth_bp)
app.register_blueprint(customer_bp)
app.register_blueprint(products_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(cart_bp)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
