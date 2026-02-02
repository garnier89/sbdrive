# SB Pay - Product Requirements Document

## Project Overview
**Name:** SB Pay  
**Type:** Online Payment System (PayPal-like)  
**Created:** December 2025  
**Last Updated:** February 2026  
**Stack:** React + FastAPI + MongoDB  
**Preview URL:** https://paynow-52.preview.emergentagent.com

## Original Problem Statement
Générer un système de paiement en ligne tel que PayPal tout le système complet le nom c'est SB Pay avec une application et le site internet, une application complète avec les accès administrateur et les accès clients, fond de couleur orange mat avec le logo SB qui est téléchargé, plus les balises de téléchargement play store et apple store.

## User Personas
1. **Client Standard** - Utilisateurs souhaitant envoyer/recevoir de l'argent et payer des factures
2. **Administrateur** - Gestionnaires de la plateforme avec accès complet aux outils de gestion

## Database Schema (18 Collections)
1. **users** - User accounts with first_name, last_name, status, default_currency
2. **wallets** - Multi-currency wallets per user
3. **cards** - Saved payment cards (Stripe tokens)
4. **bank_accounts** - Linked bank accounts
5. **banks** - Bank directory (33 banks across 9 countries)
6. **mobile_money_accounts** - User's mobile money accounts
7. **mobile_money_providers** - Provider directory (Orange, MTN, Wave, Moov, M-Pesa, Airtel)
8. **transactions** - All financial transactions with type, method, fees
9. **currencies** - 12 active currencies
10. **languages** - 8 supported languages
11. **zones** - Geographic zones (17 countries)
12. **zone_payment_methods** - Payment methods per zone with fees
13. **documents** - KYC documents
14. **admin_logs** - Admin action audit trail
15. **exchange_rates** - Currency conversion rates
16. **payment_transactions** - Stripe/PayPal payment tracking
17. **payment_gateways** - Admin payment gateway configurations
18. **payment_links** - Shareable payment links
19. **app_settings** - Application settings (support, etc.)

## Implemented Features

### ✅ User Profile (NEW)
- Personal information management (first_name, last_name, phone, country)
- Language and currency preferences
- Security settings (password change, 2FA setup)
- Linked payments overview (cards, bank accounts, mobile money)
- KYC document management

### ✅ Payment Gateways Admin (NEW)
- Admin configuration for: Stripe, PayPal, Orange Money, MTN, Wave, Moov Money, Flutterwave
- Enable/disable per gateway
- API key management (encrypted)
- Webhook URL configuration
- Supported currencies per gateway

### ✅ Payment Links (NEW)
- Create shareable payment links
- Set amount, currency, description, expiration
- Pay via wallet or card
- Track link status (active, paid, expired, cancelled)
- API: POST/GET/DELETE /payment-links, POST /payment-links/{id}/pay

### ✅ WhatsApp Support (NEW)
- Floating WhatsApp button on all pages
- Direct contact via WhatsApp Business
- Configurable phone number and message

### ✅ Chat Support (Ready for Tawk.to)
- Tawk.to integration ready
- Configurable via admin settings
- Free live chat support

### Core Features
- [x] JWT-based authentication
- [x] Multi-currency wallets (12 currencies)
- [x] P2P transfers
- [x] Bank transfers
- [x] Stripe deposits (REAL with test key)
- [x] PayPal deposits (DEMO)
- [x] Mobile Money (DEMO)
- [x] Transaction history
- [x] 8 languages support
- [x] Admin dashboard with stats
- [x] User management
- [x] KYC document management
- [x] Geographic zone configuration

## API Endpoints

### User Profile
- `GET/PUT /api/user/profile` - Profile management
- `PUT /api/user/password` - Change password
- `POST /api/user/avatar` - Upload avatar
- `GET /api/documents/my` - Get user's documents
- `POST /api/documents/upload` - Upload KYC document

### Payment Links
- `POST /api/payment-links` - Create payment link
- `GET /api/payment-links` - List user's payment links
- `GET /api/payment-links/{id}` - Get link details (public)
- `POST /api/payment-links/{id}/pay` - Pay a link
- `DELETE /api/payment-links/{id}` - Cancel a link

### Admin - Payment Gateways
- `GET /api/admin/payment-gateways` - List all gateways
- `GET /api/admin/payment-gateways/{id}` - Get gateway config
- `PUT /api/admin/payment-gateways/{id}` - Update gateway config

### Support Settings
- `GET /api/support/settings` - Get public support settings
- `PUT /api/admin/support/settings` - Update support settings (admin)

## Test Credentials
- **Admin:** admin@sbpay.com / adminpassword
- **User:** user@sbpay.com / userpassword

## Current Status

### ✅ Real Integrations
- Stripe payments (test key active)

### ⚠️ Demo/Simulated
- PayPal
- Mobile Money (Orange, MTN, Wave, Moov)
- Twilio SMS (2FA)

### 🔧 Ready for Configuration
- WhatsApp Business (need actual business number)
- Tawk.to Chat (need property/widget IDs)
- Live exchange rates API

## Backlog

### P0 (Next)
1. Integrate live PayPal API
2. Integrate Flutterwave for Mobile Money
3. Activate Twilio for SMS 2FA

### P1
- Push notifications
- Email notifications (Resend/SendGrid)
- PDF receipt generation

### P2
- QR Code payments
- User rewards/loyalty system
- Recurring payments

## Files Reference
- `/app/backend/server.py` - Main backend API
- `/app/frontend/src/pages/ProfilePage.jsx` - User profile
- `/app/frontend/src/pages/PaymentLinksPage.jsx` - Payment links
- `/app/frontend/src/pages/PayPage.jsx` - Public payment page
- `/app/frontend/src/pages/admin/AdminGateways.jsx` - Gateway config
- `/app/frontend/src/components/ChatSupport.jsx` - WhatsApp + Tawk.to
- `/app/backend/services/db_init.py` - Database seeding
- `/app/docs/DATABASE_SCHEMA.md` - DB documentation
