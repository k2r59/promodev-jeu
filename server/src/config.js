import dotenv from 'dotenv'
dotenv.config()

const isProd = process.env.NODE_ENV === 'production'

// Un repli silencieux sur un secret connu permettrait de forger n'importe quel
// token : en prod on refuse de démarrer plutôt que de tourner en clair.
const DEV_SECRET = 'dev-secret-change-me'
const jwtSecret = process.env.JWT_SECRET || DEV_SECRET
if (isProd && (jwtSecret === DEV_SECRET || jwtSecret === 'change-me-super-secret-key' || jwtSecret.length < 32)) {
  console.error(
    'JWT_SECRET manquant, laissé à sa valeur d’exemple, ou trop court (< 32 caractères).\n' +
      'Définissez-le avant de démarrer en production :\n' +
      '  heroku config:set JWT_SECRET="$(openssl rand -base64 48)"'
  )
  process.exit(1)
}

export const config = {
  port: process.env.PORT || 3001,
  // Vide => mode dev sans base (Mongo en mémoire). Renseignez MONGODB_URI pour une vraie base.
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  operationEnd: process.env.OPERATION_END || '2026-09-15T23:59:59.000Z',
  isProd
}
