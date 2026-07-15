<script setup>
// Avatar de la barre de jeu, et la fiche qui s'ouvre derrière.
//
// En portrait, l'écran d'accueil EST le jeu : la barre du site disparaît. Tout
// ce qu'elle portait (pseudo, niveau, XP, déconnexion) se retrouve ici, à un
// pouce du plateau, plutôt que d'être perdu.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, Gem, X } from 'lucide-vue-next'
import Avatar from './Avatar.vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()
const open = ref(false)

const XP_PER_LEVEL = 500
const xpInLevel = computed(() => (auth.user ? auth.user.xp % XP_PER_LEVEL : 0))
const xpPct = computed(() => Math.round((xpInLevel.value / XP_PER_LEVEL) * 100))

function onKeydown(e) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

// Une feuille ouverte au-dessus d'un plateau qui défile derrière n'a pas de
// sens : le fond est déjà figé par le shell, mais on ferme sur navigation.
watch(open, (v) => v && (document.activeElement?.blur?.() ?? null))

function logout() {
  open.value = false
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div v-if="auth.user" class="ps">
    <button
      class="ps__btn"
      :aria-label="`Profil de ${auth.user.pseudo}`"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="open = true"
    >
      <span class="ps__avatar"><Avatar :value="auth.user.avatar" /></span>
      <span class="ps__lvl">{{ auth.user.level }}</span>
    </button>

    <teleport to="body">
      <transition name="ps-fade">
        <div v-if="open" class="ps__scrim" @click="open = false"></div>
      </transition>
      <transition name="ps-slide">
        <div v-if="open" class="ps__sheet" role="dialog" aria-modal="true" aria-label="Profil">
          <button class="ps__close" aria-label="Fermer" @click="open = false">
            <X :size="18" aria-hidden="true" />
          </button>

          <div class="ps__head">
            <span class="ps__avatar ps__avatar--lg"><Avatar :value="auth.user.avatar" /></span>
            <div class="ps__id">
              <b class="ps__pseudo">{{ auth.user.pseudo }}</b>
              <span class="ps__soc" v-if="auth.user.societe">{{ auth.user.societe }}</span>
            </div>
          </div>

          <div class="ps__xp">
            <div class="ps__xp-top">
              <span>Niveau {{ auth.user.level }}</span>
              <span>{{ xpInLevel }} / {{ XP_PER_LEVEL }} XP</span>
            </div>
            <div class="progress progress--sun"><div class="progress__bar" :style="{ width: xpPct + '%' }"></div></div>
          </div>

          <div class="ps__gems">
            <Gem :size="18" aria-hidden="true" />
            <b>{{ auth.user.gems }}</b>
            <span>gemmes</span>
          </div>

          <button class="ps__logout" @click="logout">
            <LogOut :size="16" aria-hidden="true" /> Se déconnecter
          </button>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style scoped>
.ps {
  flex-shrink: 0;
}
.ps__btn {
  position: relative;
  display: block;
  padding: 0;
  background: none;
  border-radius: 50%;
  line-height: 0;
}
.ps__btn:focus-visible {
  outline: 3px solid var(--sky);
  outline-offset: 2px;
}
.ps__avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--sky-2), var(--sky));
  font-size: 1.25rem;
  line-height: 1;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
}
/* Pastille de niveau posée sur l'avatar : l'information tient dans le même
   encombrement, ce qui compte quand la barre fait 64px de haut en tout. */
.ps__lvl {
  position: absolute;
  right: -3px;
  bottom: -3px;
  min-width: 17px;
  height: 17px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--sun);
  color: #7a4b00;
  border: 2px solid #fff;
  font-size: 0.6rem;
  font-weight: 900;
  display: grid;
  place-items: center;
  line-height: 1;
}

.ps__scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(20, 40, 70, 0.5);
  backdrop-filter: blur(3px);
}
/* Feuille ancrée en bas : le pouce y arrive sans changer de prise. */
.ps__sheet {
  position: fixed;
  z-index: 91;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 22px 20px calc(22px + var(--safe-bottom));
  background: #fff;
  border-radius: 26px 26px 0 0;
  box-shadow: var(--shadow-lg);
}
.ps__close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f1f3fa;
  color: var(--ink-soft);
}
.ps__close:hover {
  background: #ffe1e6;
  color: var(--coral);
}
.ps__head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.ps__avatar--lg {
  width: 60px;
  height: 60px;
  font-size: 2rem;
}
.ps__id {
  min-width: 0;
}
.ps__pseudo {
  display: block;
  font-size: 1.25rem;
  font-weight: 900;
  line-height: 1.2;
}
.ps__soc {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.ps__xp {
  margin-bottom: 16px;
}
.ps__xp-top {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--ink-soft);
  margin-bottom: 6px;
}
.ps__gems {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: #eaf7ff;
  color: var(--sea);
  font-weight: 800;
  margin-bottom: 18px;
}
.ps__gems b {
  font-size: 1.15rem;
}
.ps__gems span {
  color: var(--ink-soft);
  font-size: 0.85rem;
}
.ps__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px;
  border-radius: 999px;
  background: #f3f6fc;
  color: var(--ink-soft);
  font-weight: 800;
  font-size: 0.9rem;
}
.ps__logout:hover {
  background: #ffe1e6;
  color: var(--coral);
}

/* Au-delà du portrait étroit, la feuille redevient une carte centrée. */
@media (min-width: 620px) {
  .ps__sheet {
    left: 50%;
    bottom: 50%;
    right: auto;
    width: 360px;
    transform: translate(-50%, 50%);
    border-radius: var(--radius);
    padding-bottom: 22px;
  }
}

.ps-fade-enter-active,
.ps-fade-leave-active {
  transition: opacity 0.2s ease;
}
.ps-fade-enter-from,
.ps-fade-leave-to {
  opacity: 0;
}
.ps-slide-enter-active,
.ps-slide-leave-active {
  transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease;
}
.ps-slide-enter-from,
.ps-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
@media (min-width: 620px) {
  .ps-slide-enter-from,
  .ps-slide-leave-to {
    transform: translate(-50%, 50%) scale(0.9);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ps-slide-enter-active,
  .ps-slide-leave-active {
    transition: opacity 0.2s ease;
  }
  .ps-slide-enter-from,
  .ps-slide-leave-to {
    transform: none;
  }
}
</style>
