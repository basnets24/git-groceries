from typing import Dict, List

from exceptions import ConflictError, NotFoundError, ValidationError
from . import repository


def get_cart(customer_id: int) -> List[Dict]:
    repository.cancel_stale_inprogress_orders()
    items = repository.fetch_active_cart_items(customer_id)
    for item in items:
        item["price"] = float(item["price"])
        item["price_at_checkout"] = float(item["price_at_checkout"])
        item["weight_at_checkout"] = float(item.get("weight_at_checkout", 0))
    return items


def add_to_cart(customer_id: int, product_id: int, quantity: int) -> Dict:
    if not repository.customer_exists(customer_id):
        raise NotFoundError("Customer not found")

    product = repository.fetch_active_product(product_id)
    if product is None:
        raise NotFoundError("Product not found or inactive")

    order = repository.fetch_inprogress_order(customer_id)
    if order is None:
        if quantity <= 0:
            # Can't add non-positive quantity to non-existent order
            raise ValidationError("Cannot remove item from empty order")
        order_id = repository.create_inprogress_order(customer_id)
    else:
        order_id = order["ShoppingOrderID"]

    existing_item = repository.fetch_order_item(order_id, product_id)
    if existing_item:
        old_quantity = existing_item["Quantity"]
        new_quantity = existing_item["Quantity"] + quantity

        # If quantity becomes 0 or negative, remove the item
        if new_quantity <= 0:
            if old_quantity > 0:
                repository.release_reserved_inventory(product_id, old_quantity)
            repository.delete_order_item(order_id, product_id)
        else:
            quantity_delta = new_quantity - old_quantity
            if quantity_delta > 0:
                reserved = repository.try_reserve_inventory(product_id, quantity_delta)
                if not reserved:
                    raise ConflictError("Insufficient stock to reserve requested quantity")
                try:
                    repository.update_order_item_quantity(order_id, product_id, new_quantity)
                except Exception:
                    repository.release_reserved_inventory(product_id, quantity_delta)
                    raise
            elif quantity_delta < 0:
                repository.release_reserved_inventory(product_id, abs(quantity_delta))
                repository.update_order_item_quantity(order_id, product_id, new_quantity)
            else:
                repository.update_order_item_quantity(order_id, product_id, new_quantity)
    else:
        # Only insert if quantity is positive
        if quantity > 0:
            reserved = repository.try_reserve_inventory(product_id, quantity)
            if not reserved:
                raise ConflictError("Insufficient stock to reserve requested quantity")
            try:
                repository.insert_order_item(
                    order_id=order_id,
                    product_id=product_id,
                    quantity=quantity,
                    price_at_checkout=product["Price"],
                    weight_at_checkout=product["WeightLbs"],
                )
            except Exception:
                repository.release_reserved_inventory(product_id, quantity)
                raise
        else:
            raise ValidationError("Cannot add non-positive quantity to non-existent item")

    return {"order_id": order_id, "product_id": product_id, "quantity_delta": quantity}
