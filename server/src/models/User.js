import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const { Schema } = mongoose

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
