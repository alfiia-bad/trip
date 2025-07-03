from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import psycopg2

app = Flask(__name__, static_folder="build", static_url_path="")
CORS(app)

# Получаем URL базы данных из переменных окружения
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_conn():
    return psycopg2.connect(DATABASE_URL, sslmode="require")

@app.route("/api/expenses", methods=["GET", "POST"])
def handle_expenses():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                if request.method == "POST":
                    data = request.json
                    cur.execute("""
                        INSERT INTO expenses (who, what, amount, currency, date, for_whom)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        data["who"],
                        data["what"],
                        data["amount"],
                        data["currency"],
                        data["date"],
                        data["forWhom"]
                    ))
                    return jsonify({"message": "Expense added"}), 201
                else:
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
                            "forWhom": r[5]
                        }
                        for r in rows
                    ]
                    return jsonify(expenses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/participants", methods=["GET", "POST"])
def handle_participants():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                if request.method == "POST":
                    data = request.json
                    cur.execute("INSERT INTO participants (name) VALUES (%s) ON CONFLICT DO NOTHING", (data["name"],))
                    return jsonify({"message": "Participant added"}), 201
                else:
                    cur.execute("SELECT name FROM participants ORDER BY name")
                    rows = cur.fetchall()
                    return jsonify([r[0] for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/participants/<old_name>", methods=["PUT"])
def update_participant(old_name):
    try:
        data = request.json
        new_name = data["name"]
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Обновим имя в таблице participants
                cur.execute("UPDATE participants SET name = %s WHERE name = %s", (new_name, old_name))
                # И, возможно, обновим связанные расходы
                cur.execute("UPDATE expenses SET who = %s WHERE who = %s", (new_name, old_name))
                cur.execute("UPDATE expenses SET for_whom = REPLACE(for_whom, %s, %s) WHERE for_whom LIKE %s",
                            (old_name, new_name, f'%{old_name}%'))
                return jsonify({"message": "Participant updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/participants/<name>", methods=["DELETE"])
def delete_participant(name):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM participants WHERE name = %s", (name,))
                return jsonify({"message": "Participant deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/currencies", methods=["GET", "POST"])
def handle_currencies():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                if request.method == "POST":
                    data = request.json
                    cur.execute("INSERT INTO currencies (code) VALUES (%s) ON CONFLICT DO NOTHING", (data["code"],))
                    return jsonify({"message": "Currency added"}), 201
                else:
                    cur.execute("SELECT code FROM currencies ORDER BY code")
                    rows = cur.fetchall()
                    return jsonify([r[0] for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/currencies/<code>", methods=["DELETE"])
def delete_currency(code):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM currencies WHERE code = %s", (code,))
                return jsonify({"message": "Currency deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
