// Effets sonores. La plupart sont SYNTHÉTISÉS via la Web Audio API — ils ne
// coûtent rien, se déclinent (le pitch du combo monte avec lui) et ne peuvent
// pas manquer au chargement. Quelques-uns sont des échantillons, là où une
// vraie prise sonne mieux qu'un oscillateur.
//
// Les deux mondes partagent le même AudioContext et le même volume maître :
// c'est ce qui garantit qu'un réglage agit sur tout, sans quoi le curseur du
// joueur ne toucherait qu'une moitié des sons.
// Tous rognés au ras du son : les sources traînaient jusqu'à 0,5s de silence en
// tête, ce qui se serait entendu comme de la latence sur un retour de jeu.
import urlErreur from '../assets/audio/sfx/erreur.mp3'
import urlJouer from '../assets/audio/sfx/jouer.mp3'
import urlBombe from '../assets/audio/sfx/bombe.mp3'
import urlEclair from '../assets/audio/sfx/eclair.mp3'
import urlVague from '../assets/audio/sfx/vague.mp3'
import urlFin from '../assets/audio/sfx/fin.mp3'
import urlClic from '../assets/audio/sfx/clic.mp3'
import urlCombo from '../assets/audio/sfx/combo.mp3'

// Un booster a son propre son : la bombe explose, l'éclair claque, la vague
// déferle. Table plutôt que trois branches, pour que boosterSfx() suive
// n'importe quelle clé de BOOSTERS sans qu'on y touche.
const BOOSTER_SFX = { bombe: urlBombe, eclair: urlEclair, vague: urlVague }

const SAMPLES = [urlErreur, urlJouer, urlBombe, urlEclair, urlVague, urlFin, urlClic, urlCombo]

let ctx = null
// Volume maître des effets, 0 → 1. Piloté par le store audio.
let volume = 0

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return ctx
}

// --- Échantillons ----------------------------------------------------------
// decodeAudioData est asynchrone : sans préchargement, le tout premier échange
// raté serait muet, le temps que le fichier arrive et se décode. D'où le
// chargement dès que le son est activé — et pas avant : couper le son doit
// aussi vouloir dire ne rien télécharger.
const buffers = new Map()

function load(url) {
  if (buffers.has(url)) return buffers.get(url)
  const c = ac()
  if (!c) return null
  const p = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((a) => c.decodeAudioData(a))
    // Un son qui manque ne doit jamais casser une partie : on rend null et le
    // jeu continue en silence.
    .catch(() => null)
  buffers.set(url, p)
  return p
}

function sample(url, gain = 1) {
  if (volume <= 0) return
  const c = ac()
  if (!c) return
  Promise.resolve(load(url)).then((buf) => {
    if (!buf) return
    const src = c.createBufferSource()
    const g = c.createGain()
    src.buffer = buf
    g.gain.value = gain * volume
    src.connect(g).connect(c.destination)
    src.start()
  })
}

export function setSfxVolume(v) {
  const before = volume
  volume = Math.max(0, Math.min(1, Number(v) || 0))
  // Passage de muet à audible : on précharge, pour que le premier son sorte.
  if (before <= 0 && volume > 0) SAMPLES.forEach(load)
}
export function getSfxVolume() {
  return volume
}

function tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.15, slide = 0 }) {
  if (volume <= 0) return
  const c = ac()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur)
  // exponentialRampToValueAtTime n'accepte pas 0 : on part d'un gain non nul.
  g.gain.setValueAtTime(Math.max(0.0001, gain * volume), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  osc.connect(g).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + dur)
}

export const sfx = {
  // Synthétisé : joué à chaque échange, une prise s'entendrait répétitive.
  swap: () => tone({ freq: 320, dur: 0.08, type: 'triangle', gain: 0.1, slide: 120 }),
  invalid: () => sample(urlErreur, 0.9),
  clic: () => sample(urlClic, 0.7),
  jouer: () => sample(urlJouer, 0.9),
  // Le pitch monte avec le combo : c'est ce qui rend la cascade grisante, et
  // aucun échantillon ne saurait le faire.
  match: (combo = 1) => tone({ freq: 380 + combo * 70, dur: 0.14, type: 'sine', gain: 0.14, slide: 200 }),
  // À déclencher UNE FOIS par cascade, quand le combo naît — pas à chaque
  // palier : l'échantillon dure 0,8s et les paliers s'enchaînent toutes les
  // ~500ms, trois de suite donneraient de la bouillie.
  combo: () => sample(urlCombo, 0.8),
  // Sans clé (ou clé inconnue), on retombe sur la synthèse : un booster ajouté
  // demain sonnera, même sans son dédié.
  booster: (key) => {
    const url = BOOSTER_SFX[key]
    if (url) return sample(url, 0.85)
    tone({ freq: 220, dur: 0.18, type: 'square', gain: 0.12, slide: 400 })
    tone({ freq: 660, dur: 0.22, type: 'triangle', gain: 0.08, slide: 300 })
  },
  reward: () => {
    ;[523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.12 }), i * 90)
    )
  },
  countdown: () => tone({ freq: 880, dur: 0.1, type: 'square', gain: 0.1 }),
  gameover: () => sample(urlFin, 0.9)
}
