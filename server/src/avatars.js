// Les clés d'avatar légitimes. Le front détient les IMAGES
// (frontend/src/assets/avatars/) ; le serveur n'a besoin de savoir qu'une chose,
// quelles clés existent — pour valider ce qu'on lui envoie et pour la migration.
//
// COUPLAGE ASSUMÉ : AVATAR_COUNT doit suivre le dossier du front. En déclarer
// plus ici que d'images là-bas donne un avatar qui ne s'affiche pas ; en
// déclarer moins rend les dernières images inattribuables. Les deux se voient
// tout de suite, mais il n'y a pas de garde-fou automatique : c'est un fichier
// Node, il ne peut pas lire le glob de Vite.
export const AVATAR_COUNT = 40

export const AVATAR_KEYS = Array.from({ length: AVATAR_COUNT }, (_, i) => 'a' + String(i + 1).padStart(2, '0'))

const SET = new Set(AVATAR_KEYS)

export const isAvatarKey = (v) => SET.has(v)

// Attribution déterministe à partir de l'id Mongo. Déterministe et pas aléatoire
// pour deux raisons : la migration peut être rejouée sans redistribuer les
// avatars de tout le monde, et un compte migré deux fois garde le sien. Les 8
// derniers caractères d'un ObjectId sont un compteur + aléa : largement assez
// dispersés pour répartir sur 40 valeurs.
export function avatarForId(id) {
  return AVATAR_KEYS[parseInt(String(id).slice(-8), 16) % AVATAR_COUNT]
}
