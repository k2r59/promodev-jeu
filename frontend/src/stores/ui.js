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

  // Déconnecté, l'accueil montre le plateau en vitrine : on voit le jeu avant
  // qu'on nous demande quoi que ce soit. Le formulaire n'arrive qu'au clic sur
  // « C'est parti » (ou sur « Se connecter » dans la barre).
  //
  // L'état vit ici parce que le shell en dépend autant que la vue : tant que le
  // plateau est en vitrine, l'écran est cadré comme le jeu ; dès que le
  // formulaire s'ouvre, il faut une page qui défile — sinon ses derniers champs
  // sortent de l'écran sur un téléphone.
  const authFormOpen = ref(false)

  return { portrait, authFormOpen }
})
