import dotenv from 'dotenv'
dotenv.config()

const isProd = process.env.NODE_ENV === 'production'

// Un repli silencieux sur un secret connu permettrait de forger n'importe quel
// token : en prod on refuse de démarrer plutôt que de tourner en clair.
const DEV_SECRET = 'dev-secret-change-me'
const jwtSecret = process.env.JWT_SECRET || DEV_SECRET
if (isProd && (jwtSecret === DEV_SECRET || jwtSecret === 'change-me-super-secret-key' || jwtSecret.length < 32)) {
  console.error(
    'JWT_SECRET manquant, laissé à sa valeur d’exemple, ou trop court (< 32 caractères).\n' +
      'Définissez-le avant de démarrer en production :\n' +
      '  heroku config:set JWT_SECRET="$(openssl rand -base64 48)"'
  )
  process.exit(1)
}

// --- Envoi d'e-mail (réinitialisation de mot de passe) ---------------------
// SMTP générique et non un SDK maison : Brevo, Mailjet, SendGrid, Postmark et
// les autres en exposent tous un. Le code ne nous lie donc à aucun d'eux, et
// changer de prestataire ne coûte que des variables d'environnement.
const smtpHost = process.env.SMTP_HOST || ''
const smtpUser = process.env.SMTP_USER || ''
const smtpPass = process.env.SMTP_PASS || ''
const mailFrom = process.env.MAIL_FROM || ''

// L'URL publique NE PEUT PAS être déduite de l'en-tête Host de la requête :
// c'est le client qui le fournit, il est donc falsifiable. Un attaquant
// appellerait /forgot avec « Host: evil.tld » pour l'e-mail d'une victime, et
// le lien de réinitialisation partirait chez la victime en pointant chez lui,
// jeton valide inclus. On l'exige en configuration, jamais depuis la requête.
const publicUrl = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '')

export const config = {
  port: process.env.PORT || 3001,
  // Vide => mode dev sans base (Mongo en mémoire). Renseignez MONGODB_URI pour une vraie base.
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  operationEnd: process.env.OPERATION_END || '2026-09-15T23:59:59.000Z',
  publicUrl,
  mail: {
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    user: smtpUser,
    pass: smtpPass,
    from: mailFrom,
    // Tout ou rien : sans l'un de ces réglages on ne sait pas envoyer un lien
    // utilisable, et le front n'affichera pas « mot de passe oublié ». Une
    // porte qui ne mène nulle part est pire que pas de porte.
    enabled: Boolean(smtpHost && smtpUser && smtpPass && mailFrom && publicUrl)
  },
  // Une heure : assez pour relever ses mails, assez court pour qu'un lien
  // oublié dans une boîte ne reste pas une clé du compte.
  resetTtlMs: 60 * 60 * 1000,
  isProd
}
