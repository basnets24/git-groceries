from typing import Dict, List, Optional

from db import get_db_connection


def fetch_active_cart_items(customer_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT so.ShoppingOrderID AS order_id,
               soi.ProductID AS product_id,
               p.Name AS name,
               p.Price AS price,
               pc.Name AS category,
               soi.Quantity AS quantity,
               soi.PriceAtCheckout AS price_at_checkout
        FROM ShoppingOrder so
        JOIN ShoppingOrderItem soi ON so.ShoppingOrderID = soi.ShoppingOrderID
        JOIN Product p ON soi.ProductID = p.ProductID
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE so.UserID = %s AND so.Status = 'INPROGRESS'
        ORDER BY soi.ProductID
        """,
        (customer_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def customer_exists(customer_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT UserID FROM `User` WHERE UserID = %s AND Role = 'CUSTOMER'",
        (customer_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row is not None


def fetch_active_product(product_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT ProductID, Price, WeightLbs FROM Product WHERE ProductID = %s AND IsActive = TRUE",
        (product_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def fetch_inprogress_order(customer_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT ShoppingOrderID FROM ShoppingOrder
        WHERE UserID = %s AND Status = 'INPROGRESS'
        LIMIT 1
        """,
        (customer_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def create_inprogress_order(customer_id: int) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO ShoppingOrder (UserID, Street, City, State, Zip, Status)
        VALUES (%s, '', '', '', '', 'INPROGRESS')
        """,
        (customer_id,),
    )
    conn.commit()
    order_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return order_id


def fetch_order_item(order_id: int, product_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT Quantity FROM ShoppingOrderItem
        WHERE ShoppingOrderID = %s AND ProductID = %s
        """,
        (order_id, product_id),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def update_order_item_quantity(order_id: int, product_id: int, quantity: int) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE ShoppingOrderItem SET Quantity = %s
        WHERE ShoppingOrderID = %s AND ProductID = %s
        """,
        (quantity, order_id, product_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


def insert_order_item(
    order_id: int,
    product_id: int,
    quantity: int,
    price_at_checkout: float,
    weight_at_checkout: float,
) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO ShoppingOrderItem
            (ShoppingOrderID, ProductID, Quantity, PriceAtCheckout, WeightAtCheckout)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (order_id, product_id, quantity, price_at_checkout, weight_at_checkout),
    )
    conn.commit()
    cursor.close()
    conn.close()
