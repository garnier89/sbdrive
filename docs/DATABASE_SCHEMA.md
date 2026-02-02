# 📐 SB Pay - Schéma de Base de Données MongoDB

## Architecture des Collections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SB PAY DATABASE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐                │
│  │   USERS     │────▶│   WALLETS   │────▶│  TRANSACTIONS   │                │
│  └─────────────┘     └─────────────┘     └─────────────────┘                │
│         │                   │                    │                           │
│         ▼                   │                    │                           │
│  ┌─────────────┐           │                    │                           │
│  │BANK_ACCOUNTS│───────────┼────────────────────┘                           │
│  └─────────────┘           │                                                │
│         │                   │                                                │
│         ▼                   ▼                                                │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐                │
│  │KYC_DOCUMENTS│     │   OTP_CODES │     │  NOTIFICATIONS  │                │
│  └─────────────┘     └─────────────┘     └─────────────────┘                │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐                │
│  │ZONE_CONFIGS │     │ ADMIN_LOGS  │     │PAYMENT_TRANSACTIONS│             │
│  └─────────────┘     └─────────────┘     └─────────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Collection: `users`

```javascript
{
  "id": "uuid-v4",                    // Identifiant unique
  "email": "user@example.com",        // Email unique
  "password_hash": "bcrypt_hash",     // Mot de passe hashé
  "full_name": "Jean Dupont",         // Nom complet
  "phone": "+33612345678",            // Téléphone (optionnel)
  "country": "FR",                    // Code pays ISO
  "role": "user | admin",             // Rôle utilisateur
  "is_active": true,                  // Compte actif/désactivé
  "deleted": false,                   // Supprimé (soft delete)
  
  // Authentification 2FA
  "two_factor_enabled": false,
  "two_factor_phone": "+33612345678",
  
  // Préférences
  "preferred_language": "fr",         // fr|en|es|pt|ar|de|zh
  "preferred_currency": "EUR",        // Devise par défaut
  
  // KYC
  "kyc_status": "pending | verified | rejected",
  
  // Métadonnées
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z",
  "last_login": "2025-01-15T10:00:00Z",
  "created_by_admin": "admin_uuid"    // Si créé par admin
}
```

**Index:**
- `email` (unique)
- `id` (unique)
- `role`
- `is_active`
- `kyc_status`

---

## 💰 Collection: `wallets`

```javascript
{
  "id": "uuid-v4",                    // Identifiant unique
  "user_id": "user_uuid",             // Référence utilisateur
  "balance": 1500.50,                 // Solde actuel
  "currency": "EUR",                  // Code devise ISO
  "is_locked": false,                 // Wallet bloqué
  "locked_amount": 0,                 // Montant bloqué
  
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Index:**
- `user_id` + `currency` (compound unique)
- `id` (unique)

**Note:** Un utilisateur a un wallet par devise (EUR, USD, XOF, etc.)

---

## 💳 Collection: `transactions`

```javascript
{
  "id": "uuid-v4",                    // Identifiant unique
  "user_id": "user_uuid",             // Propriétaire transaction
  
  // Type de transaction
  "type": "transfer_in | transfer_out | deposit | withdrawal | 
           bill_payment | bank_transfer | admin_credit | admin_debit",
  
  // Montants
  "amount": -150.00,                  // Montant (négatif = sortie)
  "fees": 1.50,                       // Frais appliqués
  "currency": "EUR",                  // Devise
  "original_amount": 150.00,          // Montant original (si conversion)
  "original_currency": "USD",         // Devise originale
  "exchange_rate": 0.93,              // Taux de change utilisé
  
  // Statut
  "status": "pending | completed | rejected | cancelled",
  
  // Détails transfert
  "recipient_email": "dest@email.com",
  "sender_email": "exp@email.com",
  "description": "Motif du transfert",
  
  // Détails virement bancaire
  "bank_account_id": "bank_uuid",
  "bank_account_iban": "FR76XXXX...",
  "bank_name": "BNP Paribas",
  "estimated_arrival": "2025-01-17T10:00:00Z",
  
  // Détails paiement
  "payment_method": "stripe | paypal | orange_money | mtn_momo | wave",
  "stripe_session_id": "cs_xxx",
  "paypal_order_id": "PAYPAL-xxx",
  "mobile_money_reference": "MM-xxx",
  "mobile_money_phone": "+221771234567",
  
  // Admin
  "admin_id": "admin_uuid",           // Si action admin
  
  // Métadonnées
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Index:**
- `user_id`
- `id` (unique)
- `type`
- `status`
- `created_at`
- `payment_method`

---

## 🏦 Collection: `bank_accounts`

```javascript
{
  "id": "uuid-v4",                    // Identifiant unique
  "user_id": "user_uuid",             // Propriétaire
  
  // Informations compte
  "account_holder_name": "Jean Dupont",
  "iban": "FR7630006000011234567890189",
  "account_number": "1234567890",     // Si pas d'IBAN
  "swift_bic": "BNPAFRPP",
  "bank_name": "BNP Paribas",
  "bank_country": "FR",
  "currency": "EUR",
  
  // Statut
  "is_default": true,                 // Compte par défaut
  "verification_status": "pending | verified | failed",
  "verification_date": "2025-01-15T10:00:00Z",
  
  // Soft delete
  "deleted": false,
  
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Index:**
- `user_id`
- `id` (unique)
- `iban`
- `verification_status`

---

## 📄 Collection: `kyc_documents`

```javascript
{
  "id": "uuid-v4",                    // Identifiant unique
  "user_id": "user_uuid",             // Propriétaire
  
  // Document
  "document_type": "id_card | passport | proof_of_address | bank_statement",
  "document_name": "carte_identite.pdf",
  "document_url": "/uploads/docs/xxx.pdf",
  "file_size": 2048576,               // Taille en bytes
  "mime_type": "application/pdf",
  
  // Validation
  "status": "pending | approved | rejected",
  "rejection_reason": "Document illisible",
  "reviewed_by": "admin_uuid",
  "reviewed_at": "2025-01-15T10:00:00Z",
  
  "uploaded_at": "2025-01-15T10:00:00Z"
}
```

**Index:**
- `user_id`
- `status`
- `document_type`

---

## 🔐 Collection: `otp_codes`

```javascript
{
  "user_id": "user_uuid",             // Utilisateur
  "type": "login | 2fa_setup | transaction_confirm",
  "code_hash": "sha256_hash",         // Code hashé
  "phone": "+33612345678",            // Téléphone destination
  "verified": false,
  "attempts": 0,                      // Nombre de tentatives
  "created_at": "2025-01-15T10:00:00Z",
  "expires_at": "2025-01-15T10:05:00Z"
}
```

**Index:**
- `user_id` + `type` (compound unique)
- `expires_at` (TTL index - auto-delete après expiration)

---

## 🌍 Collection: `zone_configs`

```javascript
{
  "id": "uuid-v4",                    // Identifiant unique
  "zone_name": "Afrique de l'Ouest",  // Nom de la zone
  
  // Pays inclus
  "countries": ["SN", "CI", "ML", "BF"],
  
  // Devises supportées
  "currencies": ["XOF", "EUR"],
  
  // Moyens de paiement autorisés
  "payment_methods": ["orange_money", "wave", "mtn_momo", "bank_transfer"],
  
  // Paramètres financiers
  "transfer_fees_percent": 1.5,       // Frais en %
  "min_transfer_amount": 100,         // Minimum transfert
  "max_transfer_amount": 5000000,     // Maximum transfert
  "daily_limit": 10000000,            // Limite quotidienne
  
  // Banques partenaires
  "partner_banks": ["CBAO", "SGBS", "Ecobank"],
  
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Index:**
- `id` (unique)
- `countries`
- `is_active`

---

## 🔔 Collection: `push_notifications`

```javascript
{
  "id": "uuid-v4",
  "user_id": "user_uuid",
  "type": "push",
  "title": "Transfert reçu",
  "body": "Vous avez reçu 100 EUR de jean@email.com",
  "data": {                           // Données supplémentaires
    "transaction_id": "tx_uuid",
    "action": "view_transaction"
  },
  "read": false,
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Index:**
- `user_id`
- `read`
- `created_at`

---

## 📧 Collection: `notifications` (Email/SMS logs)

```javascript
{
  "id": "uuid-v4",
  "type": "email | sms",
  "to": "user@email.com | +33612345678",
  "subject": "Confirmation de transfert",  // Pour email
  "content": "...",
  "message": "...",                   // Pour SMS
  "language": "fr",
  "status": "pending | sent | failed",
  "error": "...",                     // Si échec
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

## 💳 Collection: `payment_transactions` (Sessions Stripe/PayPal)

```javascript
{
  "id": "uuid-v4",
  "session_id": "cs_xxx",             // ID session Stripe/PayPal
  "transaction_id": "tx_uuid",        // Référence transaction
  "user_id": "user_uuid",
  "amount": 100.00,
  "currency": "EUR",
  "payment_status": "pending | paid | failed",
  "provider": "stripe | paypal",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

## 📋 Collection: `admin_logs` (Audit Trail)

```javascript
{
  "id": "uuid-v4",
  "admin_id": "admin_uuid",           // Admin qui a fait l'action
  "action": "create_user | update_user | delete_user | 
             credit_account | debit_account | 
             approve_document | reject_document |
             approve_withdrawal | reject_withdrawal |
             create_zone | update_zone",
  "target_type": "user | wallet | transaction | document | zone",
  "target_id": "target_uuid",
  "details": {                        // Détails de l'action
    "old_value": {...},
    "new_value": {...}
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Index:**
- `admin_id`
- `action`
- `target_type`
- `created_at`

---

## 🌐 Collection: `translations` (Optionnel - pour admin modifiable)

```javascript
{
  "id": "uuid-v4",
  "key": "welcome_message",           // Clé de traduction
  "language": "fr",
  "value": "Bienvenue sur SB Pay",
  "category": "general | auth | transactions | errors",
  "updated_by": "admin_uuid",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

## 💱 Collection: `exchange_rates` (Taux de change)

```javascript
{
  "id": "uuid-v4",
  "base_currency": "EUR",
  "rates": {
    "USD": 1.08,
    "XOF": 655.96,
    "GBP": 0.86,
    "MAD": 10.85,
    "NGN": 1650.00
  },
  "source": "exchangerate-api.com",
  "fetched_at": "2025-01-15T00:00:00Z",
  "valid_until": "2025-01-16T00:00:00Z"
}
```

---

## 📊 Relations entre collections

```
users (1) ──────────── (N) wallets
  │                         │
  │                         │
  ├─── (N) bank_accounts    │
  │                         │
  ├─── (N) kyc_documents    │
  │                         │
  ├─── (N) transactions ◄───┘
  │
  ├─── (N) push_notifications
  │
  └─── (N) otp_codes

zone_configs ──── configure ──── payment_methods + currencies + countries

admin_logs ──── track ──── all admin actions
```

---

## 🔧 Index recommandés MongoDB

```javascript
// users
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "id": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "kyc_status": 1 })

// wallets
db.wallets.createIndex({ "user_id": 1, "currency": 1 }, { unique: true })
db.wallets.createIndex({ "id": 1 }, { unique: true })

// transactions
db.transactions.createIndex({ "user_id": 1 })
db.transactions.createIndex({ "created_at": -1 })
db.transactions.createIndex({ "status": 1 })
db.transactions.createIndex({ "type": 1 })

// bank_accounts
db.bank_accounts.createIndex({ "user_id": 1 })
db.bank_accounts.createIndex({ "iban": 1 })

// otp_codes - TTL index (auto-suppression)
db.otp_codes.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 })

// notifications
db.push_notifications.createIndex({ "user_id": 1, "read": 1 })
db.push_notifications.createIndex({ "created_at": -1 })
```
