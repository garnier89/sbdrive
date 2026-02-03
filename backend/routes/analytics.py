# Module Analytics - Dashboard des revenus et KPIs
# Statistiques avancées pour la plateforme SB Money

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

# Create router
analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# ==================== SETUP ROUTES ====================

def setup_analytics_routes(db, get_admin_user):
    """Setup all analytics routes"""
    
    @analytics_router.get("/overview")
    async def get_overview_stats(
        period: str = "month",  # day, week, month, year
        current_user: dict = Depends(get_admin_user)
    ):
        """Get platform overview statistics"""
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(weeks=1)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:  # year
            start_date = now - timedelta(days=365)
        
        # Get user stats
        total_users = await db.users.count_documents({"role": "user"})
        new_users = await db.users.count_documents({
            "role": "user",
            "created_at": {"$gte": start_date.isoformat()}
        })
        active_users = await db.transactions.distinct("user_id", {
            "created_at": {"$gte": start_date.isoformat()}
        })
        
        # Get transaction stats
        total_transactions = await db.transactions.count_documents({
            "created_at": {"$gte": start_date.isoformat()}
        })
        completed_transactions = await db.transactions.count_documents({
            "created_at": {"$gte": start_date.isoformat()},
            "status": "completed"
        })
        
        # Calculate total volume
        pipeline = [
            {"$match": {
                "created_at": {"$gte": start_date.isoformat()},
                "status": "completed"
            }},
            {"$group": {
                "_id": None,
                "total_volume": {"$sum": "$amount"},
                "total_fees": {"$sum": {"$ifNull": ["$fee", 0]}}
            }}
        ]
        volume_result = await db.transactions.aggregate(pipeline).to_list(length=1)
        total_volume = volume_result[0]["total_volume"] if volume_result else 0
        total_fees = volume_result[0]["total_fees"] if volume_result else 0
        
        # Get wallet balances
        wallet_pipeline = [
            {"$group": {
                "_id": "$currency",
                "total_balance": {"$sum": "$balance"}
            }}
        ]
        wallet_balances = await db.wallets.aggregate(wallet_pipeline).to_list(length=20)
        
        return {
            "period": period,
            "users": {
                "total": total_users,
                "new": new_users,
                "active": len(active_users)
            },
            "transactions": {
                "total": total_transactions,
                "completed": completed_transactions,
                "success_rate": round(completed_transactions / max(total_transactions, 1) * 100, 1)
            },
            "volume": {
                "total": total_volume,
                "currency": "XOF"
            },
            "revenue": {
                "total_fees": total_fees,
                "currency": "XOF"
            },
            "wallets": {currency["_id"]: currency["total_balance"] for currency in wallet_balances}
        }
    
    @analytics_router.get("/revenue-by-source")
    async def get_revenue_by_source(
        period: str = "month",
        current_user: dict = Depends(get_admin_user)
    ):
        """Get revenue breakdown by transaction type"""
        
        now = datetime.now(timezone.utc)
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(weeks=1)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=365)
        
        # Revenue by transaction type
        pipeline = [
            {"$match": {
                "created_at": {"$gte": start_date.isoformat()},
                "status": "completed"
            }},
            {"$group": {
                "_id": "$type",
                "count": {"$sum": 1},
                "volume": {"$sum": "$amount"},
                "fees": {"$sum": {"$ifNull": ["$fee", 0]}}
            }},
            {"$sort": {"fees": -1}}
        ]
        
        results = await db.transactions.aggregate(pipeline).to_list(length=20)
        
        # Map transaction types to readable labels
        type_labels = {
            "deposit": "Dépôts",
            "withdrawal": "Retraits",
            "transfer": "Transferts P2P",
            "mm_transfer": "Mobile Money",
            "airtime": "Crédit téléphone",
            "bill_payment": "Factures",
            "payment_link": "Liens paiement",
            "qr_payment": "QR Code"
        }
        
        revenue_data = []
        total_revenue = 0
        
        for item in results:
            fees = item.get("fees", 0) or 0
            total_revenue += fees
            revenue_data.append({
                "type": item["_id"],
                "label": type_labels.get(item["_id"], item["_id"]),
                "count": item["count"],
                "volume": item["volume"],
                "fees": fees
            })
        
        # Calculate percentages
        for item in revenue_data:
            item["percentage"] = round(item["fees"] / max(total_revenue, 1) * 100, 1)
        
        return {
            "period": period,
            "total_revenue": total_revenue,
            "currency": "XOF",
            "breakdown": revenue_data
        }
    
    @analytics_router.get("/transactions-timeline")
    async def get_transactions_timeline(
        period: str = "month",
        granularity: str = "day",  # hour, day, week
        current_user: dict = Depends(get_admin_user)
    ):
        """Get transaction volume over time"""
        
        now = datetime.now(timezone.utc)
        if period == "day":
            start_date = now - timedelta(days=1)
            granularity = "hour"
        elif period == "week":
            start_date = now - timedelta(weeks=1)
            granularity = "day"
        elif period == "month":
            start_date = now - timedelta(days=30)
            granularity = "day"
        else:
            start_date = now - timedelta(days=365)
            granularity = "week"
        
        # Generate date buckets
        timeline = []
        current = start_date
        
        while current < now:
            if granularity == "hour":
                next_date = current + timedelta(hours=1)
                label = current.strftime("%H:00")
            elif granularity == "day":
                next_date = current + timedelta(days=1)
                label = current.strftime("%d/%m")
            else:
                next_date = current + timedelta(weeks=1)
                label = current.strftime("Sem %W")
            
            # Count transactions in this bucket
            count = await db.transactions.count_documents({
                "created_at": {
                    "$gte": current.isoformat(),
                    "$lt": next_date.isoformat()
                },
                "status": "completed"
            })
            
            # Sum volume
            pipeline = [
                {"$match": {
                    "created_at": {
                        "$gte": current.isoformat(),
                        "$lt": next_date.isoformat()
                    },
                    "status": "completed"
                }},
                {"$group": {"_id": None, "volume": {"$sum": "$amount"}}}
            ]
            volume_result = await db.transactions.aggregate(pipeline).to_list(length=1)
            volume = volume_result[0]["volume"] if volume_result else 0
            
            timeline.append({
                "date": current.isoformat(),
                "label": label,
                "count": count,
                "volume": volume
            })
            
            current = next_date
        
        return {
            "period": period,
            "granularity": granularity,
            "timeline": timeline
        }
    
    @analytics_router.get("/top-users")
    async def get_top_users(
        limit: int = 10,
        by: str = "volume",  # volume, transactions, fees
        current_user: dict = Depends(get_admin_user)
    ):
        """Get top users by transaction volume or count"""
        
        sort_field = {
            "volume": "total_volume",
            "transactions": "count",
            "fees": "total_fees"
        }.get(by, "total_volume")
        
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": "$user_id",
                "count": {"$sum": 1},
                "total_volume": {"$sum": "$amount"},
                "total_fees": {"$sum": {"$ifNull": ["$fee", 0]}}
            }},
            {"$sort": {sort_field: -1}},
            {"$limit": limit}
        ]
        
        results = await db.transactions.aggregate(pipeline).to_list(length=limit)
        
        # Enrich with user info
        top_users = []
        for item in results:
            user = await db.users.find_one(
                {"id": item["_id"]},
                {"_id": 0, "email": 1, "full_name": 1, "created_at": 1}
            )
            if user:
                top_users.append({
                    "user_id": item["_id"],
                    "email": user.get("email"),
                    "full_name": user.get("full_name"),
                    "transactions_count": item["count"],
                    "total_volume": item["total_volume"],
                    "total_fees": item["total_fees"]
                })
        
        return {"top_users": top_users, "sorted_by": by}
    
    @analytics_router.get("/geographic")
    async def get_geographic_stats(
        current_user: dict = Depends(get_admin_user)
    ):
        """Get statistics by country/region"""
        
        # Users by country
        user_pipeline = [
            {"$match": {"country": {"$exists": True, "$ne": None}}},
            {"$group": {
                "_id": "$country",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        users_by_country = await db.users.aggregate(user_pipeline).to_list(length=20)
        
        # Mobile Money transfers by country
        mm_pipeline = [
            {"$group": {
                "_id": "$dest_country",
                "count": {"$sum": 1},
                "volume": {"$sum": "$amount"}
            }},
            {"$sort": {"volume": -1}}
        ]
        mm_by_country = await db.mobile_money_transfers.aggregate(mm_pipeline).to_list(length=20)
        
        country_names = {
            "SN": "Sénégal", "CI": "Côte d'Ivoire", "ML": "Mali",
            "BF": "Burkina Faso", "BJ": "Bénin", "TG": "Togo",
            "CM": "Cameroun", "GH": "Ghana", "FR": "France"
        }
        
        return {
            "users_by_country": [
                {"country": item["_id"], "name": country_names.get(item["_id"], item["_id"]), "users": item["count"]}
                for item in users_by_country
            ],
            "transfers_by_country": [
                {"country": item["_id"], "name": country_names.get(item["_id"], item["_id"]), "count": item["count"], "volume": item["volume"]}
                for item in mm_by_country
            ]
        }
    
    @analytics_router.get("/mobile-money-stats")
    async def get_mobile_money_stats(
        period: str = "month",
        current_user: dict = Depends(get_admin_user)
    ):
        """Get Mobile Money specific statistics"""
        
        now = datetime.now(timezone.utc)
        if period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=365)
        
        # By operator
        operator_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {
                    "source": "$source_operator",
                    "dest": "$dest_operator"
                },
                "count": {"$sum": 1},
                "volume": {"$sum": "$amount"},
                "fees": {"$sum": "$total_fee"}
            }},
            {"$sort": {"volume": -1}}
        ]
        by_corridor = await db.mobile_money_transfers.aggregate(operator_pipeline).to_list(length=50)
        
        # By source operator
        source_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": "$source_operator",
                "count": {"$sum": 1},
                "volume": {"$sum": "$amount"}
            }},
            {"$sort": {"volume": -1}}
        ]
        by_source = await db.mobile_money_transfers.aggregate(source_pipeline).to_list(length=10)
        
        operator_labels = {
            "wave": "Wave", "orange_money": "Orange Money",
            "mtn_momo": "MTN MoMo", "moov": "Moov Money"
        }
        
        return {
            "period": period,
            "by_corridor": [
                {
                    "corridor": f"{operator_labels.get(c['_id']['source'], c['_id']['source'])} → {operator_labels.get(c['_id']['dest'], c['_id']['dest'])}",
                    "count": c["count"],
                    "volume": c["volume"],
                    "fees": c["fees"]
                }
                for c in by_corridor
            ],
            "by_source_operator": [
                {
                    "operator": operator_labels.get(s["_id"], s["_id"]),
                    "count": s["count"],
                    "volume": s["volume"]
                }
                for s in by_source
            ]
        }
    
    @analytics_router.get("/airtime-stats")
    async def get_airtime_stats(
        period: str = "month",
        current_user: dict = Depends(get_admin_user)
    ):
        """Get Airtime/Credit recharge statistics"""
        
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30) if period == "month" else now - timedelta(days=365)
        
        # By operator
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": "$operator_name",
                "count": {"$sum": 1},
                "volume": {"$sum": "$amount"},
                "fees": {"$sum": "$fee"}
            }},
            {"$sort": {"volume": -1}}
        ]
        by_operator = await db.airtime_topups.aggregate(pipeline).to_list(length=20)
        
        # By country
        country_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": "$country",
                "count": {"$sum": 1},
                "volume": {"$sum": "$amount"}
            }},
            {"$sort": {"volume": -1}}
        ]
        by_country = await db.airtime_topups.aggregate(country_pipeline).to_list(length=10)
        
        return {
            "period": period,
            "by_operator": by_operator,
            "by_country": by_country
        }
    
    @analytics_router.get("/kpis")
    async def get_kpis(
        current_user: dict = Depends(get_admin_user)
    ):
        """Get key performance indicators"""
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        
        # Today's stats
        today_transactions = await db.transactions.count_documents({
            "created_at": {"$gte": today_start.isoformat()},
            "status": "completed"
        })
        
        today_volume_pipeline = [
            {"$match": {"created_at": {"$gte": today_start.isoformat()}, "status": "completed"}},
            {"$group": {"_id": None, "volume": {"$sum": "$amount"}, "fees": {"$sum": {"$ifNull": ["$fee", 0]}}}}
        ]
        today_result = await db.transactions.aggregate(today_volume_pipeline).to_list(length=1)
        today_volume = today_result[0]["volume"] if today_result else 0
        today_fees = today_result[0]["fees"] if today_result else 0
        
        # This month's stats
        month_transactions = await db.transactions.count_documents({
            "created_at": {"$gte": month_start.isoformat()},
            "status": "completed"
        })
        
        month_volume_pipeline = [
            {"$match": {"created_at": {"$gte": month_start.isoformat()}, "status": "completed"}},
            {"$group": {"_id": None, "volume": {"$sum": "$amount"}, "fees": {"$sum": {"$ifNull": ["$fee", 0]}}}}
        ]
        month_result = await db.transactions.aggregate(month_volume_pipeline).to_list(length=1)
        month_volume = month_result[0]["volume"] if month_result else 0
        month_fees = month_result[0]["fees"] if month_result else 0
        
        # Last month comparison
        last_month_pipeline = [
            {"$match": {
                "created_at": {"$gte": last_month_start.isoformat(), "$lt": month_start.isoformat()},
                "status": "completed"
            }},
            {"$group": {"_id": None, "volume": {"$sum": "$amount"}, "fees": {"$sum": {"$ifNull": ["$fee", 0]}}}}
        ]
        last_month_result = await db.transactions.aggregate(last_month_pipeline).to_list(length=1)
        last_month_volume = last_month_result[0]["volume"] if last_month_result else 0
        last_month_fees = last_month_result[0]["fees"] if last_month_result else 0
        
        # Growth calculation
        volume_growth = ((month_volume - last_month_volume) / max(last_month_volume, 1)) * 100 if last_month_volume else 0
        fees_growth = ((month_fees - last_month_fees) / max(last_month_fees, 1)) * 100 if last_month_fees else 0
        
        # Average transaction value
        avg_transaction = month_volume / max(month_transactions, 1)
        
        # New users this month
        new_users_month = await db.users.count_documents({
            "role": "user",
            "created_at": {"$gte": month_start.isoformat()}
        })
        
        return {
            "today": {
                "transactions": today_transactions,
                "volume": today_volume,
                "fees": today_fees
            },
            "this_month": {
                "transactions": month_transactions,
                "volume": month_volume,
                "fees": month_fees,
                "new_users": new_users_month,
                "avg_transaction": round(avg_transaction, 0)
            },
            "growth": {
                "volume": round(volume_growth, 1),
                "fees": round(fees_growth, 1)
            },
            "currency": "XOF"
        }
    
    return analytics_router
