import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { isAvatarKey, avatarForId } from '../avatars.js'
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

// Doit rester identique à celle de l'index pseudo_unique_ci (models/User.js).
const PSEUDO_COLLATION = { locale: 'fr', strength: 2 }

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

    // Obligatoire : le jeu qualifie des prospects professionnels.
    if (societe.length < 2 || societe.length > 120)
      return res.status(400).json({ error: 'La raison sociale doit faire entre 2 et 120 caractères.' })
    // Seul champ facultatif : on ne le valide que s'il est rempli.
    if (telephone && !PHONE_RE.test(telephone))
      return res.status(400).json({ error: 'Numéro de téléphone invalide.' })

    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' })
    // Même collation que l'index (cf. models/User.js) : sans elle, « Hervé »
    // passerait ce test puis se ferait rejeter par l'index — une erreur 500 au
    // lieu d'un message clair.
    const pseudoPris = await User.findOne({ pseudo }).collation(PSEUDO_COLLATION)
    if (pseudoPris) return res.status(409).json({ error: 'Ce pseudo est déjà pris.' })

    // L'avatar n'était pas validé : n'importe quelle chaîne passait et finissait
    // affichée telle quelle dans le classement (Vue échappe, donc pas de XSS,
    // mais un client bricolé pouvait y mettre ce qu'il voulait). On n'accepte
    // plus qu'une clé connue, et on en attribue une plutôt que de rejeter : ce
    // n'est pas un champ assez important pour bloquer une inscription.
    const user = new User({ pseudo, email, societe, telephone })
    user.avatar = isAvatarKey(avatar) ? avatar : avatarForId(user._id)
    await user.setPassword(password)
    await user.save()

    const token = signToken(user._id)
    res.status(201).json({ token, user: user.toPublic() })
  } catch (err) {
    // Deux inscriptions simultanées passent les deux findOne puis se heurtent à
    // l'index unique : c'est la base qui tranche, et c'est très bien. Reste à
    // traduire son erreur brute en message lisible plutôt qu'en 500.
    if (err && err.code === 11000) {
      const champ = Object.keys(err.keyPattern || {})[0]
      return res.status(409).json({
        error: champ === 'pseudo' ? 'Ce pseudo est déjà pris.' : 'Un compte existe déjà avec cet e-mail.'
      })
    }
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
