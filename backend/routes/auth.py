from flask import Blueprint, request, jsonify
import bcrypt
from db import get_db_connection
import mysql.connector

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    email_or_username = data["emailOrUsername"]
    password = data["password"]

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT * FROM Customer
        WHERE Email = %s OR Username = %s
        """,
        (email_or_username, email_or_username)
    )

    user = cursor.fetchone()

    if not user:
        return jsonify({"error": "Invalid username/email or password"}), 401
    
    if bcrypt.checkpw(password.encode(), user["PasswordHash"].encode()):
        return jsonify({
            "message": "Login successful",
            "customerID": user["CustomerID"],
            "username:": user["Username"]
        })
    
    return jsonify({"error": "Invalid username/email or password"}), 401


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():

    data = request.json

    username = data["username"]
    email = data["email"]
    password = data["password"]

    db = get_db_connection()
    cursor = db.cursor()

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:

        cursor.execute(
            """
            INSERT INTO Customer (Username, Email, PasswordHash)
            VALUES (%s, %s, %s)
            """,
            (username, email, password_hash)
        )

        db.commit()

        return jsonify({"message": "User created successfully"}), 201

    except mysql.connector.errors.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400