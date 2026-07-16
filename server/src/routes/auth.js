import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User, hashResetToken } from '../models/User.js'
import { isAvatarKey, avatarForId } from '../avatars.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import { sendPasswordReset } from '../mailer.js'
import { config } from '../config.js'

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
    // Le front envoie un booléen ; on ne se fie qu'à `true` strict, pour qu'une
    // chaîne « false » ou un objet ne passent pas pour un consentement.
    const acceptRules = body.acceptRules === true

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

    // Sans consentement, pas de compte : c'est une exigence du règlement, pas
    // une préférence d'UI, donc le serveur tranche — la case cochée côté client
    // ne prouve rien à elle seule.
    if (!acceptRules)
      return res.status(400).json({ error: 'Vous devez accepter le règlement pour participer.' })

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
    const user = new User({
      pseudo,
      email,
      societe,
      telephone,
      // Horodaté par le serveur, jamais par le client : c'est l'heure de la
      // base qui fait foi, comme pour les scores.
      acceptedRulesAt: new Date(),
      acceptedRulesVersion: config.rulesVersion
    })
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

// Réponse unique de /forgot, quoi qu'il advienne. Même philosophie que le login
// juste au-dessus : dire « cet e-mail est inconnu » offrirait un énumérateur de
// comptes à quiconque, sans même avoir besoin d'un mot de passe. Le prix est
// assumé — celui qui se trompe d'adresse n'aura pas de diagnostic.
const FORGOT_NEUTRE = {
  ok: true,
  message: 'Si un compte existe avec cet e-mail, un lien de réinitialisation vient d’être envoyé.'
}

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  try {
    // Refus franc et indépendant de l'e-mail saisi : ça ne dit rien sur
    // l'existence d'un compte, seulement que le serveur ne sait pas poster.
    // En principe injoignable, le front masque le lien (cf. GET /api/config).
    if (!config.mail.enabled)
      return res.status(503).json({ error: 'La réinitialisation par e-mail n’est pas disponible pour le moment.' })

    const email = str((req.body || {}).email).toLowerCase()
    if (!EMAIL_RE.test(email)) return res.json(FORGOT_NEUTRE)

    const user = await User.findOne({ email })
    if (user) {
      const token = user.createPasswordReset()
      await user.save()

      // Envoi NON attendu, volontairement. Deux raisons : un SMTP répond en
      // centaines de millisecondes, et attendre creuserait entre e-mail connu
      // et inconnu un écart de durée qui trahirait ce que le message tait ;
      // et une panne du prestataire ne doit pas se traduire par une erreur
      // côté joueur, qui la renverrait elle aussi. L'échec part donc aux logs.
      // Le jeton posé n'est pas retiré : sans l'e-mail, personne ne l'a.
      sendPasswordReset(user.email, user.pseudo, `${config.publicUrl}/reinitialiser?token=${token}`).catch((err) =>
        console.error('forgot: envoi SMTP impossible pour', user.email, err.message)
      )
    }

    res.json(FORGOT_NEUTRE)
  } catch (err) {
    console.error('forgot error', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// POST /api/auth/reset
router.post('/reset', async (req, res) => {
  try {
    const body = req.body || {}
    const token = str(body.token)
    const password = typeof body.password === 'string' ? body.password : ''

    if (password.length < PASSWORD_MIN)
      return res.status(400).json({ error: `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères.` })
    if (Buffer.byteLength(password) > PASSWORD_MAX)
      return res.status(400).json({ error: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX} caractères.` })
    // Sans ce garde, un jeton vide serait haché puis comparé : str() ayant déjà
    // réduit tout non-chaîne à '', une requête bricolée chercherait le hash de
    // la chaîne vide. Aucun compte ne le porte, mais autant ne pas poser la
    // question à la base.
    if (!token) return res.status(400).json({ error: 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.' })

    // L'expiration est dans la requête, pas testée après coup : un jeton périmé
    // ne doit pas même remonter de la base.
    const user = await User.findOne({
      passwordResetHash: hashResetToken(token),
      passwordResetExpires: { $gt: new Date() }
    })
    if (!user) return res.status(400).json({ error: 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.' })

    await user.setPassword(password)
    // Usage unique : consommé dans la foulée, le même lien ne rejouera pas.
    user.clearPasswordReset()
    await user.save()

    // Connecté dans la foulée : il vient de prouver qu'il possède l'adresse et
    // de choisir son mot de passe, lui redemander de le saisir n'ajoute rien.
    res.json({ token: signToken(user._id), user: user.toPublic() })
  } catch (err) {
    console.error('reset error', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() })
})

export default router
