// Les 40 avatars proposés à l'inscription.
//
// Ce qui est stocké en base est la CLÉ ('a01'…'a40'), jamais le chemin : Vite
// hache le nom des fichiers à chaque build, une URL enregistrée en base serait
// morte au déploiement suivant.
//
// ATTENTION, tout avatar n'est pas une clé : les comptes créés avant ces images
// portent un emoji ('😎', '🏄'…), et chaque score en garde une copie figée au
// moment de la partie (Score.avatar, dénormalisé pour le classement). Ces
// valeurs-là existent déjà en production et ne seront jamais converties. D'où
// avatarImg() qui rend `null` plutôt que de supposer, et le composant Avatar
// qui retombe sur le texte. Ne jamais faire `AVATARS.find(...)` sans repli.
//
// L'ordre du tableau est l'ordre d'affichage. Les fichiers sont déjà entrelacés
// fille/garçon (avatar-01 fille, avatar-02 garçon, avatar-03 fille…), donc le
// tri par nom suffit à garantir qu'aucun genre n'apparaisse en bloc. C'est le
// nommage qui porte le mélange : pas de tri à refaire, pas de tri à oublier.

const files = import.meta.glob('./assets/avatars/*.svg', { eager: true, import: 'default' })

export const AVATARS = Object.keys(files)
  .sort()
  .map((path) => ({ key: 'a' + path.match(/avatar-(\d+)\.svg$/)[1], img: files[path] }))

const BY_KEY = new Map(AVATARS.map((a) => [a.key, a.img]))

export const DEFAULT_AVATAR = AVATARS[0].key

// null = ce n'est pas une clé connue. À l'appelant de retomber sur le texte.
//
// Le repli par modulo n'est pas une coquetterie : le jeu est passé de 40 à 20
// avatars alors qu'il était EN LIGNE. Des comptes portent donc des clés a21…a40
// qui n'existent plus. Sans ce rattrapage, ces joueurs verraient la chaîne « a27 »
// écrite en toutes lettres à la place de leur tête. On leur rend une image
// stable (toujours la même) en attendant que la migration serveur leur en
// réattribue une pour de bon.
export function avatarImg(value) {
  const direct = BY_KEY.get(value)
  if (direct) return direct
  const m = /^a(\d+)$/.exec(value || '')
  if (m && AVATARS.length) return AVATARS[(Number(m[1]) - 1) % AVATARS.length].img
  return null
}
