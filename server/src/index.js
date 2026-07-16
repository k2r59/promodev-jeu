// EN PREMIER, avant tout le reste : Sentry instrumente les modules au chargement.
import { Sentry } from './instrument.js'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

import { config } from './config.js'
import { connectDB } from './db.js'
import authRoutes from './routes/auth.js'
import gameRoutes from './routes/game.js'
import leaderboardRoutes from './routes/leaderboard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.set('trust proxy', 1)

// En-têtes de sécurité, CSP comprise. Le point qui compte : script-src 'self'
// SANS 'unsafe-inline' — le build Vite ne pose aucun script inline (vérifié),
// donc une XSS injectée ne pourrait exécuter aucun script. C'est ce qui, avec
// le JWT en localStorage, transformait une future XSS en vol de compte.
// Les styles, eux, ont besoin de 'unsafe-inline' : Vue pose des style="" (les
// :style bindings) — sans danger, ça n'exécute pas de code.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'], // avatars, favicon SVG en data:
        fontSrc: ["'self'", 'data:'],
        // Le front envoie ses erreurs à Sentry : sans ça, la CSP les bloquerait.
        connectSrc: ["'self'", 'https://*.sentry.io', 'https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io'],
        workerSrc: ["'self'", 'blob:'], // service worker de la PWA
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"] // anti-clickjacking
      }
    },
    crossOriginEmbedderPolicy: false
  })
)
app.use(express.json({ limit: '100kb' }))

// CORS : en prod le front est servi par le même serveur (donc same-origin, pas
// d'en-tête Origin), on n'a rien à ouvrir. En dev on autorise Vite.
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true) // same-origin / curl
      cb(null, config.corsOrigin.includes(origin))
    }
  })
)

// Rate limiting anti-brute-force. Le login est la cible la plus intéressante :
// il a sa propre limite, bien plus basse que le reste de l'auth.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false })
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // seuls les échecs comptent
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' }
})
// /forgot fait envoyer un e-mail à un tiers sur simple demande d'un inconnu :
// sans limite propre, c'est une arme pour inonder la boîte de quelqu'un et
// brûler le quota du prestataire au passage. Bien plus strict que authLimiter,
// qui ne protège lui que le CPU.
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes de réinitialisation. Réessayez dans une heure.' }
})
// /register révèle si un e-mail (ou un pseudo) est déjà pris — la contrepartie
// d'un message clair « ce compte existe déjà ». On ne peut pas le supprimer sans
// dégrader l'inscription, mais on bride l'énumération de MASSE : 15 tentatives
// par heure et par IP suffisent à un humain qui s'inscrit, pas à qui sonde des
// milliers d'adresses.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives d’inscription. Réessayez dans un moment.' }
})

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))
// Ce que le front doit savoir AVANT d'afficher le formulaire. Le lien « mot de
// passe oublié » ne s'affiche que si le serveur sait poster un e-mail : sans
// SMTP configuré, ce lien mènerait à un silence, ce qui est pire que son absence.
app.get('/api/config', (req, res) => res.json({ passwordResetEnabled: config.mail.enabled }))
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/forgot', forgotLimiter)
app.use('/api/auth/register', registerLimiter)
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/game', gameRoutes)
app.use('/api/leaderboard', leaderboardRoutes)

// --- Sert le frontend buildé (Heroku / prod) ---
const distPath = path.resolve(__dirname, '../../frontend/dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // SPA fallback (Express 4 : regex, pas de '*')
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  app.get('/', (req, res) =>
    res.json({ message: 'API Promodev Jeu de l’Été. Lancez le frontend Vite en dev (port 5173).' })
  )
}

// Filet de sécurité Sentry : capture les erreurs qui remontent au middleware
// d'erreur Express (throw non catché, next(err)). Doit venir APRÈS les routes.
// Les 500 déjà catchés dans les routes sont, eux, remontés explicitement par
// Sentry.captureException — c'est ce qui aurait signalé le bug de fin de partie.
// No-op si Sentry n'est pas initialisé (dev sans DSN).
Sentry.setupExpressErrorHandler(app)

async function start() {
  await connectDB()
  app.listen(config.port, () => {
    console.log(`🌞 Serveur Promodev démarré sur le port ${config.port}`)
  })
}

start()
