import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+0-9][0-9\s.\-()]{5,}$/

const PASSWORD_MIN = 8
// bcrypt tronque au-delà de 72 octets : au-delà, les caractères ne protègent
// plus rien. On refuse explicitement plutôt que de laisser croire le contraire.
const PASSWORD_MAX = 72

// Un JSON peut envoyer autre chose qu'une chaîne ({"email": {"$ne": null}}).
// Tout ce qui n'est pas une chaîne devient chaîne vide : jamais un opérateur Mongo.
const str = (v) => (typeof v === 'string' ? v.trim() : '')

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const body = req.body || {}
    const pseudo = str(body.pseudo)
    const email = str(body.email).toLowerCase()
    const societe = str(body.societe)
    const telephone = str(body.telephone)
    const password = typeof body.password === 'string' ? body.password : ''
    const avatar = str(body.avatar)

    if (pseudo.length < 2 || pseudo.length > 20)
      return res.status(400).json({ error: 'Le pseudo doit faire entre 2 et 20 caractères.' })
    if (!EMAIL_RE.test(email) || email.length > 180)
      return res.status(400).json({ error: 'Adresse e-mail invalide.' })
    if (password.length < PASSWORD_MIN)
      return res.status(400).json({ error: `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères.` })
    if (Buffer.byteLength(password) > PASSWORD_MAX)
      return res.status(400).json({ error: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX} caractères.` })

    // Facultatifs : on ne valide que s'ils sont remplis.
    if (societe.length > 120) return res.status(400).json({ error: 'La raison sociale est trop longue (120 max).' })
    if (telephone && !PHONE_RE.test(telephone))
      return res.status(400).json({ error: 'Numéro de téléphone invalide.' })

    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' })

    const user = new User({ pseudo, email, societe, telephone, avatar: avatar || '😎' })
    await user.setPassword(password)
    await user.save()

    const token = signToken(user._id)
    res.status(201).json({ token, user: user.toPublic() })
  } catch (err) {
    console.error('register error', err)
    res.status(500).json({ error: 'Erreur serveur lors de l’inscription.' })
  }
})

// Hash jetable, calculé une fois au démarrage. Sert uniquement à faire perdre
// à un e-mail inconnu autant de temps qu'à un e-mail connu : sans ça, l'écart
// de durée de réponse permet d'énumérer les comptes, même si le message
// d'erreur est le même dans les deux cas.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-secret', 10)

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const body = req.body || {}
    const email = str(body.email).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''

    const user = await User.findOne({ email })
    const ok = user ? await user.verifyPassword(password) : await bcrypt.compare(password, DUMMY_HASH)

    // Message volontairement identique dans les deux cas : ne jamais révéler
    // si l'e-mail existe.
    if (!user || !ok) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' })

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
