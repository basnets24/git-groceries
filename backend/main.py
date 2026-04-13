from flask import Flask
from flask_cors import CORS

from exceptions import register_error_handlers
from modules.auth.routes import auth_bp
from modules.cart.routes import cart_bp
from modules.checkout import checkout_bp
from modules.customer.routes import customer_bp
from modules.inventory.routes import inventory_bp
from modules.delivery import delivery_bp
from modules.orders.routes import orders_bp
from modules.payment import payment_bp
from modules.products.routes import products_bp

app = Flask(__name__)
CORS(app)
register_error_handlers(app)

@app.route("/api/health")
def health():
    return {"status": "OK"}

app.register_blueprint(auth_bp)
app.register_blueprint(customer_bp)
app.register_blueprint(products_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(cart_bp)
app.register_blueprint(checkout_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(delivery_bp)
app.register_blueprint(orders_bp)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
