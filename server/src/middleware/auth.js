import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { User } from '../models/User.js'

export function signToken(userId) {
  return jwt.sign({ uid: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Non authentifié' })

    const payload = jwt.verify(token, config.jwtSecret)
    const user = await User.findById(payload.uid)
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' })

    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Session expirée ou invalide' })
  }
}
