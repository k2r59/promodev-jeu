// Définitions des défis quotidiens et badges — source de vérité côté serveur
// (le front a un miroir purement visuel dans src/game/gameData.js).

// Les défis sont "quotidiens" : la progression est stockée par jour (clé YYYY-MM-DD).
// Chaque défi expose une fonction match(session) qui, à partir d'une partie,
// renvoie l'incrément de progression.
export const DAILY_CHALLENGES = [
  {
    id: 'score_3000',
    label: 'Marquer 3 000 points en une partie',
    icon: '⭐',
    goal: 1,
    reward: 50,
    xp: 100,
    // +1 si une partie dépasse 3000 pts
    match: (s) => (s.score >= 3000 ? 1 : 0)
  },
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
    id: 'combo_x5',
    label: 'Réaliser un combo x5',
    icon: '🕶️',
    goal: 1,
    reward: 40,
    xp: 80,
    match: (s) => (s.maxCombo >= 5 ? 1 : 0)
  },
  {
    id: 'boosters_5',
    label: 'Utiliser 5 boosters',
    icon: '💣',
    goal: 5,
    reward: 45,
    xp: 90,
    match: (s) => s.boostersUsed || 0
  },
  {
    id: 'score_10000',
    label: 'Marquer 10 000 points au total aujourd’hui',
    icon: '🍉',
    goal: 10000,
    reward: 70,
    xp: 150,
    match: (s) => s.score || 0
  }
]

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
