import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

import HomeView from './views/HomeView.vue'
import PlayView from './views/PlayView.vue'
import LeaderboardView from './views/LeaderboardView.vue'
import ChallengesView from './views/ChallengesView.vue'
import RewardsView from './views/RewardsView.vue'
import HelpView from './views/HelpView.vue'
import AuthView from './views/AuthView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/jouer', name: 'play', component: PlayView, meta: { requiresAuth: true } },
  { path: '/classement', name: 'leaderboard', component: LeaderboardView },
  { path: '/defis', name: 'challenges', component: ChallengesView, meta: { requiresAuth: true } },
  { path: '/recompenses', name: 'rewards', component: RewardsView },
  { path: '/aide', name: 'help', component: HelpView },
  { path: '/connexion', name: 'auth', component: AuthView, meta: { guestOnly: true } },
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
  if (to.meta.requiresAuth && !auth.isAuth) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuth) {
    return { name: 'home' }
  }
})
