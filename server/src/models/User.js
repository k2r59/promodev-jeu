import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const { Schema } = mongoose

const userSchema = new Schema(
  {
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
