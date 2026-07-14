import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

import HomeView from './views/HomeView.vue'
import LeaderboardView from './views/LeaderboardView.vue'
import ChallengesView from './views/ChallengesView.vue'
import RewardsView from './views/RewardsView.vue'
import HelpView from './views/HelpView.vue'

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
  // Les écrans protégés renvoient à l'accueil, qui affiche le formulaire.
  if (to.meta.requiresAuth && !auth.isAuth) {
    return { name: 'home' }
  }
})
