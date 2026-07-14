<script setup>
// Invite à installer le jeu sur l'écran d'accueil.
//
// Les deux plateformes n'offrent pas du tout la même prise :
//
// · Android / Chrome : le navigateur émet `beforeinstallprompt` quand il juge le
//   site installable. On le retient, on propose notre propre bandeau, et le clic
//   rouvre l'invite native. C'est la seule façon de choisir QUAND demander —
//   sinon Chrome décide seul, souvent au pire moment.
//
// · iOS / Safari : aucune API, et il n'y en aura pas. `beforeinstallprompt` n'y
//   existe pas et `prompt()` non plus : l'installation passe obligatoirement par
//   Partager → « Sur l'écran d'accueil ». On ne peut donc que montrer le geste.
//
// D'où deux modes, et pas un bandeau générique qui mentirait sur l'un des deux.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Download, X, Share } from 'lucide-vue-next'
import { isMobileOrTablet } from '../pwa.js'

const KEY = 'promodev_ete_install'
// Refusée, l'invite se tait deux semaines. Assez pour ne pas harceler, assez peu
// pour retenter à l'opération suivante.
const SILENCE_MS = 14 * 24 * 60 * 60 * 1000

const promptEvent = ref(null)
const visible = ref(false)
const mode = ref('android') // 'android' | 'ios'

// Déjà installé : l'app tourne en plein écran, il n'y a plus rien à proposer.
const dejaInstalle = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const estIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Safari seulement : dans Chrome ou Firefox sur iOS, « Sur l'écran d'accueil »
// n'existe pas. Afficher le mode d'emploi y serait un mensonge.
const estSafari = () => /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)

function refusee() {
  try {
    const t = Number(localStorage.getItem(KEY))
    return Number.isFinite(t) && Date.now() - t < SILENCE_MS
  } catch {
    return false // stockage indisponible : on propose, quitte à re-proposer
  }
}
function taire() {
  try {
    localStorage.setItem(KEY, String(Date.now()))
  } catch {
    // navigation privée : le bandeau reviendra, tant pis
  }
  visible.value = false
}

function onBeforeInstall(e) {
  // Sans preventDefault, Chrome affiche sa propre invite et on perd la main.
  e.preventDefault()
  promptEvent.value = e
  if (!refusee() && !dejaInstalle()) {
    mode.value = 'android'
    visible.value = true
  }
}
function onInstalled() {
  visible.value = false
  promptEvent.value = null
}

async function installer() {
  const e = promptEvent.value
  if (!e) return
  visible.value = false
  promptEvent.value = null // une invite native ne se rejoue pas
  try {
    e.prompt()
    await e.userChoice
  } catch {
    // invite refusée par le navigateur : rien à rattraper
  }
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)

  // iOS n'émet rien : c'est à nous de décider d'afficher le mode d'emploi.
  if (isMobileOrTablet() && estIOS() && estSafari() && !dejaInstalle() && !refusee()) {
    mode.value = 'ios'
    visible.value = true
  }
})
onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
})

const titre = computed(() => (mode.value === 'ios' ? 'Ajoutez le jeu à votre écran d’accueil' : 'Installez le jeu'))
</script>

<template>
  <transition name="inst">
    <aside v-if="visible" class="inst" role="dialog" aria-label="Installer le jeu">
      <img class="inst__ico" src="/icons/icon-192.png" alt="" aria-hidden="true" />
      <div class="inst__txt">
        <b>{{ titre }}</b>
        <span v-if="mode === 'ios'">
          Touchez <Share :size="13" aria-hidden="true" /> puis « Sur l’écran d’accueil ».
        </span>
        <span v-else>Jouez en plein écran, sans passer par le navigateur.</span>
      </div>
      <button v-if="mode === 'android'" class="inst__go" @click="installer">
        <Download :size="15" aria-hidden="true" /> Installer
      </button>
      <button class="inst__close" aria-label="Ne plus proposer" @click="taire">
        <X :size="17" aria-hidden="true" />
      </button>
    </aside>
  </transition>
</template>

<style scoped>
/* Posé juste au-dessus de la nav du bas : c'est là que le pouce est déjà, et le
   haut de l'écran appartient au jeu. */
.inst {
  position: fixed;
  z-index: 70;
  left: 8px;
  right: 8px;
  bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 8px);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-lg);
}
.inst__ico {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}
.inst__txt {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.inst__txt b {
  font-size: 0.85rem;
  font-weight: 900;
  line-height: 1.2;
}
.inst__txt span {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink-soft);
  line-height: 1.3;
}
/* L'icône Partager d'iOS doit se lire dans la phrase, pas flotter à côté. */
.inst__txt span :deep(svg) {
  vertical-align: -2px;
  color: var(--sky);
}
.inst__go {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 9px 13px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--coral-2), var(--coral));
  color: #fff;
  font-weight: 800;
  font-size: 0.8rem;
  box-shadow: 0 3px 10px rgba(255, 94, 120, 0.4);
}
.inst__go:active {
  transform: translateY(1px);
}
.inst__close {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f1f3fa;
  color: var(--ink-soft);
}
.inst-enter-active,
.inst-leave-active {
  transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease;
}
.inst-enter-from,
.inst-leave-to {
  transform: translateY(140%);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .inst-enter-active,
  .inst-leave-active {
    transition: opacity 0.2s ease;
  }
  .inst-enter-from,
  .inst-leave-to {
    transform: none;
  }
}
</style>
