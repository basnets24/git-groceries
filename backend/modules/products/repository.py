from typing import Dict, List, Optional

from db import get_db_connection


def fetch_all_categories() -> List[Dict]:
    """Fetch all product categories."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT ProductCategoryID AS id, Name AS name, Description AS description
        FROM ProductCategory
        ORDER BY Name
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def fetch_active_products(
    category_ids: Optional[List[int]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_weight: Optional[float] = None,
    max_weight: Optional[float] = None,
) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    conditions = ["p.IsActive = TRUE"]
    params: List = []
    
    if category_ids and len(category_ids) > 0:
        placeholders = ",".join(["%s"] * len(category_ids))
        conditions.append(f"p.ProductCategoryID IN ({placeholders})")
        params.extend(category_ids)
    
    if min_price is not None:
        conditions.append("p.Price >= %s")
        params.append(min_price)
    
    if max_price is not None:
        conditions.append("p.Price <= %s")
        params.append(max_price)
    
    if min_weight is not None:
        conditions.append("p.WeightLbs >= %s")
        params.append(min_weight)
    
    if max_weight is not None:
        conditions.append("p.WeightLbs <= %s")
        params.append(max_weight)
    
    where_clause = " AND ".join(conditions)
    query = f"""
    SELECT p.ProductID    AS id,
           p.Name         AS name,
           p.Price        AS price,
           p.WeightLbs    AS weight,
           pc.Name        AS category,
           p.ImageURL     AS image,
           p.IsActive     AS active,
           COALESCE(i.QuantityInStock, 0) AS quantityInStock
    FROM Product p
    JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
    LEFT JOIN Inventory i ON p.ProductID = i.ProductID
    WHERE {where_clause}
    ORDER BY p.ProductID
    """
    cursor.execute(query, params)
    
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


def insert_product(name: str, price: float, weight: float, category_id: int, image_url: Optional[str] = None) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, ImageURL, IsActive)
        VALUES (%s, %s, %s, %s, %s, TRUE)
        """,
        (name, price, weight, category_id, image_url),
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
               p.WeightLbs AS weight, pc.Name AS category, p.ImageURL AS image
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
