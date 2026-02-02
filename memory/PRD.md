# SB Pay - Product Requirements Document

## Project Overview
**Name:** SB Pay  
**Type:** Online Payment System (PayPal-like Fintech Platform)  
**Created:** December 2025  
**Last Updated:** February 2026  
**Stack:** React + FastAPI + MongoDB  
**Preview URL:** https://moneyhub-sb.preview.emergentagent.com

## Features Summary

### ✅ COMPLETED FEATURES

#### Core Payment Features
- [x] Multi-currency wallets (12 currencies: EUR, USD, XOF, etc.)
- [x] P2P transfers between users (by email)
- [x] **P2P transfers via phone number**
- [x] Bank transfers
- [x] Deposits (Stripe REAL, PayPal/MM DEMO)
- [x] Withdrawals
- [x] Transaction history with PDF receipts
- [x] Exchange rate conversion

#### 🔑 Connexion Rapide par PIN (NEW - Feb 2026)
- [x] **Configuration du PIN**
  - PIN 4-6 chiffres personnalisé
  - Vérification du mot de passe actuel requise
  - Device token sécurisé généré (valide 30 jours)
  - Hashage SHA256 avec salt
- [x] **Connexion rapide**
  - Page /quick-login dédiée
  - Affichage du nom utilisateur masqué
  - Saisie PIN avec indicateur visuel (dots)
  - Verrouillage après 5 tentatives (30 min)
- [x] **Gestion dans Paramètres**
  - Section dédiée dans /settings
  - Modifier le PIN (avec vérification PIN actuel)
  - Désactiver le PIN
  - Statut et dernière utilisation visibles
- [x] **Intégration Login Page**
  - Bouton "Connexion rapide avec PIN" si device configuré
  - Navigation fluide vers /quick-login

#### 💳 Cartes Virtuelles
- [x] **Création de cartes virtuelles**
  - Génération instantanée VISA/Mastercard
  - Numéro, CVV, expiration (affichés une seule fois)
  - Choix de devise et limites personnalisables
- [x] **Paiements simulés (Mode DEMO)**
  - Paiements en ligne
  - Paiements sans contact (NFC)
- [x] **Gestion complète**
  - Bloquer/Débloquer instantanément
  - Modifier les limites (journalière, par transaction)
  - Activer/Désactiver paiements en ligne ou sans contact
  - Historique des transactions par carte
  - Supprimer la carte
- [x] **Sécurité**
  - Limites basées sur statut KYC
  - Numéro masqué après création (**** 7140)
  - OTP pour transactions élevées (prévu)

#### 🔔 Notifications par Zone/Pays (Admin)
- [x] **Ciblage géographique**
  - 10 pays africains (SN, CI, ML, BF, BJ, TG, CM, GH, NG) + France
  - Zones/villes par pays
  - Types d'utilisateurs (standard, commerçant, premium)
- [x] **Multi-canaux (Mode DEMO)**
  - Push App (actif)
  - SMS, Email, WhatsApp (simulés)
- [x] **Gestion des campagnes**
  - Envoi immédiat ou programmé
  - Priorités (basse, normale, haute, urgente)
  - Lien personnalisé
- [x] **Statistiques**
  - Total campagnes, envoyées, programmées
  - Utilisateurs atteints
  - Historique avec détails

#### 🔐 Coffre-Fort SB Pay (NEW)
- [x] **Sécurisation de l'argent**
  - Coffre-fort séparé du wallet principal
  - PIN à 6 chiffres obligatoire
  - Hashage SHA256 du PIN
- [x] **Opérations**
  - Dépôt depuis wallet vers coffre-fort
  - Retrait du coffre-fort vers wallet
  - Historique des transactions
- [x] **Limites basées sur KYC**
  - Unverified: max 500K, retrait/jour 50K
  - Pending: max 2M, retrait/jour 200K
  - Verified: max 50M, retrait/jour 5M
- [x] **Sécurité**
  - Verrouillage après 5 tentatives PIN échouées
  - Délai de 30 minutes avant déblocage
  - Notifications à chaque opération

#### 📨 Centre d'Aide / Contact (NEW)
- [x] **Création de tickets**
  - 6 catégories (technique, transaction, compte, sécurité, suggestion, autre)
  - 4 niveaux de priorité
  - Suivi par numéro de ticket (TKT-XXXXXXXX)
- [x] **Conversation**
  - Messages utilisateur <-> support
  - Historique complet
- [x] **Gestion Admin**
  - Liste tous les tickets
  - Filtres (statut, priorité, recherche)
  - Changer statut (ouvert, en cours, résolu, fermé)
  - Répondre aux tickets
- [x] **Notifications**
  - Confirmation création ticket
  - Notification nouvelle réponse

#### 📱 Transferts entre Utilisateurs SB Pay
- [x] **Recherche par numéro de téléphone**
  - Validation utilisateur SB Pay
  - Nom masqué pour confidentialité (Test U.)
  - Numéro masqué (***4567)
- [x] **Transferts P2P gratuits**
  - 0% frais entre utilisateurs
  - Instantané
  - Multi-devises (XOF, EUR, USD)
- [x] **Sécurité renforcée**
  - OTP SMS pour montants > 100,000 XOF
  - Limites journalières par statut KYC
  - Max 500,000 XOF par transaction
- [x] **Contacts récents**
  - Historique des destinataires
  - Sélection rapide
- [x] **Historique P2P**
  - Transferts envoyés/reçus
  - Direction (sent/received)

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

### Database Collections (40+)
users, wallets, cards, bank_accounts, banks, mobile_money_accounts, mobile_money_providers, transactions, currencies, languages, zones, zone_payment_methods, documents, admin_logs, exchange_rates, payment_transactions, payment_gateways, payment_links, qr_payments, rewards, rewards_history, app_settings, **mobile_money_transfers**, **airtime_topups**, **bill_payments**, **beneficiaries**, **scheduled_transfers**, **disputes**, **fee_configurations**, **transaction_limits**, **p2p_transfers**, **pending_p2p_transfers**, **virtual_cards**, **card_transactions**, **card_activity_logs**, **notifications_campaigns**, **notification_logs**, **vaults**, **vault_transactions**, **vault_activity_logs**, **support_tickets**, **admin_notifications**, **quick_logins**, **security_logs**

## Test Credentials
- **Admin:** admin@sbpay.com / adminpassword
- **User:** user@sbpay.com / userpassword (vault PIN: 123456, Quick PIN: 1234)
- **User 2:** test@sbpay.com / testpassword (phone: +221771234567)

## API Endpoints (120+)
See /app/docs/API_REFERENCE.md for complete list

### Quick PIN Login APIs (NEW - Feb 2026)
- `GET /api/auth/quick-pin/status` - Statut du PIN (activé, expiration, dernière utilisation)
- `POST /api/auth/quick-pin/setup` - Configurer PIN (nécessite auth + password)
- `POST /api/auth/quick-pin/login` - Connexion avec device_token + PIN
- `POST /api/auth/quick-pin/check-device` - Vérifier validité du device token
- `POST /api/auth/quick-pin/change` - Modifier PIN (avec PIN actuel)
- `POST /api/auth/quick-pin/disable` - Désactiver PIN

### Vault APIs
- `GET /api/vault/balance` - Solde et limites du coffre-fort
- `POST /api/vault/set-pin` - Définir/modifier PIN
- `POST /api/vault/verify-pin` - Vérifier PIN
- `POST /api/vault/deposit` - Déposer depuis wallet
- `POST /api/vault/withdraw` - Retirer vers wallet
- `GET /api/vault/transactions` - Historique transactions coffre-fort

### Contact/Support APIs (NEW)
- `GET /api/contact/categories` - Catégories et priorités
- `POST /api/contact/submit` - Créer ticket
- `GET /api/contact/tickets` - Mes tickets (utilisateur)
- `GET /api/contact/tickets/{id}` - Détails ticket
- `POST /api/contact/tickets/{id}/reply` - Répondre au ticket
- `GET /api/contact/admin/tickets` - Tous les tickets (admin)
- `GET /api/contact/admin/tickets/{id}` - Détails ticket (admin)
- `POST /api/contact/admin/tickets/{id}/reply` - Réponse admin
- `PUT /api/contact/admin/tickets/{id}/status` - Changer statut

### Virtual Cards APIs
- `POST /api/virtual-card/create` - Créer une carte virtuelle
- `GET /api/virtual-card/list` - Lister les cartes
- `GET /api/virtual-card/{id}` - Détails d'une carte
- `POST /api/virtual-card/block` - Bloquer/Débloquer carte
- `POST /api/virtual-card/limit` - Modifier limites
- `POST /api/virtual-card/simulate-payment` - Simuler paiement (DEMO)
- `POST /api/virtual-card/toggle-feature/{id}` - Activer/désactiver features
- `GET /api/virtual-card/transactions/{id}` - Historique transactions carte
- `DELETE /api/virtual-card/{id}` - Supprimer carte

### Notifications Zone APIs (NEW - Admin)
- `GET /api/notifications/zones` - Liste pays/zones disponibles
- `GET /api/notifications/filter-users` - Filtrer utilisateurs par zone
- `POST /api/notifications/send` - Envoyer notification ciblée
- `GET /api/notifications/history` - Historique campagnes
- `GET /api/notifications/stats/overview` - Statistiques
- `GET /api/notifications/{id}` - Détails notification
- `POST /api/notifications/cancel/{id}` - Annuler notification programmée

### P2P User Transfer APIs
- `GET /api/wallet/users/lookup-phone` - Recherche utilisateur par téléphone
- `POST /api/wallet/transfer-phone` - Créer un transfert P2P
- `POST /api/wallet/transfer-phone/verify` - Vérifier OTP et compléter transfert
- `GET /api/wallet/transfer-phone/history` - Historique des transferts P2P
- `GET /api/wallet/transfer-phone/contacts` - Contacts récents

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
│   ├── routes/
│   │   ├── wallet_transfers.py (P2P transfers)
│   │   ├── virtual_cards.py (Virtual cards)
│   │   ├── notifications_zone.py (Admin notifications)
│   │   ├── vault.py (NEW - Coffre-fort)
│   │   ├── contact.py (NEW - Support tickets)
│   │   ├── africa_module.py
│   │   ├── admin_advanced.py
│   │   ├── analytics.py
│   │   └── alerts.py
│   └── services/db_init.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── UserTransferPage.jsx (P2P transfers)
│       │   ├── VirtualCardsPage.jsx (Virtual cards)
│       │   ├── VaultPage.jsx (NEW - Coffre-fort)
│       │   ├── HelpCenterPage.jsx (NEW - Centre d'aide)
│       │   ├── QRPaymentPage.jsx
│       │   ├── RewardsPage.jsx
│       │   ├── PaymentLinksPage.jsx
│       │   ├── ProfilePage.jsx
│       │   └── admin/
│       │       ├── AdminNotificationsPage.jsx
│       │       ├── AdminTicketsPage.jsx (NEW - Gestion tickets)
│       │       ├── AdminAnalyticsPage.jsx
│       │       ├── AdminAlertsPage.jsx
│       │       └── ...
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
