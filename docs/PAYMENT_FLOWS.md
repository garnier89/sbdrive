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


### 5. 🏦 Retrait Wallet → Banque

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│ Backend  │───▶│  Sécurité │───▶│  Payout  │───▶│  Banque  │
│          │    │/withdraw │    │  Checks   │    │   API    │    │  Client  │
└──────────┘    └──────────┘    └───────────┘    └──────────┘    └──────────┘
     │               │                │                │               │
     │ 1. Demande retrait             │                │               │
     │──────────────▶│                │                │               │
     │               │                │                │               │
     │               │ 2. Vérification sécurité        │               │
     │               │───────────────▶│                │               │
     │               │                │                │               │
     │               │                │ 3. KYC + Limites               │
     │               │                │──────────────▶ │               │
     │               │                │                │               │
     │               │ 4. Débite wallet               │               │
     │               │◀───────────────│                │               │
     │               │                │                │               │
     │               │                │ 5. Initie payout               │
     │               │                │───────────────▶│               │
     │               │                │                │               │
     │               │                │                │ 6. Transfert  │
     │               │                │                │──────────────▶│
     │               │                │                │               │
     │               │                │ 7. Webhook confirmation        │
     │               │◀───────────────────────────────│               │
     │               │                │                │               │
     │ 8. Statut mis à jour          │                │               │
     │◀──────────────│                │                │               │
```

**États du retrait :**
```
PENDING → PROCESSING → SENT → COMPLETED
                    ↘ FAILED (si erreur)
```

### 6. 📲 Paiement par QR Code

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Vendeur  │    │  Client  │    │ Backend  │    │ Vendeur  │
│(Génère QR│    │(Scan QR) │    │          │    │(Reçoit)  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │                │               │
     │ 1. Génère QR avec montant      │               │
     │───────────────────────────────▶│               │
     │               │                │               │
     │ 2. Affiche QR Code             │               │
     │◀───────────────────────────────│               │
     │               │                │               │
     │ 3. Client scanne le QR         │               │
     │──────────────▶│                │               │
     │               │                │               │
     │               │ 4. Décode et valide            │
     │               │───────────────▶│               │
     │               │                │               │
     │               │ 5. Confirme paiement           │
     │               │───────────────▶│               │
     │               │                │               │
     │               │                │ 6. Transfert  │
     │               │                │──────────────▶│
     │               │                │               │
     │               │ 7. Confirmation│               │
     │               │◀───────────────│──────────────▶│
```

---

## 🔐 Contrôles de Sécurité Détaillés

### À chaque transaction :

```
┌─────────────────────────────────────────────────────────────┐
│                    PIPELINE SÉCURITÉ                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. AUTHENTIFICATION                                         │
│     └─▶ JWT Token valide ?                                   │
│         └─▶ Session active ?                                 │
│             └─▶ Device reconnu ?                             │
│                                                              │
│  2. KYC (si montant élevé)                                   │
│     └─▶ Documents vérifiés ?                                 │
│         └─▶ Niveau KYC suffisant ?                           │
│             └─▶ Pas de blocage admin ?                       │
│                                                              │
│  3. ANTI-FRAUDE                                              │
│     └─▶ Velocity check (transactions/heure)                  │
│         └─▶ Géolocalisation cohérente ?                      │
│             └─▶ Montant inhabituel ?                         │
│                 └─▶ Bénéficiaire suspect ?                   │
│                                                              │
│  4. LIMITES                                                  │
│     └─▶ Limite quotidienne respectée ?                       │
│         └─▶ Limite mensuelle respectée ?                     │
│             └─▶ Limite par transaction OK ?                  │
│                                                              │
│  5. LOGS                                                     │
│     └─▶ Enregistrement admin_logs                            │
│         └─▶ IP, Device, Timestamp                            │
│             └─▶ Résultat transaction                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Niveaux de KYC :

| Niveau | Documents | Limite Jour | Limite Mois |
|--------|-----------|-------------|-------------|
| Niveau 0 | Aucun | 50€ | 200€ |
| Niveau 1 | Email vérifié | 500€ | 2,000€ |
| Niveau 2 | Pièce d'identité | 5,000€ | 20,000€ |
| Niveau 3 | ID + Justificatif domicile | 50,000€ | 200,000€ |

---

## 🧠 Résumé Simplifié des Flux

| Action | L'argent va de... | ...vers |
|--------|-------------------|---------|
| 💳 Paiement carte | Banque client → Passerelle | → Wallet |
| 📱 Mobile money | Compte mobile → Passerelle | → Wallet |
| 🔄 Transfert P2P | Wallet envoyeur | → Wallet destinataire |
| 💼 Wallet paye | Wallet client | → Marchand |
| 🏦 Retrait | Wallet | → Banque client |
| 🔗 Lien paiement | Payeur (carte/MM/wallet) | → Wallet créateur |
| 📲 QR Code | Wallet scanner | → Wallet vendeur |

---

## 💬 Notifications par Événement

```
                    ┌─────────────────┐
                    │   TRANSACTION   │
                    │    VALIDÉE      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    ┌───────────┐      ┌───────────┐      ┌───────────┐
    │   EMAIL   │      │    SMS    │      │ WHATSAPP  │
    │           │      │  (si 2FA) │      │           │
    └───────────┘      └───────────┘      └───────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌───────────────────────────────────────────────┐
    │              PUSH NOTIFICATION                 │
    │            (App mobile future)                 │
    └───────────────────────────────────────────────┘
```

---

## 🎯 Points Clés pour les Développeurs

### ✅ Ce qu'il faut retenir :

1. **Wallet crédité UNIQUEMENT après webhook** - Jamais sur intention de paiement
2. **Tous les flux passent par le Backend** - Jamais de client-to-gateway direct
3. **Logs obligatoires** - Chaque transaction = entrée admin_logs
4. **Idempotence** - Un webhook peut arriver plusieurs fois
5. **Rollback** - Prévoir annulation si étape échoue

### ⚠️ Pièges à éviter :

- Ne jamais créditer avant confirmation webhook
- Toujours vérifier signature des webhooks
- Ne pas exposer les clés API côté frontend
- Vérifier les montants (pas de négatifs !)
- Gérer les timeouts des passerelles

### 📁 Fichiers concernés :

| Flux | Backend | Frontend |
|------|---------|----------|
| Carte Stripe | `/api/deposit/stripe-*` | `DepositPage.jsx` |
| Mobile Money | `/api/deposit/mobile-money` | `DepositPage.jsx` |
| Transfert | `/api/transfers` | `TransferPage.jsx` |
| Lien paiement | `/api/payment-links` | `PaymentLinksPage.jsx`, `PayPage.jsx` |
| QR Code | `/api/qr-codes` | `QRPaymentPage.jsx` |
| Retrait | `/api/withdrawals` | `WithdrawPage.jsx` |

---

*Document mis à jour : Décembre 2025*
