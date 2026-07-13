// Effets sonores générés via la Web Audio API (aucun asset externe requis).
let ctx = null
let enabled = true

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setSoundEnabled(v) {
  enabled = v
}
export function isSoundEnabled() {
  return enabled
}

function tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.15, slide = 0 }) {
  if (!enabled) return
  const c = ac()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur)
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  osc.connect(g).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + dur)
}

export const sfx = {
  swap: () => tone({ freq: 320, dur: 0.08, type: 'triangle', gain: 0.1, slide: 120 }),
  invalid: () => tone({ freq: 180, dur: 0.14, type: 'sawtooth', gain: 0.08, slide: -60 }),
  // Le pitch monte avec le combo pour un feedback satisfaisant
  match: (combo = 1) => tone({ freq: 380 + combo * 70, dur: 0.14, type: 'sine', gain: 0.14, slide: 200 }),
  booster: () => {
    tone({ freq: 220, dur: 0.18, type: 'square', gain: 0.12, slide: 400 })
    tone({ freq: 660, dur: 0.22, type: 'triangle', gain: 0.08, slide: 300 })
  },
  reward: () => {
    ;[523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.12 }), i * 90)
    )
  },
  countdown: () => tone({ freq: 880, dur: 0.1, type: 'square', gain: 0.1 }),
  gameover: () => {
    ;[440, 330, 262].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.24, type: 'sine', gain: 0.14 }), i * 160))
  }
}
