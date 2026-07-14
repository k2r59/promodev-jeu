# 🌞 Promodev — Le Jeu de l'Été

Un jeu **Match-3** estival, mobile-first, pensé pour attirer des prospects et les faire revenir.
Parties de **2 minutes**, combos spectaculaires, boosters, défis quotidiens, classements et un
grand prix : **1 000 € de remise** sur une future opération Promodev.

> Univers 100 % été : soleil 🌞, ballon de plage 🏖️, glace 🍦, pastèque 🍉, coquillage 🐚, étoile ⭐, noix de coco 🥥, palmier 🌴.

## 🧱 Stack

| Côté | Techno |
| --- | --- |
| **Frontend** | Vue 3 (`<script setup>`) · Vite · Pinia · Vue Router · ofetch |
| **Backend** | Node/Express · MongoDB (Mongoose) · JWT · bcrypt |
| **Déploiement** | Heroku (le serveur sert le build du frontend) |

Le son est généré via la Web Audio API (aucun asset externe).

## 📁 Structure

```
promodev-jeu-de-lete/
├── package.json         # scripts racine (dev, build, heroku-postbuild)
├── Procfile             # web: node server/src/index.js
├── server/              # API Express + MongoDB
│   └── src/
│       ├── index.js         # serveur + service du build frontend
│       ├── config.js, db.js
│       ├── models/          # User, Score
│       ├── routes/          # auth, game, leaderboard
│       ├── middleware/      # auth JWT
│       └── gameData.js      # défis & badges (source de vérité)
└── frontend/            # SPA Vue 3
    └── src/
        ├── game/            # engine.js (Match-3), gameData.js, sound.js
        ├── components/      # GameBoard.vue
        ├── views/           # Home, Play, Leaderboard, Challenges, Rewards, Help, Auth
        ├── stores/          # auth (Pinia)
        └── api/             # client ofetch
```

## 🚀 Démarrage en local

### 1. Pré-requis
- Node 20+
- Une base MongoDB (locale `mongodb://127.0.0.1:27017` ou une URI Atlas)

### 2. Configuration
```bash
cp server/.env.example server/.env
# éditez server/.env : MONGODB_URI, JWT_SECRET…
```

### 3. Installation
```bash
npm run install:all        # installe server/ et frontend/
```

### 4. Lancer en dev (2 process en parallèle)
```bash
npm install                # installe npm-run-all à la racine
npm run dev
```
- API : http://localhost:3001
- Front (Vite, avec proxy `/api`) : http://localhost:5173

Ou séparément : `npm run dev:server` et `npm run dev:frontend`.

## ☁️ Déploiement Heroku

```bash
heroku create promodev-jeu-de-lete
heroku config:set MONGODB_URI="<votre-uri-atlas>"
heroku config:set JWT_SECRET="<clé-longue-aléatoire>"
heroku config:set NODE_ENV="production"
git push heroku main
```

Au déploiement, `heroku-postbuild` installe les dépendances et build le frontend ;
`Procfile` démarre le serveur, qui sert `frontend/dist` **et** l'API sur le même domaine.

## 🎮 Fonctionnalités

- **Inscription / connexion** (pseudo, e-mail, mot de passe, avatar) — JWT stocké côté client.
- **Match-3** : plateau 8×8, échange par tap ou swipe, détection d'alignements, gravité, recomblage, anti-blocage (mélange automatique).
- **Combos & multiplicateurs** en cascade (x2, x3, x5…), bonus pour les alignements de 4+.
- **Boosters** : 💣 bombe (zone 3×3), ⚡ éclair (ligne + colonne), 🌊 vague (toutes les tuiles identiques).
- **Défis quotidiens** : progression suivie par jour, récompenses en gemmes + XP créditées automatiquement.
- **Badges & XP / niveaux**, débloqués sur des seuils cumulés.
- **Classements** jour / semaine / général (meilleur score conservé par joueur).
- **Grand prix** : top 100 = finalistes → tirage au sort → 1 000 €.
- **Effets** : animations, popups de combo, sons de feedback, mobile-first.

## 🔌 API (résumé)

| Méthode | Route | Auth | Rôle |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | Créer un compte |
| POST | `/api/auth/login` | – | Se connecter |
| GET | `/api/auth/me` | ✅ | Profil courant |
| POST | `/api/game/session` | ✅ | Enregistrer une partie + récompenses |
| GET | `/api/game/challenges` | ✅ | Défis du jour |
| GET | `/api/game/badges` | ✅ | Badges du joueur |
| GET | `/api/leaderboard?period=day\|week\|month\|all` | – | Classements |

## 🛡️ Notes

- Bornage anti-triche basique côté serveur sur les scores soumis. Pour une opération réelle
  avec dotation, prévoir une validation renforcée (rejeu de partie signé / vérification serveur).
- Les collections MongoDB sont préfixées `promodev_ete_` pour cohabiter sur un cluster partagé.
