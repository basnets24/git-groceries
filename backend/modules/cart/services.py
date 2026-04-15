from typing import Dict, List

from . import repository


class CartServiceError(Exception):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


def get_cart(customer_id: int) -> List[Dict]:
    items = repository.fetch_active_cart_items(customer_id)
    for item in items:
        item["price"] = float(item["price"])
        item["price_at_checkout"] = float(item["price_at_checkout"])
        item["weight_at_checkout"] = float(item.get("weight_at_checkout", 0))
    return items


def add_to_cart(customer_id: int, product_id: int, quantity: int) -> Dict:
    if not repository.customer_exists(customer_id):
        raise CartServiceError("Customer not found", 404)

    product = repository.fetch_active_product(product_id)
    if product is None:
        raise CartServiceError("Product not found or inactive", 404)

    order = repository.fetch_inprogress_order(customer_id)
    if order is None:
        if quantity <= 0:
            # Can't add non-positive quantity to non-existent order
            raise CartServiceError("Cannot remove item from empty order", 400)
        order_id = repository.create_inprogress_order(customer_id)
    else:
        order_id = order["ShoppingOrderID"]

    existing_item = repository.fetch_order_item(order_id, product_id)
    if existing_item:
        new_quantity = existing_item["Quantity"] + quantity
        
        # If quantity becomes 0 or negative, remove the item
        if new_quantity <= 0:
            repository.delete_order_item(order_id, product_id)
        else:
            repository.update_order_item_quantity(order_id, product_id, new_quantity)
    else:
        # Only insert if quantity is positive
        if quantity > 0:
            repository.insert_order_item(
                order_id=order_id,
                product_id=product_id,
                quantity=quantity,
                price_at_checkout=product["Price"],
                weight_at_checkout=product["WeightLbs"],
            )
        else:
            raise CartServiceError("Cannot add non-positive quantity to non-existent item", 400)

    return {"order_id": order_id, "product_id": product_id, "quantity_delta": quantity}
