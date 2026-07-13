import express from 'express'
import cors from 'cors'
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
app.use(express.json({ limit: '100kb' }))

// CORS : en prod le front est servi par le même serveur, en dev on autorise Vite
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true) // requêtes same-origin / curl
      if (config.corsOrigin.includes(origin) || config.isProd) return cb(null, true)
      return cb(null, config.corsOrigin.includes(origin))
    }
  })
)

// Rate limiting sur l'auth pour limiter le brute-force
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false })

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))
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
