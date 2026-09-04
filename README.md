# Assistant Numérique à Domicile

PWA professionnelle pour techniciens et assistants numériques intervenant à domicile chez des clients.

## Fonctionnalités

- **Gestion clients** : fiches complètes avec historique
- **Gestion appareils** : par catégorie (ordinateurs, smartphones, imprimantes, réseau...)
- **Interventions** : wizard en 7 étapes (client → appareil → problème → diagnostic → recherche → intervention → compte-rendu)
- **Assistant IA** : compatible OpenAI, Google Gemini, Mistral AI
- **Checklists** : modèles prédéfinis et personnalisables
- **Photos** : capture et compression intégrées
- **Documentation** : base documentaire locale avec liens officiels
- **Sauvegarde** : export/import JSON + Google Drive
- **Sécurité** : verrouillage par PIN, verrouillage auto, chiffrement des données sensibles
- **Mode hors-ligne** : fonctionnement complet sans Internet
- **Mode sombre/clair**

## Déploiement rapide

### GitHub Pages (gratuit)

1. Créer un nouveau repository sur GitHub
2. Uploader tous les fichiers du dossier `assistant-numerique/` à la racine
3. Aller dans **Settings → Pages**
4. Source : **Deploy from a branch** → `main` → `/ (root)`
5. Attendre 1-2 minutes, accéder à `https://VOTRE_USER.github.io/NOM_REPO/`

### Netlify (gratuit)

1. Aller sur [netlify.com](https://netlify.com)
2. **Add new site → Deploy manually**
3. Glisser-déposer le dossier `assistant-numerique/`

### Vercel (gratuit)

```bash
npm i -g vercel
vercel
```

## Configuration

### 1. Clé API IA

1. Ouvrir l'application → **Paramètres → IA**
2. Choisir le fournisseur :
   - **OpenAI** : [platform.openai.com](https://platform.openai.com/api-keys) → clé API
   - **Google Gemini** : [aistudio.google.com](https://aistudio.google.com/app/apikey) → clé API
   - **Mistral** : [console.mistral.ai](https://console.mistral.ai/) → clé API
3. Renseigner la clé et le modèle (ex: `gpt-4o-mini`, `gemini-1.5-flash`)
4. Cliquer **Tester la connexion**

> ⚠️ **La clé API reste stockée localement sur votre appareil. Elle n'est jamais envoyée ailleurs et n'est pas incluse dans les sauvegardes.**

### 2. Google Drive

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un projet → Activer **Google Drive API**
3. **Identifiants → Créer des identifiants → ID client OAuth 2.0**
4. Type : **Application Web**
5. Origines JavaScript autorisées : ajouter l'URL de votre site (ex: `https://votre-user.github.io`)
6. Copier le **Client ID**
7. Ouvrir `js/google-drive.js` et remplacer `CLIENT_ID: ''` par `CLIENT_ID: 'VOTRE_CLIENT_ID.apps.googleusercontent.com'`
8. Redéployer

### 3. Données de démonstration

- Aller dans **Paramètres → Données de démonstration → Charger**
- Cela crée un client fictif (Jean Dupont) avec 3 appareils et 3 interventions

## Architecture

```
assistant-numerique/
├── index.html              # Application SPA
├── manifest.json           # Manifest PWA
├── service-worker.js       # Cache & offline
├── css/
│   └── style.css           # Styles responsive, dark mode
├── js/
│   ├── app.js              # Router, dashboard, recherche globale
│   ├── db.js               # IndexedDB (CRUD, demo data)
│   ├── clients.js          # Gestion clients
│   ├── devices.js          # Gestion appareils
│   ├── interventions.js    # Wizard 7 étapes
│   ├── documentation.js    # Base documentaire
│   ├── checklists.js       # Checklists réutilisables
│   ├── ai.js               # API OpenAI/Gemini/Mistral
│   ├── google-drive.js     # Intégration Google Drive OAuth2
│   ├── backup.js           # Export/Import JSON
│   ├── security.js         # PIN, verrouillage auto
│   └── settings.js         # Paramètres utilisateur
└── assets/
    └── icons/              # Icônes PWA (72x72 à 512x512)
```

## Conversion APK Android (Capacitor)

```bash
# 1. Prérequis
npm install -g @capacitor/core @capacitor/cli

# 2. Initialiser
npx cap init AssistantNum com.votrenom.assistantnum --web-dir .

# 3. Ajouter Android
npx cap add android

# 4. Synchroniser
npx cap sync

# 5. Ouvrir Android Studio
npx cap open android

# 6. Builder l'APK depuis Android Studio
```

## Sécurité des données

| Donnée | Stockage | Transmis ? |
|--------|----------|------------|
| Clients, appareils, interventions | IndexedDB (local) | ❌ Jamais |
| Clé API IA | LocalStorage/IndexedDB (local) | ❌ Jamais sauvegardée |
| Identifiants Google | Mémoire volatile uniquement | ❌ Jamais stockés |
| Sauvegarde Drive | Fichier JSON chiffré | ✅ Uniquement vers votre Drive |

## Technologies

- HTML5 / CSS3 / JavaScript vanilla
- IndexedDB (Dexter-like wrapper)
- Service Worker (cache-first)
- Web App Manifest
- Google Drive API v3 (OAuth2)
- API REST OpenAI / Gemini / Mistral

## Licence

Usage professionnel personnel. Aucune donnée n'est collectée par un tiers.
