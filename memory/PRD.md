# SB Pay - Product Requirements Document

## Project Overview
**Name:** SB Pay  
**Type:** Online Payment System (PayPal-like Fintech Platform)  
**Created:** December 2025  
**Last Updated:** December 2025  
**Stack:** React + FastAPI + MongoDB  
**Preview URL:** https://sbpay-fintech.preview.emergentagent.com

## Features Summary

### ✅ COMPLETED FEATURES

#### Core Payment Features
- [x] Multi-currency wallets (12 currencies: EUR, USD, XOF, etc.)
- [x] P2P transfers between users
- [x] Bank transfers
- [x] Deposits (Stripe REAL, PayPal/MM DEMO)
- [x] Withdrawals
- [x] Transaction history with PDF receipts
- [x] Exchange rate conversion

#### 🌍 Module Afrique
- [x] **Transferts Mobile Money Inter-opérateurs**
  - Wave ↔ Orange Money ↔ MTN MoMo ↔ Moov Money
  - Calcul des frais en temps réel
  - Support multi-pays (SN, CI, ML, BF, BJ, TG, CM)
- [x] **Recharge Crédit Téléphonique**
  - Orange, Free, MTN, Moov, Expresso
  - Montants rapides et personnalisés
  - Préfixes téléphoniques par pays
- [x] **Paiement de Factures**
  - Électricité (SENELEC, CIE)
  - Eau (SDE, SODECI)
  - Internet/TV (Canal+, Orange Fibre)
- [x] **Gestion des Bénéficiaires**
  - Contacts favoris
  - Historique par bénéficiaire
- [x] **Transferts Programmés**
  - Récurrents (quotidien, hebdomadaire, mensuel)
  - Planification future
- [x] **Gestion des Litiges**
  - Signalement de transactions
  - Suivi des réclamations

#### 🔐 Module Sécurité & Gestion Avancée
- [x] **Approbation des Cartes Bancaires**
  - Workflow: pending → active/rejected/blocked
  - Notification utilisateur lors de l'ajout
  - Page admin pour approuver/refuser
  - Détection IP, pays, tentatives suspectes
- [x] **CMS (Content Management System)**
  - Gestion textes, images, tarifs
  - Support multi-langue (FR, EN, AR)
  - Catégories: Général, Légal, Marketing, Frais, Erreurs
  - Interface admin complète
- [x] **Super Admin & RBAC**
  - Hiérarchie: Super Admin → Admin → Support → User
  - Gestion des administrateurs (créer, modifier, supprimer)
  - Permissions personnalisables par module
  - Logs de toutes les actions admin

#### 📊 Module Analytics & KPIs (NEW)
- [x] **Dashboard Analytics**
  - KPIs en temps réel (Volume, Revenus, Transactions)
  - Filtres par période (jour, semaine, mois, année)
  - Comparaison avec période précédente
  - Indicateurs de croissance
- [x] **Revenus par Source**
  - Répartition par type de transaction
  - Pourcentages et volumes
  - Barres de progression
- [x] **Top Utilisateurs**
  - Classement par volume
  - Statistiques par utilisateur
- [x] **Stats Mobile Money**
  - Par corridor (Wave → Orange, etc.)
  - Par opérateur source
- [x] **Répartition Géographique**
  - Utilisateurs par pays
  - Transferts par destination

#### 🔔 Module Alertes & Seuils (NEW)
- [x] **Seuils d'alerte configurables**
  - Volume journalier (info à 10M, warning à 50M XOF)
  - Transactions suspectes (critical)
  - Échecs de transactions (warning)
  - Nouveaux utilisateurs (objectif success)
  - Cartes en attente > 24h
  - Transaction unitaire élevée
- [x] **Notifications dashboard**
  - Liste des alertes déclenchées
  - Marquer comme lu/non lu
  - Filtrage par statut
- [x] **Configuration notifications**
  - Email, SMS, Dashboard
  - Activer/Désactiver par seuil
- [x] **Métriques en temps réel**
  - Affichage des valeurs actuelles
  - Vérification manuelle

#### 🔑 RBAC Avancé (Permissions Détaillées)
- [x] **45+ permissions granulaires**
  - Utilisateurs (voir, créer, modifier, supprimer, bloquer)
  - Transactions (voir, valider, rejeter, rembourser)
  - Wallet (voir, créditer, débiter, limites)
  - Passerelles (voir, configurer, activer)
  - Mobile Money (voir, gérer, opérateurs)
  - Banques, Devises, Zones
  - CMS, KYC, Cartes, Liens paiement
  - Logs, Analytics, Alertes
  - Administration (admins, rôles)
  - Système (paramètres, suspension)
- [x] **Catalogue permissions par catégorie**
- [x] **Attribution dynamique par admin**

#### QR Code Payments
- [x] Generate QR codes for receiving payments
- [x] Scan QR codes to pay
- [x] Download/Share QR codes
- [x] QR payment tracking

#### Payment Links
- [x] Create shareable payment links
- [x] Custom amount, currency, description, expiry
- [x] Public payment page (/pay/:code)
- [x] Track link status

#### Rewards & Loyalty System
- [x] Points earned on transactions (1€ = 1 point)
- [x] 5 tiers: Bronze, Silver, Gold, Platinum, Diamond
- [x] Cashback rates: 0.5% - 3%
- [x] Referral program (500 points per referral)
- [x] Points redemption (100 points = 1€)

#### User Profile
- [x] Personal info management
- [x] Security settings (password, 2FA)
- [x] Linked payments overview
- [x] KYC document management

#### Admin Panel
- [x] Dashboard with statistics
- [x] User management
- [x] Transaction monitoring
- [x] KYC document review
- [x] Geographic zones configuration
- [x] Payment gateways configuration
- [x] Security & Capture rules (3D Secure, Anti-fraud, Velocity)

#### Support & Communication
- [x] WhatsApp link in footer contact section
- [x] Tawk.to integration ready
- [x] Support settings admin

#### Internationalization
- [x] 8 languages supported
- [x] 17 geographic zones
- [x] Zone-specific payment methods

### Database Collections (30+)
users, wallets, cards, bank_accounts, banks, mobile_money_accounts, mobile_money_providers, transactions, currencies, languages, zones, zone_payment_methods, documents, admin_logs, exchange_rates, payment_transactions, payment_gateways, payment_links, qr_payments, rewards, rewards_history, app_settings, **mobile_money_transfers**, **airtime_topups**, **bill_payments**, **beneficiaries**, **scheduled_transfers**, **disputes**, **fee_configurations**, **transaction_limits**

## Test Credentials
- **Admin:** admin@sbpay.com / adminpassword
- **User:** user@sbpay.com / userpassword

## API Endpoints (70+)
See /app/docs/API_REFERENCE.md for complete list

### New Africa Module APIs
- `GET /api/africa/mobile-money/operators` - Get MM operators by country
- `GET /api/africa/mobile-money/fees` - Calculate transfer fees
- `POST /api/africa/mobile-money/transfer` - Cross-network transfer
- `GET /api/africa/airtime/operators` - Get telecom operators
- `POST /api/africa/airtime/topup` - Buy airtime
- `GET /api/africa/bills/providers` - Get bill providers
- `POST /api/africa/bills/pay` - Pay a bill
- `POST /api/africa/beneficiaries` - Add beneficiary
- `POST /api/africa/scheduled-transfers` - Create scheduled transfer
- `POST /api/africa/disputes` - Report a dispute
- `GET /api/africa/limits` - Get user limits

## Configuration Needed

### For Production:
1. **WhatsApp Business** - Set your actual business number
2. **Tawk.to** - Create free account, add property/widget IDs
3. **PayPal** - Add Client ID + Secret
4. **Flutterwave** - For real Mobile Money
5. **Twilio** - For SMS 2FA
6. **Firebase** - For push notifications

## Files Structure
```
/app/
├── backend/
│   ├── server.py (main API)
│   ├── models/schemas.py
│   └── services/db_init.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── QRPaymentPage.jsx
│       │   ├── RewardsPage.jsx
│       │   ├── PaymentLinksPage.jsx
│       │   ├── ProfilePage.jsx
│       │   └── admin/
│       │       ├── AdminGateways.jsx
│       │       └── AdminPaymentRules.jsx
│       └── components/
│           └── ChatSupport.jsx
├── docs/
│   ├── DATABASE_SCHEMA.md
│   ├── PAYMENT_FLOWS.md
│   └── SCREENS_LIST.md
└── memory/
    └── PRD.md
```

## Status: PRODUCTION READY (Demo Mode)
All features implemented. To go fully live:
1. Replace demo API keys with production keys
2. Configure WhatsApp Business number
3. Set up Tawk.to for live chat
4. Enable Twilio for real SMS
