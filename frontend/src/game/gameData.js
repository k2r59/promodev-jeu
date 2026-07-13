// Miroir visuel des définitions (le serveur reste la source de vérité pour les récompenses).

// Les tuiles "été". index = type.
export const TILES = [
  { key: 'soleil', emoji: '🌞', color: '#ffc93c' },
  { key: 'ballon', emoji: '🏖️', color: '#ff6b6b' },
  { key: 'glace', emoji: '🍦', color: '#ff9ff3' },
  { key: 'pasteque', emoji: '🍉', color: '#ff5e78' },
  { key: 'coquillage', emoji: '🐚', color: '#ffa8d2' },
  { key: 'etoile', emoji: '⭐', color: '#ffd93d' },
  { key: 'cocktail', emoji: '🥥', color: '#8b5a2b' },
  { key: 'palmier', emoji: '🌴', color: '#2ecc71' }
]

// Boosters activables depuis l'inventaire.
export const BOOSTERS = {
  bombe: { key: 'bombe', emoji: '💣', label: 'Bombe', desc: 'Détruit une zone 3×3' },
  eclair: { key: 'eclair', emoji: '⚡', label: 'Éclair', desc: 'Détruit la ligne et la colonne' },
  vague: { key: 'vague', emoji: '🌊', label: 'Vague', desc: 'Détruit toutes les tuiles identiques' }
}

export const DAILY_CHALLENGES_INFO = [
  { id: 'score_3000', label: 'Marquer 3 000 points', icon: '⭐' },
  { id: 'play_2', label: 'Faire 2 parties rapides', icon: '🏄' },
  { id: 'combo_x5', label: 'Réaliser un combo x5', icon: '🕶️' },
  { id: 'boosters_5', label: 'Utiliser 5 boosters', icon: '💣' },
  { id: 'score_10000', label: 'Marquer 10 000 points aujourd’hui', icon: '🍉' }
]
