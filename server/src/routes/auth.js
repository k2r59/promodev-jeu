import { Router } from 'express'
import { User } from '../models/User.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    let { pseudo, email, password, avatar } = req.body || {}
    pseudo = (pseudo || '').trim()
    email = (email || '').trim().toLowerCase()

    if (!pseudo || pseudo.length < 2 || pseudo.length > 20)
      return res.status(400).json({ error: 'Le pseudo doit faire entre 2 et 20 caractères.' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Adresse e-mail invalide.' })
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères.' })

    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' })

    const user = new User({ pseudo, email, avatar: avatar || '😎' })
    await user.setPassword(password)
    await user.save()

    const token = signToken(user._id)
    res.status(201).json({ token, user: user.toPublic() })
  } catch (err) {
    console.error('register error', err)
    res.status(500).json({ error: 'Erreur serveur lors de l’inscription.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {}
    email = (email || '').trim().toLowerCase()
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' })

    const ok = await user.verifyPassword(password || '')
    if (!ok) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' })

    const token = signToken(user._id)
    res.json({ token, user: user.toPublic() })
  } catch (err) {
    console.error('login error', err)
    res.status(500).json({ error: 'Erreur serveur lors de la connexion.' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() })
})

export default router
