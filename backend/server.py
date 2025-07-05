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
                        SELECT id, who, what, amount, currency, date, for_whom
                        FROM expenses
                        ORDER BY id DESC
                    """)
                    rows = cur.fetchall()
                    expenses = [
                        {
                            "id": r[0],      
                            "who": r[1],
                            "what": r[2],
                            "amount": r[3],
                            "currency": r[4],
                            "date": r[5],
                            "forWhom": r[6] 
                        }
                        for r in rows
                    ]
                    return jsonify(expenses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM expenses WHERE id = %s", (expense_id,))
                return jsonify({"message": "Expense deleted"})
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

@app.route("/api/exchange-matrix", methods=["GET"])
def get_exchange_matrix():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # 1) получаем упорядоченный список кодов валют
                cur.execute("SELECT code FROM currencies ORDER BY code")
                codes = [r[0] for r in cur.fetchall()]

                # 2) вытаскиваем все актуальные курсы
                cur.execute("SELECT from_code, to_code, rate FROM exchange_rates")
                rows = cur.fetchall()

                # 3) строим словарь-матрицу с 1.0 на диагонали
                matrix = {
                    f: {t: (1.0 if f == t else None) for t in codes}
                    for f in codes
                }
                for f, t, rate in rows:
                    matrix[f][t] = round(rate, 8)

                # 4) отдаем JSON
                return jsonify({
                    "currencies": codes,
                    "matrix": [
                        [ matrix[f][t] for t in codes ]
                        for f in codes
                    ]
                })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/exchange-rate", methods=["PUT"])
def update_exchange_rate():
    """
    Ожидает JSON { from_code, to_code, rate }.
    Сохраняет прямой курс и автоматически пересчитывает обратный.
    """
    data = request.json or {}
    f = data.get("from_code")
    t = data.get("to_code")
    r = data.get("rate", 0.0)

    if not f or not t or r <= 0:
        return jsonify({"error": "Неверные параметры"}), 400

    inv = round(1.0 / r, 8)
    r = round(r, 8)

    upsert_sql = """
    INSERT INTO exchange_rates (from_code, to_code, rate)
      VALUES (%s, %s, %s)
    ON CONFLICT (from_code, to_code) DO UPDATE
      SET rate = EXCLUDED.rate
    """

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # прямой
                cur.execute(upsert_sql, (f, t, r))
                # обратный
                cur.execute(upsert_sql, (t, f, inv))
                conn.commit()
        return jsonify({"message": "Курс обновлён"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/currency-rate', methods=["GET", "POST"])
def currency_rate():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                if request.method == "POST":
                    data = request.json
                    from_currency = data["from_currency"]
                    to_currency = data["to_currency"]
                    rate = round(float(data["rate"]), 8)

                    cur.execute("""
                        INSERT INTO currency_rates (from_currency, to_currency, rate, updated_at)
                        VALUES (%s, %s, %s, NOW())
                    """, (from_currency, to_currency, rate))

                    return jsonify({"message": "Rate updated"}), 201

                # GET-запрос
                from_currency = request.args.get("from_currency", "GEL")
                to_currency = request.args.get("to_currency", "RUB")
                cur.execute("""
                    SELECT rate FROM currency_rates
                    WHERE from_currency = %s AND to_currency = %s
                    ORDER BY updated_at DESC
                    LIMIT 1
                """, (from_currency, to_currency))
                row = cur.fetchone()
                if row:
                    return jsonify({"rate": row[0]})
                else:
                    return jsonify({"error": "Курс не найден"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/default-currency", methods=["GET"])
def get_default_currency():
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT code FROM default_currency LIMIT 1;")
            row = cur.fetchone()
            if row:
                return jsonify({"code": row[0]})
            else:
                # если ещё не установлен — возвращаем первый из currencies
                cur.execute("SELECT code FROM currencies ORDER BY code LIMIT 1;")
                first = cur.fetchone()
                return jsonify({ "code": first[0] if first else None }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/default-currency", methods=["PUT"])
def set_default_currency():
    data = request.json or {}
    code = data.get("code")
    if not code:
        return jsonify({"error": "Не указан code"}), 400

    try:
        with get_conn() as conn, conn.cursor() as cur:
            # заменяем старую запись (или вставляем, если пусто)
            cur.execute("""
              INSERT INTO default_currency(code)
                VALUES (%s)
              ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
            """, (code,))
            conn.commit()
        return jsonify({"message": f"Default currency set to {code}"})
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
