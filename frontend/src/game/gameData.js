// Miroir visuel des définitions (le serveur reste la source de vérité pour les récompenses).

import imgSoleil from '../assets/tiles/soleil.png'
import imgBallon from '../assets/tiles/ballon.png'
import imgGlace from '../assets/tiles/glace.png'
import imgPasteque from '../assets/tiles/pasteque.png'
import imgCoquillage from '../assets/tiles/coquillage.png'
import imgEtoile from '../assets/tiles/etoile.png'
import imgCocktail from '../assets/tiles/cocktail.png'
import imgPalmier from '../assets/tiles/palmier.png'

// Les tuiles "été". index = type.
// `color` = teinte dominante de l'illustration (halo de sélection, fonds de démo).
// `emoji` reste le repli si l'image ne charge pas.
export const TILES = [
  { key: 'soleil', emoji: '🌞', color: '#ffc93c', img: imgSoleil, label: 'Soleil' },
  { key: 'ballon', emoji: '🏖️', color: '#ff6b6b', img: imgBallon, label: 'Ballon de plage' },
  { key: 'glace', emoji: '🍦', color: '#ff9f43', img: imgGlace, label: 'Glace' },
  { key: 'pasteque', emoji: '🍉', color: '#ff5e78', img: imgPasteque, label: 'Pastèque' },
  { key: 'coquillage', emoji: '🐚', color: '#a55eea', img: imgCoquillage, label: 'Coquillage' },
  { key: 'etoile', emoji: '⭐', color: '#ff7f27', img: imgEtoile, label: 'Étoile de mer' },
  { key: 'cocktail', emoji: '🥥', color: '#8b5a2b', img: imgCocktail, label: 'Cocktail coco' },
  { key: 'palmier', emoji: '🌴', color: '#2ecc71', img: imgPalmier, label: 'Feuille tropicale' }
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
