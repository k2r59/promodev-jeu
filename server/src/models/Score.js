import mongoose from 'mongoose'

const { Schema } = mongoose

// Une ligne par partie jouée. Les classements sont calculés en agrégeant
// le meilleur score par joueur sur une fenêtre de temps (jour/semaine/global).
const scoreSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'PromodevEteUser', required: true, index: true },
    pseudo: { type: String, required: true },
    avatar: { type: String, default: '😎' },
    score: { type: Number, required: true, min: 0, index: true },
    maxCombo: { type: Number, default: 0 },
    boostersUsed: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    durationSec: { type: Number, default: 120 }
  },
  { timestamps: true, collection: 'promodev_ete_scores' }
)

scoreSchema.index({ createdAt: -1 })

export const Score = mongoose.model('PromodevEteScore', scoreSchema)
