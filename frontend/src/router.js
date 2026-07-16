import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

import HomeView from './views/HomeView.vue'
import LeaderboardView from './views/LeaderboardView.vue'
import ChallengesView from './views/ChallengesView.vue'
import RewardsView from './views/RewardsView.vue'
import HelpView from './views/HelpView.vue'
import ResetPasswordView from './views/ResetPasswordView.vue'

// Le jeu et le formulaire vivent désormais dans la colonne centrale de l'accueil :
// ces deux URL n'ont plus d'écran propre mais restent valides (liens, favoris).
const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/jouer', redirect: '/' },
  { path: '/connexion', name: 'auth', redirect: '/' },
  { path: '/classement', name: 'leaderboard', component: LeaderboardView },
  { path: '/defis', name: 'challenges', component: ChallengesView, meta: { requiresAuth: true } },
  { path: '/recompenses', name: 'rewards', component: RewardsView },
  { path: '/aide', name: 'help', component: HelpView },
  // Cible des liens envoyés par e-mail (/reinitialiser?token=…). Doit rester
  // hors de la garde requiresAuth : on y arrive justement sans pouvoir se
  // connecter. Le catch-all ci-dessous renverrait un lien mal recopié vers
  // l'accueil sans un mot d'explication — la vue gère elle-même le jeton
  // manquant, c'est pourquoi elle est déclarée avant.
  { path: '/reinitialiser', name: 'reset-password', component: ResetPasswordView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  // Les écrans protégés renvoient à l'accueil AVEC le formulaire ouvert : depuis
  // que l'accueil déconnecté est une page d'accroche, un simple retour laisserait
  // le visiteur devant le cadeau, sans rien qui explique pourquoi son clic sur
  // « Défis » n'a rien donné. `?mode=connexion` est ce que HomeView écoute.
  if (to.meta.requiresAuth && !auth.isAuth) {
    return { name: 'home', query: { mode: 'connexion' } }
  }
})
