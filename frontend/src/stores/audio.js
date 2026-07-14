import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { setSfxVolume } from '../game/sound.js'
import { setHapticsEnabled } from '../game/haptics.js'
import musicUrl from '../assets/audio/musique.m4a'

const KEY = 'promodev_ete_audio'

// La musique vit dans le store, pas dans un composant : elle continue de jouer
// quand on navigue entre l'accueil, le classement, les défis… Un <audio> posé
// dans une vue serait détruit à chaque changement de page.
export const useAudioStore = defineStore('audio', () => {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    // préférences illisibles : on repart des valeurs par défaut
  }

  // Coupé par défaut, volontairement : personne n'aime un site qui se met à
  // jouer de la musique sans prévenir — et les navigateurs bloquent de toute
  // façon la lecture tant que l'utilisateur n'a rien cliqué.
  const muted = ref(saved.muted ?? true)
  const musicVol = ref(clamp(saved.music, 0.4))
  const sfxVol = ref(clamp(saved.sfx, 0.7))
  // Les vibrations, elles, sont actives par défaut : discrètes, elles ne
  // dérangent personne autour et c'est ce qui donne du corps au plateau au
  // doigt. Elles ne suivent pas `muted` — couper le son en réunion ne veut pas
  // dire renoncer au retour tactile.
  const haptics = ref(saved.haptics ?? true)

  function clamp(v, dflt) {
    const n = Number(v)
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : dflt
  }

  let el = null
  function audio() {
    if (!el) {
      el = new Audio(musicUrl)
      el.loop = true
      el.preload = 'none' // rien n'est téléchargé tant que le son est coupé
    }
    return el
  }

  const effectiveMusic = computed(() => (muted.value ? 0 : musicVol.value))
  const effectiveSfx = computed(() => (muted.value ? 0 : sfxVol.value))

  function apply() {
    setSfxVolume(effectiveSfx.value)
    setHapticsEnabled(haptics.value)
    const a = audio()
    a.volume = effectiveMusic.value
    if (effectiveMusic.value > 0) {
      // play() est une promesse rejetée si le navigateur bloque l'autoplay :
      // sans le catch, ça remonte en erreur non gérée dans la console.
      a.play().catch(() => {})
    } else {
      a.pause()
    }
  }

  function persist() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ muted: muted.value, music: musicVol.value, sfx: sfxVol.value, haptics: haptics.value })
      )
    } catch {
      // stockage indisponible (navigation privée) : on continue sans mémoriser
    }
  }

  watch([muted, musicVol, sfxVol, haptics], () => {
    apply()
    persist()
  })

  function toggleMute() {
    muted.value = !muted.value
  }

  // Applique l'état mémorisé au démarrage. Si le son était actif, le navigateur
  // refusera la lecture tant qu'il n'y a pas eu de geste : on réessaie au
  // premier clic.
  function init() {
    setSfxVolume(effectiveSfx.value)
    setHapticsEnabled(haptics.value)
    if (muted.value) return
    apply()
    const retry = () => {
      apply()
      window.removeEventListener('pointerdown', retry)
    }
    window.addEventListener('pointerdown', retry, { once: true })
  }

  // `hapticsSupported` : inutile de proposer le réglage sur un appareil qui ne
  // sait pas vibrer (tout iOS, et n'importe quel desktop).
  const hapticsSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

  return { muted, musicVol, sfxVol, haptics, hapticsSupported, toggleMute, init }
})
