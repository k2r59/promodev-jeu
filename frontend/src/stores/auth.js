import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setToken } from '../api/client.js'

const TOKEN_KEY = 'promodev_ete_token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem(TOKEN_KEY) || null)
  const ready = ref(false)

  const isAuth = computed(() => !!user.value)

  function persist(tk) {
    token.value = tk
    setToken(tk)
    if (tk) localStorage.setItem(TOKEN_KEY, tk)
    else localStorage.removeItem(TOKEN_KEY)
  }

  // Ouvre une session à partir d'une réponse { token, user }. Inscription,
  // connexion et réinitialisation du mot de passe rendent toutes la même chose
  // et ouvrent la même session : un seul chemin, pour que la clé de stockage et
  // l'injection du token ne s'écrivent qu'ici.
  function adopt(res) {
    persist(res.token)
    user.value = res.user
    return res.user
  }

  async function register(payload) {
    return adopt(await api('/auth/register', { method: 'POST', body: payload }))
  }

  async function login(payload) {
    return adopt(await api('/auth/login', { method: 'POST', body: payload }))
  }

  async function fetchMe() {
    if (!token.value) {
      ready.value = true
      return
    }
    setToken(token.value)
    try {
      const res = await api('/auth/me')
      user.value = res.user
    } catch {
      persist(null)
      user.value = null
    } finally {
      ready.value = true
    }
  }

  function setUser(u) {
    if (u) user.value = u
  }

  function logout() {
    persist(null)
    user.value = null
  }

  return { user, token, ready, isAuth, adopt, register, login, fetchMe, setUser, logout }
})
