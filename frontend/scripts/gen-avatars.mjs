// Génère les avatars du jeu, en SVG, dans src/assets/avatars/.
//
//   npm --prefix frontend run gen:avatars
//
// Pourquoi des fichiers plutôt qu'une génération à la volée dans le navigateur :
// DiceBear pèse plusieurs centaines de ko une fois embarqué, pour un résultat
// qui ne change jamais. On paie le calcul une fois, ici, et le bundle n'en sait
// rien — @dicebear/* reste une devDependency.
//
// Rejouable : à graine égale, DiceBear rend le même avatar. Relancer le script
// ne redistribue donc pas les avatars des joueurs déjà inscrits.
//
// ⚠️ Changer COUNT ou l'ordre des graines change ce que voient les joueurs
// existants : la clé stockée en base ('a07') est un RANG dans cette liste, pas
// une identité. Si vous réduisez COUNT, relancez la migration serveur
// (server/scripts/migrate-avatars.js) : les clés devenues hors-liste y seront
// réattribuées.
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../src/assets/avatars/', import.meta.url))

// Fonds repris de la palette du jeu, pastellisés : à 26px dans le classement,
// c'est la couleur de fond qui distingue deux joueurs avant leur visage.
const BG = ['bde3ff', 'ffe0a8', 'ffc2cd', 'ffe89a', 'a8e6ee', 'b7edcb', 'd9c9f7', 'ffd0b0']

// Graines fixes et non aléatoires : c'est ce qui rend le script rejouable.
const SEEDS = [
  'Zoe', 'Marc', 'Lila', 'Theo', 'Ines', 'Hugo', 'Nina', 'Sacha', 'Emma', 'Louis',
  'Jade', 'Noah', 'Alba', 'Ruben', 'Maya', 'Gabin', 'Iris', 'Enzo', 'Lena', 'Adam'
]

mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) unlinkSync(OUT + f)

SEEDS.forEach((seed, i) => {
  const svg = createAvatar(avataaars, {
    seed,
    radius: 50,
    backgroundColor: [BG[i % BG.length]],
    // Sans ces contraintes, DiceBear tire aussi des visages en larmes, en colère
    // ou hurlants — vérifié en les rendant. Ce n'est pas le ton d'un jeu d'été.
    eyes: ['default', 'happy', 'wink', 'squint'],
    eyebrows: ['default', 'defaultNatural', 'raisedExcited', 'raisedExcitedNatural', 'upDown'],
    mouth: ['smile', 'twinkle', 'default'],
    // Par défaut presque tout le monde porte lunettes et barbe : trop uniforme.
    accessoriesProbability: 15,
    facialHairProbability: 20
  }).toString()
  writeFileSync(`${OUT}avatar-${String(i + 1).padStart(2, '0')}.svg`, svg)
})

console.log(`${SEEDS.length} avatars écrits dans src/assets/avatars/`)
console.log("Pensez à AVATAR_COUNT dans server/src/avatars.js s'il a changé.")
