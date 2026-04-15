from typing import Dict, List, Optional

from db import get_db_connection


def fetch_all_categories() -> List[Dict]:
    """Fetch all product categories."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT ProductCategoryID AS id, Name AS name
        FROM ProductCategory
        ORDER BY Name
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def fetch_active_products(category_ids: Optional[List[int]] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    if category_ids and len(category_ids) > 0:
        placeholders = ",".join(["%s"] * len(category_ids))
        query = f"""
        SELECT p.ProductID    AS id,
               p.Name         AS name,
               p.Price        AS price,
               p.WeightLbs    AS weight,
               pc.Name        AS category,
               p.IsActive     AS active
        FROM Product p
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE p.IsActive = TRUE AND p.ProductCategoryID IN ({placeholders})
        ORDER BY p.ProductID
        """
        cursor.execute(query, category_ids)
    else:
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


def deactivate_product(product_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE Product SET IsActive = FALSE WHERE ProductID = %s",
        (product_id,),
    )
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    conn.close()
    return affected > 0


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
