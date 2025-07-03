from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import psycopg2

app = Flask(__name__, static_folder="build", static_url_path="")
CORS(app)

# Получаем URL базы данных из переменных окружения
DATABASE_URL = os.environ.get("DATABASE_URL")

# Подключаемся к базе
conn = psycopg2.connect(DATABASE_URL, sslmode="require")
cur = conn.cursor()

@app.route("/api/expenses", methods=["GET", "POST"])
def handle_expenses():
    if request.method == "POST":
        try:
            data = request.get_json()

            # Получаем поля (camelCase → snake_case)
            who = data.get("who")
            what = data.get("what")
            amount = data.get("amount")
            currency = data.get("currency")
            date = data.get("date")
            for_whom = data.get("forWhom")

            # Проверяем, что все поля заполнены
            if not all([who, what, amount, currency, date, for_whom]):
                return jsonify({"error": "Все поля должны быть заполнены"}), 400

            # Вставляем в базу
            cur.execute("""
                INSERT INTO expenses (who, what, amount, currency, date, for_whom)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (who, what, amount, currency, date, for_whom))
            conn.commit()
            return jsonify({"message": "Expense added"}), 201

        except Exception as e:
            print("Ошибка при сохранении:", e)
            return jsonify({"error": "Ошибка сервера"}), 500

    else:  # GET
        cur.execute("""
            SELECT who, what, amount, currency, date, for_whom
            FROM expenses
            ORDER BY id DESC
        """)
        rows = cur.fetchall()
        expenses = [
            {
                "who": r[0],
                "what": r[1],
                "amount": r[2],
                "currency": r[3],
                "date": r[4],
                "forWhom": r[5]  # Возвращаем обратно в camelCase
            }
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
