<script setup>
// Dialogue d'erreur bloquant, partagé par tous les formulaires. Piloté par une
// simple chaîne : vide = fermé. Le parent n'a donc pas de booléen à tenir
// synchronisé avec son message, une seule source de vérité.
//
// TELEPORT VERS BODY, ET CE N'EST PAS DU CONFORT : .card porte un
// backdrop-filter, qui crée un contexte d'empilement. Rendu à sa place dans
// AuthPanel (une .card), ce dialogue y resterait enfermé et passerait sous le
// plateau — c'est exactement ce qui était arrivé au menu du son (cf. le z-index
// du HUD dans GameStage). Depuis body, il n'a plus de parent qui l'emprisonne.
import { ref, watch, nextTick } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'

const props = defineProps({
  message: { type: String, default: '' },
  title: { type: String, default: 'Oups…' }
})
const emit = defineEmits(['close'])

const okBtn = ref(null)
// L'élément qui avait le focus avant l'ouverture, pour le lui rendre après :
// sans ça, refermer le dialogue renvoie le focus en tête de page et oblige un
// utilisateur au clavier à refaire tout le chemin jusqu'au champ fautif.
let lastFocused = null

watch(
  () => props.message,
  async (msg) => {
    if (!msg) return
    lastFocused = document.activeElement
    await nextTick()
    okBtn.value?.focus()
  }
)

function close() {
  emit('close')
  // Le focus se rend après la fermeture, sinon on le pose sur un élément que
  // Vue est en train de retirer du DOM.
  nextTick(() => lastFocused?.focus?.())
}
</script>

<template>
  <Teleport to="body">
    <Transition name="alert">
      <div v-if="message" class="alert" @click.self="close">
        <div
          class="alert__card"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="alert-title"
          aria-describedby="alert-msg"
          @keydown.esc="close"
        >
          <span class="alert__ico" aria-hidden="true"><TriangleAlert :size="30" /></span>
          <h2 id="alert-title">{{ title }}</h2>
          <p id="alert-msg">{{ message }}</p>
          <button ref="okBtn" class="btn btn--lg btn--block" type="button" @click="close">J’ai compris</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.alert {
  position: fixed;
  inset: 0;
  /* Au-dessus de tout : la nav du site monte à 60 (cf. GameStage), une erreur
     doit passer devant elle. */
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(43, 45, 90, 0.5);
  backdrop-filter: blur(3px);
}
.alert__card {
  width: 100%;
  max-width: 380px;
  padding: 26px 24px 22px;
  border-radius: var(--radius);
  background: #fff;
  box-shadow: var(--shadow-lg);
  text-align: center;
}
.alert__ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #ffe1e6;
  color: #c0304a;
  margin-bottom: 12px;
}
.alert__card h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}
.alert__card p {
  margin: 0 0 20px;
  color: var(--ink-soft);
  font-weight: 600;
  line-height: 1.45;
  /* Un message d'erreur peut porter une adresse e-mail, qui n'a aucun espace
     où se couper. */
  overflow-wrap: anywhere;
}

.alert-enter-active,
.alert-leave-active {
  transition: opacity 0.15s ease;
}
.alert-enter-active .alert__card {
  animation: pop-in 0.18s ease;
}
.alert-enter-from,
.alert-leave-to {
  opacity: 0;
}
/* Une alerte qui surgit est déjà une surprise : ne pas y ajouter un mouvement
   pour qui a demandé qu'on s'en abstienne. */
@media (prefers-reduced-motion: reduce) {
  .alert-enter-active .alert__card {
    animation: none;
  }
}
</style>
