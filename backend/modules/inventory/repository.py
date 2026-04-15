from typing import Dict, List, Optional

from db import get_db_connection


def fetch_inventory() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT p.ProductID        AS id,
               p.Name             AS name,
               pc.ProductCategoryID  AS category_id,
               pc.Name            AS category,
               p.Price            AS price,
               i.QuantityInStock  AS quantity,
               i.ReservedQty      AS reserved
        FROM Inventory i
        JOIN Product p  ON i.ProductID = p.ProductID
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        ORDER BY p.ProductID
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def inventory_item_exists(product_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT ProductID FROM Inventory WHERE ProductID = %s", (product_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row is not None


def update_quantity(product_id: int, quantity: int) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE Inventory SET QuantityInStock = %s WHERE ProductID = %s",
        (quantity, product_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


def fetch_inventory_item(product_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT p.ProductID        AS id,
               p.Name             AS name,
               pc.Name            AS category,
               p.Price            AS price,
               i.QuantityInStock  AS quantity,
               i.ReservedQty      AS reserved
        FROM Inventory i
        JOIN Product p  ON i.ProductID = p.ProductID
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE i.ProductID = %s
        """,
        (product_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row
