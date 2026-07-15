// Miroir visuel des définitions (le serveur reste la source de vérité pour les récompenses).

import imgSoleil from '../assets/tiles/soleil.png'
import imgBallon from '../assets/tiles/ballon.png'
import imgGlace from '../assets/tiles/glace.png'
import imgPasteque from '../assets/tiles/pasteque.png'
import imgCoquillage from '../assets/tiles/coquillage.png'
import imgEtoile from '../assets/tiles/etoile.png'
import imgCocktail from '../assets/tiles/cocktail.png'
import imgPalmier from '../assets/tiles/palmier.png'
import imgTongs from '../assets/tiles/tongs.png'
import imgLunettes from '../assets/tiles/lunettes.png'
import imgBombe from '../assets/boosters/bombe.png'
import imgEclair from '../assets/boosters/eclair.png'
import imgVague from '../assets/boosters/vague.png'

// Les tuiles "été". index = type.
// `color` = teinte dominante de l'illustration (halo de sélection, fonds de démo).
// `emoji` reste le repli si l'image ne charge pas.
//
// LE NOMBRE DE TUILES EST UN RÉGLAGE DE JEU, pas une liste décorative : TYPE_COUNT
// en découle, et la densité d'alignements s'effondre quand il grimpe. Mesuré sur
// 200 parties simulées (8x8, 40 échanges, joueur parfait) :
//   8 types  -> 8.7 coups sur plateau neuf, 0.6 mélange forcé/partie
//   10 types -> 6.1 coups, 2.8 mélanges/partie   <- on est ici
//   17 types -> 2.4 coups, 15.2 mélanges/partie  (injouable)
// Toute tuile ajoutée durcit le jeu et rapproche du mélange permanent. Ajouter
// au-delà de 10 demande d'agrandir le plateau et de revoir les seuils de score.
//
// Deux tuiles ne doivent jamais se confondre du regard : le joueur croirait
// aligner et raterait son coup. D'où le refus des variantes (un seul ballon,
// une seule coco) et de la bille violette, jumelle du coquillage.
export const TILES = [
  { key: 'soleil', emoji: '🌞', color: '#ffc93c', img: imgSoleil, label: 'Soleil' },
  { key: 'ballon', emoji: '🏖️', color: '#ff6b6b', img: imgBallon, label: 'Ballon de plage' },
  { key: 'glace', emoji: '🍦', color: '#ff9f43', img: imgGlace, label: 'Glace' },
  { key: 'pasteque', emoji: '🍉', color: '#ff5e78', img: imgPasteque, label: 'Pastèque' },
  { key: 'coquillage', emoji: '🐚', color: '#a55eea', img: imgCoquillage, label: 'Coquillage' },
  { key: 'etoile', emoji: '⭐', color: '#ff7f27', img: imgEtoile, label: 'Étoile de mer' },
  { key: 'cocktail', emoji: '🥥', color: '#8b5a2b', img: imgCocktail, label: 'Cocktail coco' },
  { key: 'palmier', emoji: '🌴', color: '#2ecc71', img: imgPalmier, label: 'Feuille tropicale' },
  // Ajoutées en fin de liste : l'index EST le type, insérer au milieu
  // redistribuerait les types des tuiles existantes.
  { key: 'tongs', emoji: '🩴', color: '#ff4d8f', img: imgTongs, label: 'Tongs' },
  { key: 'lunettes', emoji: '🕶️', color: '#e8433f', img: imgLunettes, label: 'Lunettes de soleil' }
]

// Boosters activables depuis l'inventaire.
// `emoji` reste le repli si l'image ne charge pas, comme pour les tuiles.
// `tint` / `edge` : la couleur du booster, définie ICI et pas dans chaque vue.
// Le dock sous le plateau et la page d'aide les affichaient avec des habillages
// sans rapport ; une seule source évite qu'ils divergent à la prochaine retouche.
export const BOOSTERS = {
  bombe: {
    key: 'bombe',
    emoji: '💣',
    img: imgBombe,
    label: 'Bombe',
    desc: 'Détruit une zone 3×3',
    tint: '#fff1f5',
    edge: '#ffc2d2',
    ink: '#e8365c'
  },
  eclair: {
    key: 'eclair',
    emoji: '⚡',
    img: imgEclair,
    label: 'Éclair',
    desc: 'Détruit la ligne et la colonne',
    tint: '#fff9e8',
    edge: '#ffe08a',
    ink: '#d18f00'
  },
  vague: {
    key: 'vague',
    emoji: '🌊',
    img: imgVague,
    label: 'Vague',
    desc: 'Détruit toutes les tuiles identiques',
    tint: '#eff7ff',
    edge: '#b6dffb',
    ink: '#1a8fd0'
  }
}

