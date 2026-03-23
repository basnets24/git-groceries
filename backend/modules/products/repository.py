from typing import Dict, List, Optional

from db import get_db_connection


def fetch_active_products() -> List[Dict]:
    conn = get_db_connection()
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
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def category_exists(category_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT ProductCategoryID FROM ProductCategory WHERE ProductCategoryID = %s",
        (category_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row is not None


def insert_product(name: str, price: float, weight: float, category_id: int) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive)
        VALUES (%s, %s, %s, %s, TRUE)
        """,
        (name, price, weight, category_id),
    )
    conn.commit()
    product_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return product_id


def insert_inventory_item(product_id: int, quantity: int) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, %s, 0)",
        (product_id, quantity),
    )
    conn.commit()
    cursor.close()
    conn.close()


def fetch_product_by_id(product_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
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
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row
