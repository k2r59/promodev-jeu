<script setup>
import { computed } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import FeaturesBar from './components/FeaturesBar.vue'
import logoUrl from './assets/brand/logo.png'
import icoAccueil from './assets/nav/accueil.png'
import icoClassement from './assets/nav/classement.png'
import icoDefis from './assets/nav/defis.png'
import icoRecompenses from './assets/nav/recompenses.png'
import icoAide from './assets/nav/aide.png'

const auth = useAuthStore()
const router = useRouter()

const nav = [
  { to: '/', label: 'Accueil', icon: icoAccueil },
  { to: '/classement', label: 'Classement', icon: icoClassement },
  { to: '/defis', label: 'Défis', icon: icoDefis },
  { to: '/recompenses', label: 'Récompenses', icon: icoRecompenses },
  { to: '/aide', label: 'Aide', icon: icoAide }
]

const xpInLevel = computed(() => {
  if (!auth.user) return 0
  return auth.user.xp % 500
})
const xpPct = computed(() => Math.round((xpInLevel.value / 500) * 100))

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__inner container">
        <RouterLink to="/" class="brand">
          <img class="brand__logo" :src="logoUrl" alt="promodev — Le Jeu de l'Été" />
        </RouterLink>

        <nav class="mainnav">
          <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="mainnav__link" active-class="is-active">
            <img class="mainnav__ico" :src="n.icon" alt="" aria-hidden="true" />
            <span class="mainnav__lbl">{{ n.label }}</span>
          </RouterLink>
        </nav>

        <div class="topbar__right">
          <template v-if="auth.isAuth">
            <div class="userchip">
              <div class="userchip__avatar">{{ auth.user.avatar || '😎' }}</div>
              <div class="userchip__info">
                <div class="userchip__name">{{ auth.user.pseudo }}</div>
                <div class="userchip__level">Niveau {{ auth.user.level }}</div>
                <div class="xpbar"><div class="xpbar__fill" :style="{ width: xpPct + '%' }"></div></div>
              </div>
              <button class="userchip__logout" title="Se déconnecter" @click="logout">⎋</button>
            </div>
            <div class="gems">
              <span class="gems__ico">💎</span>
              <span class="gems__val">{{ auth.user.gems }}</span>
            </div>
          </template>
          <template v-else>
            <RouterLink to="/connexion" class="btn btn--sun">Se connecter</RouterLink>
          </template>
        </div>
      </div>
    </header>

    <main class="app-main container">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <FeaturesBar />

    <!-- Barre de navigation mobile -->
    <nav class="bottomnav">
      <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="bottomnav__link" active-class="is-active">
        <img class="bottomnav__ico" :src="n.icon" alt="" aria-hidden="true" />
        <span class="bottomnav__lbl">{{ n.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

/* Desktop : l'app tient dans l'écran, sans scroll de page. Le header et le
   bandeau du bas gardent leur taille, `main` absorbe le reste (min-height:0 est
   indispensable pour qu'un enfant flex puisse rétrécir sous son contenu).
   Sous 620px de haut on repasse en page défilable : plus rien ne tiendrait. */
@media (min-width: 861px) and (min-height: 620px) {
  .app-shell {
    height: 100dvh;
    overflow: hidden;
  }
  .topbar {
    flex-shrink: 0;
  }
  .app-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding-bottom: 14px;
  }
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(43, 45, 90, 0.08);
}
.topbar__inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
  padding-bottom: 10px;
}
.brand {
  display: flex;
  align-items: center;
  line-height: 0;
  flex-shrink: 0;
}
.brand__logo {
  height: 46px;
  width: auto;
}
.mainnav {
  display: flex;
  gap: 4px;
  margin-left: auto;
}
.mainnav__link {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border-radius: 999px;
  font-weight: 800;
  color: var(--ink-soft);
  transition: background 0.15s, color 0.15s;
}
.mainnav__link:hover {
  background: rgba(57, 182, 255, 0.12);
  color: var(--ink);
}
.mainnav__link.is-active {
  background: #fff;
  color: var(--coral);
  box-shadow: var(--shadow);
}
.mainnav__ico {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex-shrink: 0;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.userchip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  padding: 6px 8px 6px 6px;
  border-radius: 999px;
  box-shadow: var(--shadow);
}
.userchip__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--sky-2), var(--sky));
  display: grid;
  place-items: center;
  font-size: 1.4rem;
}
.userchip__info {
  min-width: 92px;
}
.userchip__name {
  font-weight: 900;
  font-size: 0.95rem;
  line-height: 1.1;
}
.userchip__level {
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-weight: 700;
}
.xpbar {
  height: 6px;
  border-radius: 999px;
  background: #e7ecf5;
  overflow: hidden;
  margin-top: 3px;
}
.xpbar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sun), #ffe08a);
  transition: width 0.5s;
}
.userchip__logout {
  background: #f1f3fa;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 1rem;
  color: var(--ink-soft);
}
.userchip__logout:hover {
  background: #ffe1e6;
  color: var(--coral);
}
.gems {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  padding: 9px 14px;
  border-radius: 999px;
  box-shadow: var(--shadow);
  font-weight: 900;
}
.gems__ico {
  font-size: 1.1rem;
}

/* Nav mobile */
.bottomnav {
  display: none;
}

@media (max-width: 860px) {
  .mainnav {
    display: none;
  }
  .brand__logo {
    height: 34px;
  }
  .userchip__info {
    display: none;
  }
  .bottomnav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 60;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(10px);
    box-shadow: 0 -4px 20px rgba(43, 45, 90, 0.12);
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
    justify-content: space-around;
  }
  .bottomnav__link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    border-radius: 14px;
    color: var(--ink-soft);
    font-weight: 800;
    font-size: 0.68rem;
  }
  .bottomnav__link.is-active {
    color: var(--coral);
  }
  .bottomnav__ico {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
  main.container {
    padding-bottom: 90px;
  }
}
</style>
