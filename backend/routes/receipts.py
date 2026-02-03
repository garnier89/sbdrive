# Module Reçus PDF
# Génère des reçus PDF téléchargeables pour les transactions

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from datetime import datetime
from io import BytesIO
import jwt

receipts_router = APIRouter(prefix="/api/receipts", tags=["Receipts"])

def setup_receipts_routes(db, jwt_secret, jwt_algorithm):
    """Setup receipts routes with database access"""

    @receipts_router.get("/transaction/{transaction_id}")
    async def generate_transaction_receipt(
        transaction_id: str,
        authorization: str = Header(None)
    ):
        """Generate PDF receipt for a transaction"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get transaction
        tx = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Verify ownership
        if tx.get("user_id") != user_id and tx.get("sender_id") != user_id and tx.get("recipient_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate PDF
        pdf_buffer = generate_pdf_receipt(tx, user)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=recu_sbpaygo_{transaction_id[:8]}.pdf"
            }
        )

    return receipts_router


def generate_pdf_receipt(transaction: dict, user: dict) -> BytesIO:
    """Generate a professional PDF receipt"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas
    from reportlab.lib.styles import getSampleStyleSheet
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Colors
    primary_color = HexColor("#f97316")  # Orange
    dark_color = HexColor("#1e293b")
    gray_color = HexColor("#64748b")
    light_bg = HexColor("#f8fafc")
    
    # Header Background
    c.setFillColor(primary_color)
    c.rect(0, height - 80*mm, width, 80*mm, fill=1, stroke=0)
    
    # Logo/Title
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 28)
    c.drawString(25*mm, height - 25*mm, "SBPAYGO")
    
    c.setFont("Helvetica", 12)
    c.drawString(25*mm, height - 35*mm, "Reçu de Transaction")
    
    # Transaction ID
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width - 25*mm, height - 25*mm, f"N° {transaction.get('id', 'N/A')[:8].upper()}")
    
    # Date
    tx_date = transaction.get('created_at', '')
    if tx_date:
        try:
            if isinstance(tx_date, str):
                dt = datetime.fromisoformat(tx_date.replace('Z', '+00:00'))
            else:
                dt = tx_date
            formatted_date = dt.strftime("%d/%m/%Y à %H:%M")
        except:
            formatted_date = str(tx_date)[:19]
    else:
        formatted_date = "N/A"
    
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 25*mm, height - 35*mm, formatted_date)
    
    # Status Badge
    status = transaction.get('status', 'pending')
    status_colors = {
        'completed': HexColor("#22c55e"),
        'pending': HexColor("#eab308"),
        'rejected': HexColor("#ef4444")
    }
    status_labels = {
        'completed': 'COMPLÉTÉ',
        'pending': 'EN ATTENTE',
        'rejected': 'REJETÉ'
    }
    
    badge_color = status_colors.get(status, HexColor("#64748b"))
    c.setFillColor(badge_color)
    c.roundRect(width - 55*mm, height - 50*mm, 30*mm, 8*mm, 2*mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width - 40*mm, height - 47.5*mm, status_labels.get(status, status.upper()))
    
    # Main Content Area
    y_pos = height - 95*mm
    
    # Amount Box
    c.setFillColor(light_bg)
    c.roundRect(25*mm, y_pos - 35*mm, width - 50*mm, 35*mm, 3*mm, fill=1, stroke=0)
    
    # Amount
    amount = transaction.get('amount', 0)
    currency = transaction.get('currency', 'EUR')
    currency_symbols = {'EUR': '€', 'USD': '$', 'XOF': 'CFA', 'GBP': '£', 'CAD': 'C$', 'CHF': 'CHF'}
    symbol = currency_symbols.get(currency, currency)
    
    formatted_amount = f"{abs(amount):,.2f}".replace(',', ' ')
    sign = "+" if amount >= 0 else "-"
    amount_color = HexColor("#22c55e") if amount >= 0 else HexColor("#ef4444")
    
    c.setFillColor(gray_color)
    c.setFont("Helvetica", 10)
    c.drawString(30*mm, y_pos - 12*mm, "Montant")
    
    c.setFillColor(amount_color)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(30*mm, y_pos - 28*mm, f"{sign}{formatted_amount} {symbol}")
    
    y_pos -= 50*mm
    
    # Transaction Details
    c.setFillColor(dark_color)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(25*mm, y_pos, "Détails de la transaction")
    
    y_pos -= 15*mm
    
    # Details rows
    details = [
        ("Type", get_transaction_type_label(transaction.get('type', 'N/A'))),
        ("Description", transaction.get('description', 'N/A')[:50]),
        ("Référence", transaction.get('id', 'N/A')),
        ("Date", formatted_date),
        ("Devise", currency),
    ]
    
    # Add recipient/sender if available
    if transaction.get('recipient_email'):
        details.append(("Destinataire", transaction.get('recipient_email')))
    if transaction.get('sender_email'):
        details.append(("Expéditeur", transaction.get('sender_email')))
    if transaction.get('recipient_phone'):
        details.append(("Téléphone", transaction.get('recipient_phone')))
    
    for label, value in details:
        c.setFillColor(gray_color)
        c.setFont("Helvetica", 10)
        c.drawString(25*mm, y_pos, label)
        
        c.setFillColor(dark_color)
        c.setFont("Helvetica", 10)
        c.drawString(70*mm, y_pos, str(value) if value else "N/A")
        
        # Line separator
        c.setStrokeColor(HexColor("#e2e8f0"))
        c.setLineWidth(0.5)
        c.line(25*mm, y_pos - 5*mm, width - 25*mm, y_pos - 5*mm)
        
        y_pos -= 12*mm
    
    # User Info Section
    y_pos -= 10*mm
    c.setFillColor(dark_color)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(25*mm, y_pos, "Informations du titulaire")
    
    y_pos -= 15*mm
    
    user_details = [
        ("Nom", user.get('full_name', 'N/A')),
        ("Email", user.get('email', 'N/A')),
        ("Téléphone", user.get('phone', 'N/A')),
    ]
    
    for label, value in user_details:
        c.setFillColor(gray_color)
        c.setFont("Helvetica", 10)
        c.drawString(25*mm, y_pos, label)
        
        c.setFillColor(dark_color)
        c.setFont("Helvetica", 10)
        c.drawString(70*mm, y_pos, str(value) if value else "N/A")
        
        y_pos -= 10*mm
    
    # Footer
    c.setFillColor(light_bg)
    c.rect(0, 0, width, 25*mm, fill=1, stroke=0)
    
    c.setFillColor(gray_color)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 15*mm, "Ce document est un reçu officiel généré automatiquement par SBPAYGO.")
    c.drawCentredString(width/2, 10*mm, f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} • www.sbpaygo.com")
    
    # QR Code placeholder (simple text for now)
    c.setFillColor(gray_color)
    c.setFont("Helvetica", 7)
    c.drawRightString(width - 25*mm, 10*mm, f"ID: {transaction.get('id', 'N/A')}")
    
    c.save()
    buffer.seek(0)
    return buffer


def get_transaction_type_label(tx_type: str) -> str:
    """Get French label for transaction type"""
    labels = {
        'transfer_in': 'Transfert reçu',
        'transfer_out': 'Transfert envoyé',
        'deposit': 'Dépôt',
        'withdrawal': 'Retrait',
        'bill_payment': 'Paiement de facture',
        'p2p_transfer': 'Transfert P2P',
        'vault_deposit': 'Dépôt coffre-fort',
        'vault_withdrawal': 'Retrait coffre-fort',
        'card_payment': 'Paiement carte'
    }
    return labels.get(tx_type, tx_type)
