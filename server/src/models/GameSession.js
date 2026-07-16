import mongoose from 'mongoose'

const { Schema } = mongoose

// Une partie ouverte, horodatée par le SERVEUR. C'est la pièce qui rend le
// score vérifiable : /game/start en crée une, /game/session la consomme et
// mesure le temps réellement écoulé. Sans elle, le client pouvait annoncer
// n'importe quelle durée (durationSec était une constante en dur).
const gameSessionSchema = new Schema(
  {
    // Jeton opaque remis au client. Aléatoire, non devinable : un joueur ne
    // doit pas pouvoir forger la session d'un autre.
    token: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'PromodevEteUser', required: true },
    startedAt: { type: Date, required: true },
    // Marqué à la première soumission. Une session ne vaut qu'une fois : sans
    // ça, un même bon score se rejouerait à l'infini.
    usedAt: { type: Date, default: null },
    // Index TTL (expireAfterSeconds: 0) : Mongo purge le document dès que cette
    // date est passée. 10 min, très large devant les 2 min d'une partie — de
    // quoi couvrir un onglet mis en arrière-plan sans laisser traîner les docs.
    expiresAt: { type: Date, required: true }
  },
  { collection: 'promodev_ete_gamesessions' }
)

gameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const GameSession = mongoose.model('PromodevEteGameSession', gameSessionSchema)
