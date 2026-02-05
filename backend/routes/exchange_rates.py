# Exchange Rate Service - Real-time currency exchange rates
# Using ExchangeRate-API (free tier) for live rates

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import os

exchange_rate_router = APIRouter(prefix="/api/exchange-rates", tags=["Exchange Rates"])

# Cache for exchange rates (to minimize API calls)
RATE_CACHE = {
    "rates": {},
    "last_updated": None,
    "base_currency": "EUR"
}

# Cache duration in minutes
CACHE_DURATION_MINUTES = 30

# Supported currencies organized by region
SUPPORTED_CURRENCIES = {
    "europe": ["EUR", "GBP", "CHF", "PLN", "SEK", "NOK", "DKK", "CZK", "HUF", "RON"],
    "america": ["USD", "CAD", "BRL", "MXN", "ARS", "COP", "CLP", "PEN"],
    "asia": ["CNY", "JPY", "KRW", "INR", "SGD", "HKD", "THB", "MYR", "PHP", "IDR", "VND"],
    "maghreb": ["MAD", "DZD", "TND", "EGP", "LYD", "MRU"],
    "africa": ["XOF", "XAF", "NGN", "KES", "GHS", "TZS", "UGX", "RWF", "ZMW", "ZAR", "CDF", "MWK"]
}

# All supported currencies flat list
ALL_CURRENCIES = [c for currencies in SUPPORTED_CURRENCIES.values() for c in currencies]

# Fallback rates (used if API fails)
FALLBACK_RATES = {
    "EUR": 1.0,
    "USD": 1.08, "GBP": 0.86, "CHF": 0.94, "CNY": 7.82, "JPY": 162.5,
    "XOF": 655.96, "XAF": 655.96, "NGN": 1750, "KES": 165, "GHS": 16.5,
    "MAD": 10.85, "DZD": 145.5, "TND": 3.35, "EGP": 33.2, "LYD": 5.2,
    "CAD": 1.47, "BRL": 5.35, "MXN": 18.5, "INR": 90, "SGD": 1.45,
    "KRW": 1420, "HKD": 8.45, "THB": 38.5, "TZS": 2700, "UGX": 4050,
    "RWF": 1350, "ZMW": 27.5, "ZAR": 19.5, "CDF": 2750, "MRU": 42.5
}


async def fetch_exchange_rates(base: str = "EUR") -> Dict:
    """
    Fetch real-time exchange rates from ExchangeRate-API
    Free tier: https://www.exchangerate-api.com/
    """
    # ExchangeRate-API free endpoint (no key required for basic usage)
    url = f"https://api.exchangerate-api.com/v4/latest/{base}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "base": data.get("base", base),
                    "rates": data.get("rates", {}),
                    "date": data.get("date"),
                    "time_last_updated": data.get("time_last_updated"),
                    "provider": "exchangerate-api.com"
                }
            else:
                raise Exception(f"API returned status {response.status_code}")
                
    except Exception as e:
        print(f"Exchange rate API error: {e}")
        # Return fallback rates on error
        return {
            "success": False,
            "base": base,
            "rates": FALLBACK_RATES,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "error": str(e),
            "provider": "fallback"
        }


async def get_cached_rates(force_refresh: bool = False) -> Dict:
    """Get exchange rates from cache or fetch new ones"""
    global RATE_CACHE
    
    now = datetime.now(timezone.utc)
    cache_expired = (
        RATE_CACHE["last_updated"] is None or 
        (now - RATE_CACHE["last_updated"]) > timedelta(minutes=CACHE_DURATION_MINUTES)
    )
    
    if cache_expired or force_refresh or not RATE_CACHE["rates"]:
        result = await fetch_exchange_rates("EUR")
        
        if result.get("success", False):
            RATE_CACHE["rates"] = result["rates"]
            RATE_CACHE["last_updated"] = now
            RATE_CACHE["base_currency"] = result["base"]
        elif not RATE_CACHE["rates"]:
            # If cache is empty and API failed, use fallback
            RATE_CACHE["rates"] = FALLBACK_RATES
            RATE_CACHE["last_updated"] = now
        
        return {
            **result,
            "cached": False,
            "cache_expires_in": CACHE_DURATION_MINUTES * 60
        }
    
    return {
        "success": True,
        "base": RATE_CACHE["base_currency"],
        "rates": RATE_CACHE["rates"],
        "cached": True,
        "last_updated": RATE_CACHE["last_updated"].isoformat(),
        "cache_expires_in": int((RATE_CACHE["last_updated"] + timedelta(minutes=CACHE_DURATION_MINUTES) - now).total_seconds()),
        "provider": "cache"
    }


def setup_exchange_rate_routes(db):
    """Setup exchange rate routes"""
    
    @exchange_rate_router.get("/latest")
    async def get_latest_rates(
        base: str = "EUR",
        symbols: Optional[str] = None
    ):
        """
        Get latest exchange rates
        
        Args:
            base: Base currency (default EUR)
            symbols: Comma-separated list of currencies to return (optional)
        
        Returns:
            Exchange rates relative to base currency
        """
        result = await get_cached_rates()
        
        rates = result.get("rates", {})
        
        # Filter to requested symbols if provided
        if symbols:
            symbol_list = [s.strip().upper() for s in symbols.split(",")]
            rates = {k: v for k, v in rates.items() if k in symbol_list}
        
        # Convert rates to requested base if different from EUR
        if base.upper() != "EUR" and base.upper() in result.get("rates", {}):
            base_rate = result["rates"][base.upper()]
            rates = {k: round(v / base_rate, 6) for k, v in rates.items()}
        
        return {
            "success": True,
            "base": base.upper(),
            "rates": rates,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cached": result.get("cached", False),
            "provider": result.get("provider", "unknown")
        }
    
    @exchange_rate_router.get("/convert")
    async def convert_currency(
        from_currency: str,
        to_currency: str,
        amount: float
    ):
        """
        Convert amount from one currency to another
        
        Args:
            from_currency: Source currency code
            to_currency: Target currency code
            amount: Amount to convert
        
        Returns:
            Converted amount with exchange rate details
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        result = await get_cached_rates()
        rates = result.get("rates", {})
        
        if from_currency not in rates and from_currency != "EUR":
            raise HTTPException(status_code=400, detail=f"Currency {from_currency} not supported")
        if to_currency not in rates and to_currency != "EUR":
            raise HTTPException(status_code=400, detail=f"Currency {to_currency} not supported")
        
        # Calculate conversion
        # First convert to EUR, then to target currency
        from_rate = rates.get(from_currency, 1.0) if from_currency != "EUR" else 1.0
        to_rate = rates.get(to_currency, 1.0) if to_currency != "EUR" else 1.0
        
        # Direct exchange rate from source to target
        exchange_rate = to_rate / from_rate
        converted_amount = amount * exchange_rate
        
        return {
            "success": True,
            "from": {
                "currency": from_currency,
                "amount": amount
            },
            "to": {
                "currency": to_currency,
                "amount": round(converted_amount, 2)
            },
            "exchange_rate": round(exchange_rate, 6),
            "inverse_rate": round(1 / exchange_rate, 6),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cached": result.get("cached", False)
        }
    
    @exchange_rate_router.get("/supported")
    async def get_supported_currencies():
        """Get list of supported currencies organized by region"""
        return {
            "regions": SUPPORTED_CURRENCIES,
            "all_currencies": ALL_CURRENCIES,
            "total_currencies": len(ALL_CURRENCIES)
        }
    
    @exchange_rate_router.get("/pair/{from_currency}/{to_currency}")
    async def get_pair_rate(
        from_currency: str,
        to_currency: str
    ):
        """
        Get exchange rate for a specific currency pair
        
        Args:
            from_currency: Source currency code
            to_currency: Target currency code
        
        Returns:
            Exchange rate for the pair
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        result = await get_cached_rates()
        rates = result.get("rates", {})
        
        from_rate = rates.get(from_currency, 1.0) if from_currency != "EUR" else 1.0
        to_rate = rates.get(to_currency, 1.0) if to_currency != "EUR" else 1.0
        
        exchange_rate = to_rate / from_rate
        
        return {
            "pair": f"{from_currency}/{to_currency}",
            "rate": round(exchange_rate, 6),
            "inverse_pair": f"{to_currency}/{from_currency}",
            "inverse_rate": round(1 / exchange_rate, 6),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    @exchange_rate_router.post("/refresh")
    async def refresh_rates():
        """Force refresh exchange rates from API"""
        result = await get_cached_rates(force_refresh=True)
        return {
            "success": True,
            "message": "Exchange rates refreshed",
            "provider": result.get("provider"),
            "rates_count": len(result.get("rates", {}))
        }
    
    @exchange_rate_router.get("/calculator")
    async def calculator_rates(
        source_region: Optional[str] = None,
        dest_region: Optional[str] = None
    ):
        """
        Get exchange rates optimized for transfer calculator
        Returns rates relevant for the specified regions
        """
        result = await get_cached_rates()
        rates = result.get("rates", {})
        
        # Filter rates by region if specified
        filtered_rates = {}
        
        if source_region and source_region in SUPPORTED_CURRENCIES:
            for currency in SUPPORTED_CURRENCIES[source_region]:
                if currency in rates:
                    filtered_rates[currency] = rates[currency]
        
        if dest_region and dest_region in SUPPORTED_CURRENCIES:
            for currency in SUPPORTED_CURRENCIES[dest_region]:
                if currency in rates:
                    filtered_rates[currency] = rates[currency]
        
        # If no region specified, return all rates
        if not filtered_rates:
            filtered_rates = {k: v for k, v in rates.items() if k in ALL_CURRENCIES}
        
        return {
            "success": True,
            "base": "EUR",
            "rates": filtered_rates,
            "regions_requested": {
                "source": source_region,
                "destination": dest_region
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cached": result.get("cached", False),
            "provider": result.get("provider", "unknown")
        }
