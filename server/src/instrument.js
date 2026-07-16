// Initialisation de Sentry — DOIT être le tout premier import de index.js, avant
// express et les routes : le SDK instrumente les modules au chargement.
//
// dotenv est chargé ICI, avant tout : config.js le refait (idempotent), mais on
// a besoin de SENTRY_DSN dès maintenant, avant que ce fichier ne s'exécute.
import dotenv from 'dotenv'
dotenv.config()

import * as Sentry from '@sentry/node'

// Actif seulement si une DSN est fournie — donc en prod (Heroku), pas en dev :
// on ne veut pas polluer le projet Sentry avec les erreurs de développement, ni
// forcer chaque contributeur à configurer une DSN pour lancer le serveur.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Erreurs seules : pas de tracing de performance (tracesSampleRate 0), comme
    // le front des autres apps PromoDev — pour épargner le quota de l'org. On
    // veut savoir ce qui casse, pas mesurer les temps de réponse.
    tracesSampleRate: 0,
    // Le commit déployé, quand Heroku le fournit : relie une erreur à sa version.
    release: process.env.HEROKU_SLUG_COMMIT || undefined,

    // NE JAMAIS envoyer de données personnelles ni le corps des requêtes à
    // Sentry. Par défaut, @sentry/node capture le body : une erreur sur
    // /register, /login ou /reset y expédierait le MOT DE PASSE EN CLAIR (et le
    // jeton de reset, l'e-mail, le téléphone). On coupe la capture à la source.
    sendDefaultPii: false,
    integrations: [Sentry.httpIntegration({ ignoreIncomingRequestBody: () => true })],
    // Filet, indépendant de la version du SDK : on retire tout ce qui pourrait
    // subsister — le corps, les cookies, et surtout l'en-tête Authorization, qui
    // porte le JWT (valable 30 jours, donc une clé de compte s'il fuitait).
    beforeSend(event) {
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        const h = event.request.headers
        if (h) {
          delete h.authorization
          delete h.Authorization
          delete h.cookie
          delete h.Cookie
        }
      }
      return event
    }
  })
}

export { Sentry }
