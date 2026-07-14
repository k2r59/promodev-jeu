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

// En-têtes de sécurité. La CSP par défaut de helmet casserait le build Vite
// (styles inline) : on la laisse de côté ici, le front est servi en statique.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))
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

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))
app.use('/api/auth/login', loginLimiter)
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

async function start() {
  await connectDB()
  app.listen(config.port, () => {
    console.log(`🌞 Serveur Promodev démarré sur le port ${config.port}`)
  })
}

start()
