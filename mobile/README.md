# SB Money Mobile - Guide de Génération APK/IPA

## 📱 Structure du Projet

```
/app/mobile/
├── App.js                    # Point d'entrée
├── package.json              # Dépendances
├── src/
│   ├── config.js             # Configuration API
│   ├── hooks/
│   │   └── useAuth.js        # Contexte auth + biométrie
│   ├── navigation/
│   │   └── AppNavigator.js   # Navigation (Stack + Tabs)
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js      # Connexion (email/PIN/biométrie)
│   │   │   ├── RegisterScreen.js   # Inscription
│   │   │   └── QuickPinScreen.js   # Connexion PIN rapide
│   │   └── main/
│   │       ├── DashboardScreen.js  # Accueil avec solde
│   │       └── index.js            # Autres écrans (placeholder)
│   └── services/
│       ├── api.js            # Client API axios
│       ├── storage.js        # AsyncStorage wrapper
│       └── biometric.js      # Service biométrie
├── android/                  # Projet Android natif
└── ios/                      # Projet iOS natif
```

## 🔧 Prérequis

### Environnement de développement
- Node.js >= 18
- JDK 17 (pour Android)
- Android Studio avec SDK 33+
- Xcode 15+ (pour iOS, Mac uniquement)
- CocoaPods (pour iOS)

### Installation
```bash
cd /app/mobile
npm install
# ou
yarn install

# iOS uniquement
cd ios && pod install && cd ..
```

## 🤖 Génération APK Android

### 1. Initialiser le projet Android
```bash
npx react-native init SBPayMobile --version 0.73.2
# Copier les fichiers src/ dans le nouveau projet
```

### 2. Configurer la signature
Créer le fichier `android/app/my-release-key.keystore`:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias sbmoney -keyalg RSA -keysize 2048 -validity 10000
```

### 3. Configurer gradle
Ajouter dans `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=sbmoney
MYAPP_RELEASE_STORE_PASSWORD=******
MYAPP_RELEASE_KEY_PASSWORD=******
```

Modifier `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. Générer l'APK
```bash
cd android
./gradlew assembleRelease

# APK généré dans:
# android/app/build/outputs/apk/release/app-release.apk
```

### 5. Générer l'AAB (Play Store)
```bash
./gradlew bundleRelease

# AAB généré dans:
# android/app/build/outputs/bundle/release/app-release.aab
```

## 🍎 Génération IPA iOS

### 1. Prérequis
- Mac avec Xcode 15+
- Compte Apple Developer ($99/an)
- Certificat de distribution
- Profil de provisionnement

### 2. Configurer le projet
```bash
cd ios
pod install
open SBPayMobile.xcworkspace
```

### 3. Dans Xcode
1. Sélectionner "Any iOS Device" comme cible
2. Product → Archive
3. Window → Organizer → Distribute App

### 4. Via ligne de commande
```bash
# Générer l'archive
xcodebuild -workspace SBPayMobile.xcworkspace \
  -scheme SBPayMobile \
  -configuration Release \
  -archivePath build/SBPayMobile.xcarchive \
  archive

# Exporter l'IPA
xcodebuild -exportArchive \
  -archivePath build/SBPayMobile.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

## 🔐 Configuration Biométrie

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

### iOS (Info.plist)
```xml
<key>NSFaceIDUsageDescription</key>
<string>SB Money utilise Face ID pour vous connecter rapidement et en toute sécurité.</string>
```

## 📦 Distribution

### Google Play Store
1. Créer un compte développeur ($25 one-time)
2. Créer une application dans la Console Play
3. Uploader l'AAB signé
4. Remplir les informations de la fiche
5. Soumettre pour examen

### Apple App Store
1. Compte Apple Developer ($99/an)
2. Créer l'app dans App Store Connect
3. Uploader via Xcode ou Transporter
4. Remplir les métadonnées
5. Soumettre pour examen (Review 24-48h)

### TestFlight (iOS Beta)
1. Uploader l'IPA
2. Ajouter des testeurs internes/externes
3. Distribuer les builds de test

## 🎨 Personnalisation

### Icône de l'application
- Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- iOS: `ios/SBPayMobile/Images.xcassets/AppIcon.appiconset/`

### Splash Screen
Installer `react-native-bootsplash`:
```bash
yarn add react-native-bootsplash
npx react-native generate-bootsplash assets/logo.png
```

## 🔗 API Backend

L'application se connecte à:
```
https://fintech-africa-8.preview.emergentagent.com/api
```

Pour la production, modifier `src/config.js`:
```javascript
API_URL: 'https://votre-domaine-production.com/api'
```

## ✅ Checklist avant publication

- [ ] Logo et icônes en haute résolution
- [ ] Captures d'écran pour les stores
- [ ] Description et mots-clés
- [ ] Politique de confidentialité (URL)
- [ ] Conditions d'utilisation (URL)
- [ ] Configuration API production
- [ ] Tests sur appareils réels
- [ ] Certificats de signature valides
