import nodemailer from 'nodemailer'
import { config } from './config.js'

// Transporteur créé à la première utilisation, puis réutilisé : nodemailer
// garde le pool de connexions SMTP ouvert, en recréer un par envoi ferait
// payer une poignée de main TLS à chaque mot de passe oublié.
let transporter = null

function tx() {
  if (!config.mail.enabled) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      // 465 est le port du SMTP implicitement chiffré ; 587 négocie le TLS
      // après coup (STARTTLS), ce que nodemailer fait seul.
      secure: config.mail.port === 465,
      auth: { user: config.mail.user, pass: config.mail.pass }
    })
  }
  return transporter
}

const TEXTE = (pseudo, lien) => `Bonjour ${pseudo},

Vous avez demandé à réinitialiser le mot de passe de votre compte du Jeu de l'Été PromoDev.

Cliquez sur ce lien pour choisir un nouveau mot de passe :
${lien}

Ce lien est valable une heure et ne peut servir qu'une fois.

Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.

L'équipe PromoDev`

const HTML = (pseudo, lien) => `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#f3f6fc;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2b2d5a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">
    <h1 style="margin:0 0 16px;font-size:20px">Réinitialiser votre mot de passe</h1>
    <p style="margin:0 0 12px;line-height:1.5">Bonjour ${pseudo},</p>
    <p style="margin:0 0 20px;line-height:1.5">
      Vous avez demandé à réinitialiser le mot de passe de votre compte du Jeu de l'Été PromoDev.
    </p>
    <p style="margin:0 0 24px">
      <a href="${lien}" style="display:inline-block;background:#ff6b6b;color:#fff;text-decoration:none;font-weight:800;padding:13px 22px;border-radius:999px">
        Choisir un nouveau mot de passe
      </a>
    </p>
    <p style="margin:0 0 12px;line-height:1.5;font-size:14px;color:#6b6f9c">
      Ce lien est valable une heure et ne peut servir qu'une fois.
    </p>
    <p style="margin:0;line-height:1.5;font-size:14px;color:#6b6f9c">
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.
    </p>
  </div>
</body></html>`

export async function sendPasswordReset(to, pseudo, lien) {
  const t = tx()
  if (!t) throw new Error('SMTP non configuré')
  await t.sendMail({
    from: config.mail.from,
    to,
    subject: 'Réinitialiser votre mot de passe — Jeu de l’Été PromoDev',
    // Les deux versions : certains clients (et certains filtres anti-spam)
    // n'aiment pas un e-mail HTML sans équivalent texte.
    text: TEXTE(pseudo, lien),
    html: HTML(pseudo, lien)
  })
}
