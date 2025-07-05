from fastapi import APIRouter, HTTPException, Request
from db import database
from sqlalchemy import text
from datetime import datetime

router = APIRouter()

@router.get("/api/currency-rate")
async def get_currency_rate(from_currency: str = "GEL", to_currency: str = "RUB"):
    query = text("""
        SELECT rate FROM currency_rates
        WHERE from_currency = :from_currency AND to_currency = :to_currency
        ORDER BY updated_at DESC LIMIT 1
    """)
    result = await database.fetch_one(query, values={
        "from_currency": from_currency,
        "to_currency": to_currency
    })
    if not result:
        raise HTTPException(status_code=404, detail="Курс не найден")
    return {"rate": result["rate"]}


@router.put("/api/currency-rate")
async def update_currency_rate(request: Request):
    data = await request.json()
    from_currency = data.get("from_currency", "GEL")
    to_currency = data.get("to_currency", "RUB")
    rate = round(float(data.get("rate")), 8)

    if rate is None:
        raise HTTPException(status_code=400, detail="Не указан курс")

    query = text("""
        INSERT INTO currency_rates (from_currency, to_currency, rate, updated_at)
        VALUES (:from_currency, :to_currency, :rate, :updated_at)
    """)
    await database.execute(query, values={
        "from_currency": from_currency,
        "to_currency": to_currency,
        "rate": rate,
        "updated_at": datetime.utcnow()
    })

    return {"message": "Курс обновлён"}
