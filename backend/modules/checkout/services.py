from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List

from db import get_db_connection
from exceptions import NotFoundError, ValidationError
from modules.cart import services as cart_services
from modules.cart.repository import fetch_inprogress_order


def _format_decimal(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _build_order_summary(items: List[Dict]) -> Dict:
    subtotal = Decimal("0.00")
    total_weight = Decimal("0.00")

    for item in items:
        item_price = Decimal(str(item["price_at_checkout"]))
        item_weight = Decimal(str(item.get("weight_at_checkout", 0)))
        quantity = int(item["quantity"])

        subtotal += item_price * quantity
        total_weight += item_weight * quantity

    delivery_charge = Decimal("0.00")
    if total_weight >= Decimal("20.00"):
        delivery_charge = Decimal("10.00")

    total_amount = subtotal + delivery_charge

    return {
        "items": items,
        "subtotal": _format_decimal(subtotal),
        "total_weight": _format_decimal(total_weight),
        "delivery_charge": _format_decimal(delivery_charge),
        "total_amount": _format_decimal(total_amount),
    }


def create_checkout_session(customer_id: int) -> Dict:
    items = cart_services.get_cart(customer_id)
    if not items:
        raise ValidationError("Cart is empty")

    order = fetch_inprogress_order(customer_id)
    if order is None:
        raise NotFoundError("No active order found for customer")

    summary = _build_order_summary(items)
    from modules.payment import services as payment_services

    payment_intent = payment_services.get_or_create_payment_intent(
        order_id=order["ShoppingOrderID"],
        amount=Decimal(str(summary["total_amount"])),
    )

    return {
        "order_id": order["ShoppingOrderID"],
        "checkout": summary,
        "payment_intent": payment_intent,
    }


def complete_order(order_id: int, customer_id: int) -> None:
    """Finalize an order and persist payment/inventory side-effects."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT Status
            FROM ShoppingOrder
            WHERE ShoppingOrderID = %s AND UserID = %s
            FOR UPDATE
            """,
            (order_id, customer_id),
        )
        row = cursor.fetchone()
        if row is None:
            raise NotFoundError("Order not found")

        if row[0] == "COMPLETED":
            conn.commit()
            return

        if row[0] != "INPROGRESS":
            raise ValidationError("Order is not in progress")

        cursor.execute(
            """
            SELECT PaymentID
            FROM Payment
            WHERE ShoppingOrderID = %s AND Status = 'SUCCESS'
            LIMIT 1
            """,
            (order_id,),
        )
        payment = cursor.fetchone()
        if payment is None:
            from modules.payment import services as payment_services
            if not payment_services.sync_payment_from_stripe(order_id):
                raise ValidationError("Payment has not been confirmed yet")

        cursor.execute(
            """
            UPDATE Inventory i
            JOIN ShoppingOrderItem soi ON soi.ProductID = i.ProductID
            SET i.QuantityInStock = GREATEST(i.QuantityInStock - soi.Quantity, 0),
                i.ReservedQty = GREATEST(i.ReservedQty - soi.Quantity, 0)
            WHERE soi.ShoppingOrderID = %s
            """,
            (order_id,),
        )

        cursor.execute(
            """
            UPDATE ShoppingOrder
            SET Status = 'COMPLETED',
                ReadyForDispatchAt = CURRENT_TIMESTAMP
            WHERE ShoppingOrderID = %s
            """,
            (order_id,),
        )

        conn.commit()
    finally:
        cursor.close()
        conn.close()
