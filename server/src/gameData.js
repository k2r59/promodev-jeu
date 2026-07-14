// Définitions des défis quotidiens et badges — source de vérité côté serveur
// (le front a un miroir purement visuel dans src/game/gameData.js).

// Les défis sont "quotidiens" : la progression est stockée par jour (clé YYYY-MM-DD).
// Chaque défi expose une fonction match(session) qui, à partir d'une partie,
// renvoie l'incrément de progression. Une partie fournit { score, maxCombo,
// boostersUsed, matches } — rien d'autre n'est mesurable.
//
// Le pool complet : on n'en tire que DAILY_COUNT par jour (voir dailyPick).
//
// Calibrage : un alignement de 3 rapporte 30 points (3 tuiles x 10 x combo 1),
// et l'objectif affiché dans le HUD est 3 000 points en 2 minutes. Un défi doit
// se boucler en une à deux parties — au-delà on demande dix minutes de jeu pour
// 50 gemmes, et plus personne ne les finit.
export const DAILY_CHALLENGES = [
  // --- Score sur une seule partie (3 000 = l'objectif du HUD) ---
  {
    id: 'score_1000',
    label: 'Marquer 1 000 points en une partie',
    icon: '⭐',
    goal: 1,
    reward: 20,
    xp: 40,
    match: (s) => (s.score >= 1000 ? 1 : 0)
  },
  {
    id: 'score_2000',
    label: 'Marquer 2 000 points en une partie',
    icon: '⭐',
    goal: 1,
    reward: 35,
    xp: 70,
    match: (s) => (s.score >= 2000 ? 1 : 0)
  },
  {
    id: 'score_3000',
    label: 'Marquer 3 000 points en une partie',
    icon: '🌞',
    goal: 1,
    reward: 50,
    xp: 100,
    match: (s) => (s.score >= 3000 ? 1 : 0)
  },
  {
    id: 'score_4500',
    label: 'Marquer 4 500 points en une partie',
    icon: '🌞',
    goal: 1,
    reward: 75,
    xp: 150,
    match: (s) => (s.score >= 4500 ? 1 : 0)
  },

  // --- Assiduité ---
  {
    id: 'play_2',
    label: 'Faire 2 parties rapides',
    icon: '🏄',
    goal: 2,
    reward: 30,
    xp: 60,
    match: () => 1
  },
  {
    id: 'play_3',
    label: 'Faire 3 parties dans la journée',
    icon: '🏄',
    goal: 3,
    reward: 45,
    xp: 90,
    match: () => 1
  },

  // --- Combos ---
  {
    id: 'combo_x3',
    label: 'Réaliser un combo x3',
    icon: '🕶️',
    goal: 1,
    reward: 25,
    xp: 50,
    match: (s) => (s.maxCombo >= 3 ? 1 : 0)
  },
  {
    id: 'combo_x4',
    label: 'Réaliser un combo x4',
    icon: '🕶️',
    goal: 1,
    reward: 35,
    xp: 70,
    match: (s) => (s.maxCombo >= 4 ? 1 : 0)
  },
  {
    id: 'combo_x5',
    label: 'Réaliser un combo x5',
    icon: '🔥',
    goal: 1,
    reward: 45,
    xp: 90,
    match: (s) => (s.maxCombo >= 5 ? 1 : 0)
  },
  {
    id: 'combo_x4_twice',
    label: 'Réaliser 2 combos x4 (2 parties)',
    icon: '🔥',
    goal: 2,
    reward: 60,
    xp: 120,
    match: (s) => (s.maxCombo >= 4 ? 1 : 0)
  },

  // --- Boosters ---
  {
    id: 'boosters_2',
    label: 'Utiliser 2 boosters',
    icon: '💣',
    goal: 2,
    reward: 25,
    xp: 50,
    match: (s) => s.boostersUsed || 0
  },
  {
    id: 'boosters_4',
    label: 'Utiliser 4 boosters',
    icon: '💣',
    goal: 4,
    reward: 40,
    xp: 80,
    match: (s) => s.boostersUsed || 0
  },
  {
    id: 'purist',
    label: 'Marquer 1 500 points sans aucun booster',
    icon: '🐚',
    goal: 1,
    reward: 55,
    xp: 110,
    match: (s) => (s.score >= 1500 && (s.boostersUsed || 0) === 0 ? 1 : 0)
  },

  // --- Alignements ---
  {
    id: 'matches_30',
    label: 'Réaliser 30 alignements en une partie',
    icon: '🍉',
    goal: 1,
    reward: 35,
    xp: 70,
    match: (s) => ((s.matches || 0) >= 30 ? 1 : 0)
  },
  {
    id: 'matches_60',
    label: 'Réaliser 60 alignements dans la journée',
    icon: '🍉',
    goal: 60,
    reward: 45,
    xp: 90,
    match: (s) => s.matches || 0
  },

  // --- Cumul sur la journée (~2 parties) ---
  {
    id: 'score_5000',
    label: 'Marquer 5 000 points au total aujourd’hui',
    icon: '🥥',
    goal: 5000,
    reward: 55,
    xp: 110,
    match: (s) => s.score || 0
  }
]

// Nombre de défis proposés par jour.
export const DAILY_COUNT = 3

// Tirage déterministe : la clé du jour sert de graine, donc tous les joueurs
// voient les mêmes défis, et un même jour renvoie toujours le même tirage.
// Un Math.random() ici changerait les défis à chaque appel et casserait la
// progression déjà enregistrée.
function seedFrom(str) {
  let h = 2166136261 // FNV-1a 32 bits
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function dailyPick(key = dayKey(), n = DAILY_COUNT) {
  const rnd = mulberry32(seedFrom(key))
  const pool = [...DAILY_CHALLENGES]
  for (let i = pool.length - 1; i > 0; i--) {
    // Fisher-Yates, mais avec notre générateur graine
    const j = Math.floor(rnd() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}

// Badges — débloqués sur seuils cumulés. check(user) => bool
export const BADGES = [
  { key: 'debutant', label: 'Débutant', icon: '🥥', desc: 'Jouer sa première partie', check: (u) => u.gamesPlayed >= 1 },
  { key: 'rapide', label: 'Rapide', icon: '🕶️', desc: 'Jouer 10 parties', check: (u) => u.gamesPlayed >= 10 },
  { key: 'stratege', label: 'Stratège', icon: '🏄', desc: 'Atteindre 5 000 points', check: (u) => u.bestScoreAllTime >= 5000 },
  { key: 'combo', label: 'Combo Master', icon: '📸', desc: 'Réaliser un combo x8', check: (u) => u.bestCombo >= 8 },
  { key: 'expert', label: 'Expert', icon: '🏆', desc: 'Atteindre 15 000 points', check: (u) => u.bestScoreAllTime >= 15000 },
  { key: 'mystere', label: 'Mystère', icon: '🎁', desc: 'Atteindre le niveau 10', check: (u) => u.level >= 10 }
]

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}
