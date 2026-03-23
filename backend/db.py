import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()   # load environment variables

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        user=os.getenv("MYSQL_USER", "appuser"),
        password=os.getenv("MYSQL_PASSWORD", "app123"),
        database=os.getenv("MYSQL_DATABASE", "appdb")
    )
