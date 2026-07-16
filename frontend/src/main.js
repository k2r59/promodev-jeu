import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'
import App from './App.vue'
import { router } from './router.js'
import './assets/styles.css'
import { useAuthStore } from './stores/auth.js'
import { useAudioStore } from './stores/audio.js'
import { sfx } from './game/sound.js'
import { setupPwa } from './pwa.js'

const app = createApp(App)
app.use(createPinia())

// Sentry — erreurs seules (tracing coupé pour épargner le quota de l'org), actif
// uniquement en build de prod avec un DSN (projet Sentry « summer-game »). En dev
// il ne s'initialise pas : on ne pollue pas le projet avec les erreurs locales.
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENV ?? import.meta.env.MODE,
    tracesSampleRate: 0,
    // Bruits non actionnables : chargements de modules avortés (déploiement en
    // cours, réseau coupé), erreurs réseau transitoires, quirks ResizeObserver.
    // Sans ce filtre, les catch réseau de l'app noieraient les vraies erreurs.
    ignoreErrors: [
      'Failed to fetch dynamically imported module',
      'error loading dynamically imported module',
      'Importing a module script failed',
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'Load failed',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network Error'
    ]
  })
}

// Un clic sur n'importe quel bouton fait un son. Un seul écouteur ici plutôt
// qu'un @click sur chaque bouton : il y en a des dizaines à travers l'app, et
// tout bouton ajouté demain en hérite sans qu'on y pense.
//
// `pointerdown` et non `click` : le son doit partir au doigt qui appuie, pas au
// doigt qui relâche — sur mobile ça change tout. `capture` pour ne pas dépendre
// d'un stopPropagation posé quelque part.
//
// Les tuiles du plateau ne sont pas concernées : c'est un canvas, pas des
// boutons — elles ont déjà leur propre son d'échange.
document.addEventListener(
  'pointerdown',
  (e) => {
    const el = e.target instanceof Element ? e.target.closest('button, .btn') : null
    if (el && !el.disabled) sfx.clic()
  },
  { capture: true }
)

// Restaure les préférences de son (coupé par défaut).
useAudioStore().init()

// Restaure la session avant de monter (récupère le profil si token présent).
const auth = useAuthStore()
auth.fetchMe().finally(() => {
  app.use(router)
  app.mount('#app')
})

// PWA : en production, et sur mobile/tablette seulement (voir pwa.js).
setupPwa()
