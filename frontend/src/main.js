import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router.js'
import './assets/styles.css'
import { useAuthStore } from './stores/auth.js'
import { useAudioStore } from './stores/audio.js'
import { setupPwa } from './pwa.js'

const app = createApp(App)
app.use(createPinia())

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
