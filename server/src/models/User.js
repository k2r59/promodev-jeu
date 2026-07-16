import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { config } from '../config.js'

const { Schema } = mongoose

// Le jeton est stocké HACHÉ, jamais en clair : une fuite de la base ne doit pas
// livrer les comptes dont un reset est en cours. SHA-256 et non bcrypt, car le
// jeton est déjà 256 bits d'aléa — il n'y a rien à brute-forcer, et un hash
// lent ne protégerait de rien tout en coûtant à chaque vérification.
export const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const userSchema = new Schema(
  {
    // Le pseudo est unique : il identifie le joueur au classement, et deux
    // « SurferHervé » y seraient indiscernables. Voir l'index à collation plus
    // bas — `unique: true` seul ne distinguerait pas la casse.
    pseudo: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: true },

    // Réinitialisation en cours. `null` au repos plutôt qu'absent : deux comptes
    // sans reset ne doivent pas se retrouver à partager une valeur qui pourrait
    // matcher une recherche. Jamais exposés par toPublic().
    passwordResetHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },

    // Raison sociale obligatoire : le jeu sert à qualifier des prospects
    // professionnels, un compte sans société n'a pas d'intérêt commercial.
    societe: { type: String, required: true, trim: true, maxlength: 120 },
    // Téléphone facultatif : on ne bloque pas une inscription pour ça.
    telephone: { type: String, trim: true, maxlength: 30, default: '' },

    // Progression
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    // Monnaie du jeu (gemmes gagnées via défis)
    gems: { type: Number, default: 0 },

    // Avatar (emoji ou index de preset)
    avatar: { type: String, default: '😎' },

    // Badges débloqués (clés)
    badges: [{ type: String }],

    // Meilleurs scores (mis à jour à chaque partie)
    bestScoreAllTime: { type: Number, default: 0 },

    // Statistiques cumulées
    gamesPlayed: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    bestCombo: { type: Number, default: 0 },
    boostersUsedTotal: { type: Number, default: 0 },

    // Progression des défis quotidiens : { 'YYYY-MM-DD': { challengeId: progress } }
    dailyChallenges: { type: Schema.Types.Mixed, default: {} },
    // Défis déjà récompensés (pour ne pas payer 2x) : ['YYYY-MM-DD:challengeId']
    claimedChallenges: [{ type: String }]
  },
  { timestamps: true, collection: 'promodev_ete_users' }
)

// Unicité du pseudo, insensible à la CASSE (strength: 2 — et pas aux accents,
// qui restent distinctifs : « Hervé » et « Herve » se distinguent à l'œil dans
// le classement, « Hervé » et « hervé » non).
// `unique: true` sur le champ ne ferait qu'une comparaison binaire et laisserait
// passer les deux. La collation déplace la règle dans l'index lui-même : la base
// la fait donc respecter même si un jour du code oublie de vérifier.
userSchema.index(
  { pseudo: 1 },
  { unique: true, collation: { locale: 'fr', strength: 2 }, name: 'pseudo_unique_ci' }
)

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10)
}

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

// Pose un jeton de réinitialisation et rend sa version EN CLAIR — la seule fois
// où elle existe. L'appelant l'envoie par e-mail et l'oublie ; la base n'en
// gardera que l'empreinte. randomBytes et non Math.random : c'est la seule
// chose qui protège le compte pendant l'heure qui vient.
userSchema.methods.createPasswordReset = function () {
  const token = crypto.randomBytes(32).toString('base64url')
  this.passwordResetHash = hashResetToken(token)
  this.passwordResetExpires = new Date(Date.now() + config.resetTtlMs)
  return token
}

userSchema.methods.clearPasswordReset = function () {
  this.passwordResetHash = null
  this.passwordResetExpires = null
}

// Niveau dérivé de l'XP : 500 XP par niveau (progressif léger)
userSchema.methods.recomputeLevel = function () {
  this.level = Math.max(1, Math.floor(this.xp / 500) + 1)
}

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    pseudo: this.pseudo,
    email: this.email,
    societe: this.societe,
    telephone: this.telephone,
    avatar: this.avatar,
    xp: this.xp,
    level: this.level,
    gems: this.gems,
    badges: this.badges,
    bestScoreAllTime: this.bestScoreAllTime,
    gamesPlayed: this.gamesPlayed,
    bestCombo: this.bestCombo,
    boostersUsedTotal: this.boostersUsedTotal
  }
}

export const User = mongoose.model('PromodevEteUser', userSchema)
