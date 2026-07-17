# Le Jeu de l'Été PromoDev — Guide de maintenance

> Doc de passation pour assurer la maintenance en l'absence de l'auteur.
> Le Jeu est un **jeu-concours** : jouer, marquer des points, finir dans le Top 100,
> puis tirage au sort de **3 cartes cadeaux (250 / 150 / 100 € = 500 €)**.
> **Opération : 1er → 31 août 2026. Tirage : 4 septembre 2026.**

En cas de doute, **ne pas improviser sur la prod pendant l'opération** : privilégier
`heroku logs`, Sentry et un rollback plutôt qu'un correctif à chaud non testé.

---

## 1. Accès & où vit le projet

| Élément | Où |
|---|---|
| **Site public** | https://summergame.promo.dev |
| **App Heroku** | `promodev-summer-game` (team **promodev**, région **eu**, plan **Basic**, 1 dyno web) — https://dashboard.heroku.com/apps/promodev-summer-game |
| **URL Heroku brute** | https://promodev-summer-game-0c983e7108bd.herokuapp.com |
| **Repo GitHub (actif / deploy)** | `k2r59/promodev-jeu` (compte perso) — source de l'autodeploy Heroku |
| **Repo GitHub (orga)** | `promogit/promodev-summergame` (copie privée dans l'orga promogit) |
| **Supervision erreurs** | Sentry, org **promodev**, projet **summer-game** |
| **Base de données** | MongoDB (Atlas) — base `promodev_jeu_ete` (URI dans la config var `MONGODB_URI`) |
| **E-mails transactionnels** | Mailjet (SMTP) — reset de mot de passe |

> **Note repos** : le déploiement se fait aujourd'hui depuis le repo **perso**. Une copie
> existe dans l'orga `promogit`. Si l'un devient la référence, penser à garder les deux
> synchronisés OU à basculer `origin` + l'intégration GitHub d'Heroku (cf. §4).

---

## 2. Architecture en 30 secondes

- **Frontend** : Vue 3 + Vite (dossier `frontend/`). Build statique servi par le backend.
- **Backend** : Node/Express + Mongoose (dossier `server/`). API sous `/api/*`.
- **Un seul dyno web** sert l'API **et** les fichiers statiques du front buildé.
- **Commande de démarrage** (Procfile) :
  `node --import ./server/src/instrument.js server/src/index.js`
  (le `--import instrument.js` initialise **Sentry** avant tout le reste — ne pas retirer).
- **Build Heroku** (`heroku-postbuild` dans le `package.json` racine) : installe les deps
  serveur (prod) + front (avec devDeps, car Vite en est une) puis `vite build`.
- **Node 20.x** (`engines` du package.json).
- **Health check** : `GET /api/health` → `{ ok: true, ts: … }`.

---

## 3. Déploiement

Le déploiement est **automatique** : tout push sur la branche **`main`** du repo connecté
part en prod (autodeploy Heroku). Il n'y a **pas** besoin de `git push heroku` (le README
peut le laisser croire — c'est faux).

```bash
# Cycle normal
git add -A
git commit -m "…"
git push origin main        # ⇒ déclenche le build + déploiement Heroku
```

Avant de pousser, **toujours** vérifier que le front build :

```bash
cd frontend && npm run build     # doit finir par "✓ built"
```

**Déploiement / rollback manuel** (si l'autodeploy est coupé ou pour revenir en arrière) :

```bash
heroku releases -a promodev-summer-game            # liste des versions
heroku rollback vNNN -a promodev-summer-game       # revenir à une version précédente
heroku ps:restart -a promodev-summer-game          # simple redémarrage
```

---

## 4. Variables de configuration (config vars)

Elles sont posées **sur Heroku** (Dashboard → Settings → *Reveal Config Vars*) ou en CLI.
**Ne jamais les committer.** `server/.env` (local, git-ignoré) contient les valeurs de dev ;
`server/.env.example` liste les clés **sans valeurs**.

| Clé | Rôle |
|---|---|
| `MONGODB_URI` | Connexion MongoDB (Atlas). **Critique.** |
| `JWT_SECRET` | Secret de signature des jetons d'auth (HS256). **Ne pas changer** en cours d'op (déconnecte tout le monde). |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Remontée d'erreurs backend / frontend. |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | Envoi d'e-mails (Mailjet) — reset de mot de passe. |
| `PUBLIC_URL` | URL publique utilisée dans les e-mails (liens de reset). |
| `CORS_ORIGIN` | Origine autorisée pour l'API. |
| `OPERATION_END` | Fin de l'opération (`2026-08-31T23:59:59+02:00`). |
| `RULES_VERSION` | Version du règlement acceptée à l'inscription. |
| `NODE_ENV` | `production` sur Heroku. |

```bash
heroku config -a promodev-summer-game                 # voir les clés/valeurs
heroku config:set MA_CLE=valeur -a promodev-summer-game   # modifier (redémarre l'app)
```

---

## 5. Logs & supervision

```bash
heroku logs --tail -a promodev-summer-game            # logs en direct
heroku logs -n 500 -a promodev-summer-game            # 500 dernières lignes
```

- **Sentry** (org promodev, projet summer-game) remonte automatiquement les erreurs
  serveur et front. C'est le premier endroit à regarder si « ça plante ».
- **Charge** : le dyno est en plan **Basic** (1 web). Voir §6 pour scaler.

---

## 6. Incidents fréquents & réponses

**⚠️ Le jeu ralentit / sature (afflux de joueurs)**
Le lien peut fuiter (accès libre, email + mot de passe, pas de LinkedIn). On peut monter
en puissance à tout moment :
```bash
heroku ps:type web=standard-1x -a promodev-summer-game   # dyno plus costaud
heroku ps:scale web=2 -a promodev-summer-game            # 2 dynos web
```
Revenir ensuite à `web=1` / `basic` pour maîtriser le coût.

**« Erreur lors de l'enregistrement de la partie » (500 en fin de partie)**
Regarder `heroku logs --tail` + Sentry. Causes déjà vues : validation Mongoose trop
stricte sur d'anciens comptes → **ne jamais** « réparer » en antidatant un consentement RGPD
(ce serait un faux). Corriger le schéma/route, tester, redéployer.

**L'app est down / ne répond pas**
```bash
heroku ps -a promodev-summer-game            # état des dynos
heroku ps:restart -a promodev-summer-game    # redémarrage
heroku logs --tail -a promodev-summer-game   # cause
```
Si un déploiement a cassé la prod : `heroku rollback` (cf. §3).

**Les e-mails de reset ne partent pas**
Vérifier les `SMTP_*` (Mailjet) et les logs. Tester le parcours « mot de passe perdu ».

---

## 7. Base de données

- Base **`promodev_jeu_ete`**, collections principales :
  - `promodev_ete_users` — comptes joueurs (consentements RGPD horodatés)
  - `promodev_ete_scores` — scores enregistrés
  - `promodev_ete_gamesessions` — jetons de partie anti-triche (TTL)
- **Anti-triche** : score plafonné côté serveur, jeton de partie à usage unique, durée
  minimale de partie, rate-limiting. Ne pas assouplir ces gardes pendant l'op.
- **Purge des comptes de test** (à faire **avant** l'ouverture, pour un classement vierge) :
  supprimer les comptes de test dans `promodev_ete_users` + leurs `promodev_ete_scores`.
  **Ne jamais** fabriquer/antidater un consentement sur un compte.

---

## 8. Développement local

```bash
npm run install:all      # installe server + frontend
npm run dev              # lance API + front en parallèle (Mongo en mémoire si pas d'URI)
cd frontend && npm run build   # build de prod (à vérifier avant tout push)
```

- Sans `MONGODB_URI`, le serveur démarre un **MongoDB en mémoire** (pratique en dev/test).
- Des scripts de test ponctuels ont été écrits en `.mjs` (mongodb-memory-server + serveur
  réel) ; ils servent de base pour vérifier un correctif avant déploiement.

---

## 9. Brancher Heroku sur le repo de l'orga (si migration voulue)

Si on veut que la prod déploie depuis `promogit/promodev-summergame` au lieu du perso :

1. **Autoriser l'accès orga** : GitHub → *Settings* → *Applications* → *Authorized OAuth Apps*
   → **Heroku Dashboard** → à côté de l'orga **promogit**, cliquer **Grant** (tu es admin).
2. Heroku → app `promodev-summer-game` → onglet **Deploy** → *Deployment method* → **GitHub**
   → connecté en tant que `k2r59` → chercher **`promodev-summergame`** → **Connect**.
3. Choisir la branche **`main`** et activer **Automatic deploys**.
4. Repointer le remote local : `git remote set-url origin git@github.com:promogit/promodev-summergame.git`.
5. Les **config vars restent** (même app) — rien à re-saisir.

Tant que ce n'est pas fait, **continuer à pousser sur le repo perso** (c'est lui qui déploie).

---

## 10. Contacts & liens utiles

- Support / réclamations joueurs : **hello@promo.dev**
- Données personnelles (RGPD / DPO) : **dpo@promo.dev**
- Règlement (PDF) : `frontend/public/reglement-jeu-de-l-ete-promodev-2026.pdf` (servi sur
  `/reglement-jeu-de-l-ete-promodev-2026.pdf`, lien `/reglement` redirige dessus)
- Mentions légales & confidentialité : page `/mentions-legales` de l'app
