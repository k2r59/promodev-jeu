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
    release: process.env.HEROKU_SLUG_COMMIT || undefined
  })
}

export { Sentry }
