import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { User } from '../models/User.js'

// Algorithme épinglé (HS256) à la signature ET à la vérification : sans ça, un
// jeton forgé avec un autre algorithme pourrait, selon les versions, être
// accepté. On ne laisse pas ce choix au porteur du jeton.
const JWT_ALG = 'HS256'

export function signToken(userId) {
  return jwt.sign({ uid: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn, algorithm: JWT_ALG })
}

function bearer(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

export async function requireAuth(req, res, next) {
  try {
    const token = bearer(req)
    if (!token) return res.status(401).json({ error: 'Non authentifié' })

    const payload = jwt.verify(token, config.jwtSecret, { algorithms: [JWT_ALG] })
    const user = await User.findById(payload.uid)
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' })

    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Session expirée ou invalide' })
  }
}

// Décode le jeton s'il est présent et valide, et rend l'uid — sans JAMAIS
// rejeter. Pour les routes PUBLIQUES qui se personnalisent quand on est connecté
// (le classement), sans exiger l'authentification ni toucher la base.
export function optionalUid(req) {
  try {
    const token = bearer(req)
    if (!token) return null
    return jwt.verify(token, config.jwtSecret, { algorithms: [JWT_ALG] }).uid || null
  } catch {
    return null
  }
}
