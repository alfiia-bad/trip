from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__, static_folder="build", static_url_path="")
CORS(app)

# Simple in-memory "database"
expenses = []

@app.route("/api/expenses", methods=["GET", "POST"])
def handle_expenses():
    if request.method == "POST":
        data = request.json
        expenses.append(data)
        return jsonify({"message": "Expense added"}), 201
    else:
        return jsonify(expenses)

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
