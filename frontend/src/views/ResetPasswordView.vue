<script setup>
// Écran d'atterrissage du lien envoyé par e-mail : /reinitialiser?token=…
// C'est le seul morceau du parcours qui a besoin d'une vraie route — un lien
// dans un mail ne peut pas viser un sous-état du panneau d'accueil.
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KeyRound, CircleCheckBig } from 'lucide-vue-next'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'
import AlertDialog from '../components/AlertDialog.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const token = ref('')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
// Le succès n'envoie plus droit au jeu : changer son mot de passe est un acte
// qui mérite d'être confirmé. Sans ce palier, on atterrissait sur le plateau
// sans savoir si ça avait marché — et on est déjà connecté, donc rien dans
// l'écran ne le disait non plus.
const done = ref(false)

// Le jeton est lu une fois au montage : le laisser dans l'URL le ferait
// traîner dans l'historique du navigateur, et un lien à usage unique n'a rien
// à y faire. On le retire de la barre d'adresse dès qu'on l'a en main.
onMounted(() => {
  token.value = typeof route.query.token === 'string' ? route.query.token : ''
  if (token.value) router.replace({ path: '/reinitialiser' })
})

// Vérifié ici ET côté serveur. Ici c'est du confort (dire tout de suite ce qui
// ne va pas) ; c'est le serveur qui fait foi.
const tooShort = computed(() => password.value.length > 0 && password.value.length < 8)
const mismatch = computed(() => confirm.value.length > 0 && password.value !== confirm.value)
const canSubmit = computed(
  () => !loading.value && password.value.length >= 8 && password.value === confirm.value
)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await api('/auth/reset', {
      method: 'POST',
      body: { token: token.value, password: password.value }
    })
    // Le serveur renvoie un jeton de session : il vient de prouver qu'il
    // possède l'adresse, on ne lui redemande pas le mot de passe qu'il vient de
    // choisir. La session est ouverte ici, mais on confirme avant d'emmener.
    auth.adopt(res)
    done.value = true
  } catch (e) {
    error.value = e.message || 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rp page">
    <div class="card page__card rp__card">
      <!-- Succès : on ne repart pas au jeu sans le dire. `role="status"` pour
           que ce ne soit pas qu'une bonne nouvelle visuelle. -->
      <template v-if="done">
        <span class="rp__badge rp__badge--ok" aria-hidden="true"><CircleCheckBig :size="28" /></span>
        <h1>C’est fait !</h1>
        <p class="muted" role="status">
          Votre mot de passe a été modifié et vous êtes déjà connecté. Bonne partie&nbsp;!
        </p>
        <button class="btn btn--lg btn--block" type="button" @click="router.replace('/')">▶ Jouer</button>
      </template>

      <template v-else>
        <span class="rp__badge" aria-hidden="true"><KeyRound :size="28" /></span>
        <h1>Nouveau mot de passe</h1>

        <!-- Arrivée sans jeton : lien tronqué par un client mail, ou URL tapée à
             la main. Inutile d'afficher un formulaire qui ne peut pas aboutir. -->
        <template v-if="!token">
          <p class="muted">
            Ce lien est incomplet ou a déjà servi. Les liens de réinitialisation ne valent qu’une heure
            et qu’une seule fois.
          </p>
          <RouterLink class="btn btn--lg btn--block" to="/?mode=connexion">Demander un nouveau lien</RouterLink>
        </template>

        <template v-else>
          <p class="muted">Choisissez le mot de passe qui protégera votre compte.</p>
          <form @submit.prevent="submit">
            <div class="field">
              <label for="rp-pwd">Nouveau mot de passe</label>
              <input
                id="rp-pwd"
                v-model="password"
                class="input"
                type="password"
                placeholder="8 caractères minimum"
                autocomplete="new-password"
                minlength="8"
                required
              />
              <p v-if="tooShort" class="rp__hint">8 caractères minimum.</p>
            </div>

            <div class="field">
              <label for="rp-confirm">Confirmation</label>
              <input
                id="rp-confirm"
                v-model="confirm"
                class="input"
                type="password"
                placeholder="Saisissez-le à nouveau"
                autocomplete="new-password"
                required
              />
              <p v-if="mismatch" class="rp__hint">Les deux mots de passe ne sont pas identiques.</p>
            </div>

            <button class="btn btn--lg btn--block" type="submit" :disabled="!canSubmit">
              <span v-if="loading" class="spin" aria-hidden="true"></span>
              {{ loading ? 'Un instant…' : '🔒 Enregistrer et jouer' }}
            </button>
          </form>
        </template>
      </template>
    </div>

    <AlertDialog :message="error" @close="error = ''" />
  </div>
</template>

<style scoped>
.rp__card {
  max-width: 420px;
  margin: 0 auto;
  text-align: center;
}
.rp__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(57, 182, 255, 0.14);
  color: var(--sky);
  margin-bottom: 10px;
}
.rp__badge--ok {
  background: rgba(46, 204, 113, 0.14);
  color: var(--leaf);
}
.rp h1 {
  margin: 0 0 6px;
}
.rp .muted {
  margin: 0 0 18px;
  font-size: 0.88rem;
  line-height: 1.45;
}
/* Le formulaire s'aligne à gauche même si la carte est centrée : des labels
   centrés au-dessus de champs pleine largeur se lisent mal. */
.rp form {
  text-align: left;
}
.rp__hint {
  margin: 4px 0 0;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--coral);
}
.rp .btn {
  margin-top: 6px;
}
</style>
