// Retour haptique du plateau. Même forme que sound.js : un module sans Vue,
// dont le store pilote l'activation.
//
// navigator.vibrate n'existe que sur Android (Safari iOS ne l'implémente pas et
// ne l'implémentera pas). Le jeu ne doit donc jamais en dépendre : c'est un
// bonus quand la plateforme suit, silencieux sinon.
let enabled = false

const supported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function setHapticsEnabled(v) {
  enabled = !!v
}

function buzz(pattern) {
  if (!enabled || !supported()) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // certains navigateurs refusent hors geste utilisateur : sans conséquence
  }
}

export const haptic = {
  tap: () => buzz(8),
  invalid: () => buzz([14, 40, 14]),
  // La secousse s'allonge avec le combo : le pouce sent la cascade monter.
  match: (combo = 1) => buzz(Math.min(10 + combo * 6, 40)),
  booster: () => buzz([12, 30, 26])
}
