from fastapi import APIRouter, HTTPException
from db import database  # или как у тебя называется модуль
from sqlalchemy import text

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
