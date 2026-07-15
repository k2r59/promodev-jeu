// Les 6 badges, en un seul sprite.
//
// L'ORDRE EST LA DONNÉE : l'index d'une clé ici est sa position dans l'image.
// Réordonner ce tableau sans refaire le sprite donne à chacun le badge du
// voisin. Il suit l'ordre de BADGES dans server/src/gameData.js, qui reste la
// source de vérité des libellés et des conditions.
//
// Les libellés sont PEINTS dans les visuels (rubans). C'est pour ça que les
// vues n'affichent plus de texte sous les badges : il ferait doublon. Corollaire
// assumé : les fautes des rubans (« Combo Matter », « Stratege ») ne sont pas
// corrigeables sans régénérer les images, et le libellé n'est pas traduisible.
// Il ne survit que dans l'aria-label, pour les lecteurs d'écran.
//
// L'image elle-même n'est pas importée ici : les vues la pointent en `url()`
// depuis leur CSS, que Vite résout et hache comme n'importe quel asset.

export const BADGE_ORDER = ['debutant', 'rapide', 'stratege', 'combo', 'expert', 'mystere']

// Position exprimée en POURCENTAGE et non en pixels : c'est ce qui rend le
// sprite fluide. Avec `background-size: 600% 100%`, l'image fait six fois la
// largeur du conteneur et la case i se cale à i/(n-1) x 100 % — quelle que soit
// la taille d'affichage. Un décalage en pixels aurait obligé à figer une taille,
// or les badges font 54px sur le hub et suivent la grille sur /recompenses.
export function badgePos(key) {
  const i = BADGE_ORDER.indexOf(key)
  if (i < 0) return '0% 0'
  return `${(i / (BADGE_ORDER.length - 1)) * 100}% 0`
}
