import os
import mysql.connector


def get_ready_orders():
    conn = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE")
    )

    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            so.ShoppingOrderID AS id
        FROM ShoppingOrder so
        WHERE so.Status = 'INPROGRESS'
    """)

    orders = cursor.fetchall()
    cursor.close()
    conn.close()

    return orders
