"""
SBPAYGO - Database Models & Pydantic Schemas
Complete schema for Wallet + Bank + Mobile Money system
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

# ==================== ENUMS ====================

class UserStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"

class TransactionType(str, Enum):
    PAYMENT = "payment"
    TRANSFER = "transfer"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    BILL_PAYMENT = "bill_payment"
    REFUND = "refund"

class TransactionMethod(str, Enum):
    CARD = "card"
    MOBILE_MONEY = "mobile_money"
    WALLET = "wallet"
    BANK = "bank"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DocumentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class DocumentType(str, Enum):
    ID_CARD = "id_card"
    PASSPORT = "passport"
    PROOF_OF_ADDRESS = "proof_of_address"
    BANK_STATEMENT = "bank_statement"
    SELFIE = "selfie"

class MobileMoneyProvider(str, Enum):
    ORANGE_MONEY = "orange_money"
    MTN_MOMO = "mtn_momo"
    WAVE = "wave"
    MOOV_MONEY = "moov_money"

class CardBrand(str, Enum):
    VISA = "visa"
    MASTERCARD = "mastercard"
    AMEX = "amex"

# ==================== USER MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    preferred_language: str = "fr"
    default_currency: str = "EUR"
    country: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    default_currency: Optional[str] = None
    country: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str] = None
    default_currency: str
    preferred_language: str
    country: Optional[str] = None
    status: str
    kyc_status: str
    role: str
    created_at: str

# ==================== WALLET MODELS ====================

class WalletResponse(BaseModel):
    id: str
    user_id: str
    currency: str
    balance: float
    created_at: str

# ==================== CARD MODELS ====================

class CardCreate(BaseModel):
    token: str
    brand: str
    last4: str
    expiry_month: int
    expiry_year: int

class CardResponse(BaseModel):
    id: str
    user_id: str
    brand: str
    last4: str
    expiry: str
    is_default: bool
    created_at: str

# ==================== BANK MODELS ====================

class BankCreate(BaseModel):
    name: str
    country: str
    swift_code: str
    logo_url: Optional[str] = None

class BankResponse(BaseModel):
    id: str
    name: str
    country: str
    swift_code: str
    logo_url: Optional[str] = None

class BankAccountCreate(BaseModel):
    bank_id: Optional[str] = None
    bank_name: str
    account_holder_name: str
    iban: Optional[str] = None
    account_number: Optional[str] = None
    swift_bic: Optional[str] = None
    bank_country: str
    currency: str = "EUR"
    is_default: bool = False

class BankAccountUpdate(BaseModel):
    account_holder_name: Optional[str] = None
    is_default: Optional[bool] = None

class BankAccountResponse(BaseModel):
    id: str
    user_id: str
    bank_id: Optional[str] = None
    bank_name: str
    account_holder_name: str
    iban: Optional[str] = None
    account_number: Optional[str] = None
    swift_bic: Optional[str] = None
    bank_country: str
    currency: str
    is_default: bool
    verification_status: str
    created_at: str

# ==================== MOBILE MONEY MODELS ====================

class MobileMoneyAccountCreate(BaseModel):
    provider: str
    phone_number: str
    account_name: Optional[str] = None

class MobileMoneyAccountResponse(BaseModel):
    id: str
    user_id: str
    provider: str
    phone_number: str
    account_name: Optional[str] = None
    is_verified: bool
    is_default: bool
    created_at: str

class MobileMoneyDepositRequest(BaseModel):
    amount: float
    currency: str = "XOF"
    provider: str
    phone_number: str

class MobileMoneyWithdrawRequest(BaseModel):
    amount: float
    currency: str = "XOF"
    mobile_money_account_id: str

# ==================== TRANSACTION MODELS ====================

class TransferRequest(BaseModel):
    recipient_email: str
    amount: float
    currency: str = "EUR"
    description: Optional[str] = None

class BankTransferRequest(BaseModel):
    bank_account_id: str
    amount: float
    currency: str = "EUR"
    description: Optional[str] = None

class DepositRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    payment_method: str = "card"

class WithdrawRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    bank_account_id: Optional[str] = None
    mobile_money_account_id: Optional[str] = None

class BillPaymentRequest(BaseModel):
    bill_type: str
    bill_reference: str
    amount: float
    currency: str = "EUR"

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    type: str
    method: str
    amount: float
    currency: str
    fee: float
    status: str
    reference: Optional[str] = None
    description: Optional[str] = None
    created_at: str

# ==================== CHECKOUT MODELS ====================

class CheckoutSessionRequest(BaseModel):
    amount: float
    currency: str = "eur"
    origin_url: str

class PayPalCheckoutRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    origin_url: str

# ==================== 2FA MODELS ====================

class TwoFactorSetupRequest(BaseModel):
    phone_number: str

class TwoFactorVerifyRequest(BaseModel):
    code: str

# ==================== CURRENCY & LANGUAGE MODELS ====================

class CurrencyCreate(BaseModel):
    code: str
    name: str
    symbol: str
    active: bool = True

class CurrencyResponse(BaseModel):
    id: str
    code: str
    name: str
    symbol: str
    active: bool

class LanguageCreate(BaseModel):
    code: str
    name: str
    native_name: str
    rtl: bool = False
    active: bool = True

class LanguageResponse(BaseModel):
    id: str
    code: str
    name: str
    native_name: str
    rtl: bool
    active: bool

# ==================== ZONE MODELS ====================

class ZoneCreate(BaseModel):
    name: str
    country: str
    currency: str
    language: str

class ZoneConfigCreate(BaseModel):
    zone_name: str
    countries: List[str]
    currencies: List[str]
    payment_methods: List[str]
    transfer_fees_percent: float = 1.0
    min_transfer_amount: float = 1.0
    max_transfer_amount: float = 10000.0

class ZonePaymentMethodCreate(BaseModel):
    zone_id: str
    method: str
    active: bool = True
    fees_percent: float = 0.0

# ==================== DOCUMENT MODELS ====================

class DocumentUpload(BaseModel):
    document_type: str
    document_name: str
    file_url: Optional[str] = None

class DocumentStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    type: str
    file_url: str
    status: str
    rejection_reason: Optional[str] = None
    created_at: str

# ==================== EXCHANGE RATE MODELS ====================

class ExchangeRateCreate(BaseModel):
    base_currency: str
    target_currency: str
    rate: float

class ExchangeRateResponse(BaseModel):
    id: str
    base_currency: str
    target_currency: str
    rate: float
    updated_at: str

# ==================== ADMIN MODELS ====================

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    status: Optional[str] = None
    role: Optional[str] = None
    kyc_status: Optional[str] = None

class AdminCreditDebit(BaseModel):
    user_id: str
    amount: float
    currency: str = "EUR"
    description: str

class AdminLogResponse(BaseModel):
    id: str
    admin_id: str
    action: str
    target_type: str
    target_id: str
    details: Optional[Dict[str, Any]] = None
    created_at: str

# ==================== SETTINGS MODELS ====================

class LanguageUpdateRequest(BaseModel):
    language: str

class CurrencyUpdateRequest(BaseModel):
    currency: str
