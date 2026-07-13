import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: process.env.PORT || 3001,
  // Vide => mode dev sans base (Mongo en mémoire). Renseignez MONGODB_URI pour une vraie base.
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  operationEnd: process.env.OPERATION_END || '2026-09-15T23:59:59.000Z',
  isProd: process.env.NODE_ENV === 'production'
}
