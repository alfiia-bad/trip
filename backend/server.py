from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import psycopg2

app = Flask(__name__, static_folder="build", static_url_path="")
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL, sslmode="require")
cur = conn.cursor()

@app.route("/api/expenses", methods=["GET", "POST"])
def handle_expenses():
    if request.method == "POST":
        data = request.json
        cur.execute("""
            INSERT INTO expenses (who, what, amount, currency, date, for_whom)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data["who"], data["what"], data["amount"], data["currency"], data["date"], data["forWhom"]))
        conn.commit()
        return jsonify({"message": "Expense added"}), 201
    else:
        cur.execute("SELECT who, what, amount, currency, date, for_whom FROM expenses")
        rows = cur.fetchall()
        expenses = [
            {"who": r[0], "what": r[1], "amount": r[2], "currency": r[3], "date": r[4], "forWhom": r[5]}
            for r in rows
        ]
        return jsonify(expenses)

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
