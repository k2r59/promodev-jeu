import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router.js'
import './assets/styles.css'
import { useAuthStore } from './stores/auth.js'

const app = createApp(App)
app.use(createPinia())

// Restaure la session avant de monter (récupère le profil si token présent).
const auth = useAuthStore()
auth.fetchMe().finally(() => {
  app.use(router)
  app.mount('#app')
})

// Enregistrement du service worker (PWA) — uniquement en prod pour ne pas
// interférer avec le hot-reload de Vite en dev.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
