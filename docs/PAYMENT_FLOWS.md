# SB Pay - Diagramme des Flux de Paiement

## Vue d'Ensemble du Circuit d'Argent

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SB PAY - FLUX DE PAIEMENT                          │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │   CLIENT     │
                                    │  (Payeur)    │
                                    └──────┬───────┘
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            │                              │                              │
            ▼                              ▼                              ▼
    ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
    │    CARTE      │           │ MOBILE MONEY  │           │    WALLET     │
    │  BANCAIRE     │           │               │           │   SB PAY      │
    └───────┬───────┘           └───────┬───────┘           └───────┬───────┘
            │                           │                           │
            ▼                           ▼                           │
    ┌───────────────┐           ┌───────────────┐                   │
    │    STRIPE     │           │  FLUTTERWAVE  │                   │
    │   CHECKOUT    │           │  (Agrégateur) │                   │
    │  + 3D Secure  │           │               │                   │
    └───────┬───────┘           └───────┬───────┘                   │
            │                           │                           │
            │                           ├───────────────┐           │
            │                           │               │           │
            │                           ▼               ▼           │
            │                   ┌─────────────┐ ┌─────────────┐     │
            │                   │   ORANGE    │ │    MTN      │     │
            │                   │   MONEY     │ │   MOMO      │     │
            │                   └──────┬──────┘ └──────┬──────┘     │
            │                          │               │            │
            │                          └───────┬───────┘            │
            │                                  │                    │
            └──────────────────────────────────┼────────────────────┘
                                               │
                                               ▼
                                    ┌───────────────────┐
                                    │   WEBHOOK / API   │
                                    │   CONFIRMATION    │
                                    └─────────┬─────────┘
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │   SB PAY BACKEND  │
                                    │                   │
                                    │  ┌─────────────┐  │
                                    │  │  Validation │  │
                                    │  │  Sécurité   │  │
                                    │  │  Anti-Fraud │  │
                                    │  └──────┬──────┘  │
                                    │         │         │
                                    │         ▼         │
                                    │  ┌─────────────┐  │
                                    │  │   MongoDB   │  │
                                    │  │  Wallets    │  │
                                    │  │Transactions │  │
                                    │  └─────────────┘  │
                                    └─────────┬─────────┘
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │   DESTINATAIRE    │
                                    │   (Wallet crédité)│
                                    └───────────────────┘
```

## Flux Détaillés

### 1. 💳 Dépôt par Carte Bancaire (Stripe)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│ Frontend │───▶│ Backend  │───▶│  Stripe  │───▶│  Webhook │
│          │    │ SB Pay   │    │ /deposit │    │ Checkout │    │ /webhook │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                                │               │               │
     │ 1. Clique "Dépôt"              │               │               │
     │────────────────────────────────▶               │               │
     │                                │               │               │
     │ 2. Crée session checkout       │               │               │
     │                                │──────────────▶│               │
     │                                │               │               │
     │ 3. Redirection Stripe          │               │               │
     │◀───────────────────────────────│◀──────────────│               │
     │                                │               │               │
     │ 4. Saisie carte + 3D Secure    │               │               │
     │───────────────────────────────────────────────▶│               │
     │                                │               │               │
     │ 5. Paiement validé             │               │               │
     │                                │               │◀──────────────│
     │                                │               │               │
     │ 6. Webhook confirmation        │               │               │
     │                                │◀──────────────────────────────│
     │                                │               │               │
     │ 7. Wallet crédité              │               │               │
     │◀───────────────────────────────│               │               │
```

### 2. 📱 Dépôt Mobile Money (Flutterwave)

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│ Backend  │───▶│Flutterwave│───▶│  Orange  │───▶│  Client  │
│          │    │  SB Pay  │    │    API    │    │  Money   │    │  Mobile  │
└──────────┘    └──────────┘    └───────────┘    └──────────┘    └──────────┘
     │               │                │                │               │
     │ 1. Initie dépôt MM             │                │               │
     │──────────────▶│                │                │               │
     │               │                │                │               │
     │ 2. Appel API Flutterwave       │                │               │
     │               │───────────────▶│                │               │
     │               │                │                │               │
     │ 3. Demande validation          │                │               │
     │               │                │───────────────▶│               │
     │               │                │                │               │
     │ 4. Push notification + PIN     │                │               │
     │               │                │                │──────────────▶│
     │               │                │                │               │
     │ 5. Client valide avec PIN      │                │               │
     │               │                │                │◀──────────────│
     │               │                │                │               │
     │ 6. Confirmation Flutterwave    │                │               │
     │               │◀───────────────│◀───────────────│               │
     │               │                │                │               │
     │ 7. Wallet crédité              │                │               │
     │◀──────────────│                │                │               │
```

### 3. 🔄 Transfert P2P (Wallet à Wallet)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Envoyeur │───▶│ Backend  │───▶│ MongoDB  │───▶│Destinat. │
│          │    │ /transfer│    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │                │               │
     │ 1. Initie transfert            │               │
     │──────────────▶│                │               │
     │               │                │               │
     │ 2. Vérifie solde               │               │
     │               │───────────────▶│               │
     │               │                │               │
     │ 3. Débite wallet envoyeur      │               │
     │               │───────────────▶│               │
     │               │                │               │
     │ 4. Crédite wallet destinataire │               │
     │               │───────────────▶│───────────────│
     │               │                │               │
     │ 5. Notification                │               │
     │◀──────────────│                │──────────────▶│
```

### 4. 🔗 Paiement par Lien

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Créateur │    │  Client  │    │ Frontend │    │ Backend  │    │ Créateur │
│ du lien  │    │ (Payeur) │    │ /pay/:id │    │          │    │ (Reçoit) │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │                │               │               │
     │ 1. Crée lien de paiement       │               │               │
     │───────────────────────────────────────────────▶│               │
     │               │                │               │               │
     │ 2. Partage URL                 │               │               │
     │──────────────▶│                │               │               │
     │               │                │               │               │
     │               │ 3. Ouvre le lien               │               │
     │               │───────────────▶│               │               │
     │               │                │               │               │
     │               │                │ 4. Charge détails              │
     │               │                │──────────────▶│               │
     │               │                │               │               │
     │               │ 5. Choisit méthode de paiement │               │
     │               │───────────────▶│               │               │
     │               │                │               │               │
     │               │                │ 6. Traite paiement             │
     │               │                │──────────────▶│               │
     │               │                │               │               │
     │               │                │               │ 7. Crédite     │
     │               │                │               │──────────────▶│
     │               │                │               │               │
     │               │ 8. Confirmation│               │               │
     │               │◀───────────────│◀──────────────│               │
```

## Règles de Sécurité

### Validation des Paiements

| Étape | Vérification | Action si échec |
|-------|--------------|-----------------|
| 1 | Authentification JWT | Refus 401 |
| 2 | Limite montant journalier | Refus + notification |
| 3 | Vérification KYC (gros montants) | Blocage + demande documents |
| 4 | Anti-fraude (vitesse, géoloc) | Blocage + alerte admin |
| 5 | 3D Secure (cartes) | Abandon transaction |

### Capture des Paiements

```
Mode Automatique : Capture immédiate après validation 3D Secure
Mode Manuel     : Autorisation puis capture manuelle par admin

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  AUTORISATION   │────▶│    EN ATTENTE   │────▶│    CAPTURE      │
│  (Validation)   │     │  (Hold funds)   │     │  (Débit réel)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
    3D Secure OK          Admin review            Funds transferred
```

## Frais par Canal

| Canal | Frais SB Pay | Frais Passerelle | Total |
|-------|--------------|------------------|-------|
| Wallet → Wallet | 0% | 0% | **0%** |
| Carte → Wallet | 1.5% | 1.4% + 0.25€ | **~3%** |
| Mobile Money → Wallet | 1% | 1-2% | **~2-3%** |
| Wallet → Banque | 1% | Variable | **~1.5%** |

## Notifications

| Événement | Email | SMS | Push | WhatsApp |
|-----------|-------|-----|------|----------|
| Dépôt reçu | ✅ | ✅ | ✅ | ✅ |
| Transfert envoyé | ✅ | ❌ | ✅ | ❌ |
| Transfert reçu | ✅ | ✅ | ✅ | ✅ |
| Paiement lien | ✅ | ❌ | ✅ | ❌ |
| Alerte sécurité | ✅ | ✅ | ✅ | ✅ |
| KYC validé | ✅ | ✅ | ✅ | ❌ |
