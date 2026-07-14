import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'

// État d'affichage partagé entre le shell (App.vue) et le jeu. Deux composants
// éloignés dans l'arbre ont besoin de la même information ; un store est plus
// honnête qu'une chaîne d'émissions ou qu'une classe posée sur <body>.
export const useUiStore = defineStore('ui', () => {
  // Le format portrait ne se déduit pas d'une largeur : une tablette en portrait
  // est plus large qu'un téléphone en paysage. On écoute donc l'orientation,
  // avec la même requête que le CSS (cf. styles.css) pour qu'ils ne divergent
  // jamais. C'est elle qui bascule le plateau en mode « épouse la hauteur ».
  const PORTRAIT_Q = '(orientation: portrait) and (max-width: 1100px)'
  const mq = window.matchMedia(PORTRAIT_Q)
  const portrait = ref(mq.matches)
  const onChange = (e) => (portrait.value = e.matches)
  mq.addEventListener('change', onChange)

  // Le store vit aussi longtemps que l'app : ce nettoyage ne sert qu'au HMR et
  // aux tests, où le store est bien démonté.
  onUnmounted(() => mq.removeEventListener('change', onChange))

  return { portrait }
})
