<script setup>
// Formulaire inscription/connexion tel qu'il s'affiche à la place du plateau,
// dans la colonne centrale du hub. Occupe la même hauteur, sans scroll de page.
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ShieldCheck } from 'lucide-vue-next'
import { AVATARS, DEFAULT_AVATAR } from '../avatars.js'
import Avatar from './Avatar.vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const route = useRoute()

// « Se connecter » du header ouvre /?mode=connexion : on suit ce paramètre.
const mode = ref(route.query.mode === 'connexion' ? 'login' : 'register')
watch(
  () => route.query.mode,
  (m) => {
    mode.value = m === 'connexion' ? 'login' : 'register'
  }
)
const loading = ref(false)
const error = ref('')

const form = reactive({ pseudo: '', societe: '', telephone: '', email: '', password: '', avatar: DEFAULT_AVATAR })

// Choix de l'avatar en popover : la grille mangeait la hauteur du panneau.
const avatarOpen = ref(false)
const avatarWrap = ref(null)

function pickAvatar(a) {
  form.avatar = a
  avatarOpen.value = false
}
function onDocClick(e) {
  if (avatarOpen.value && avatarWrap.value && !avatarWrap.value.contains(e.target)) avatarOpen.value = false
}
function onKeydown(e) {
  if (e.key === 'Escape') avatarOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'register') {
      await auth.register({
        pseudo: form.pseudo,
        email: form.email,
        password: form.password,
        avatar: form.avatar,
        societe: form.societe,
        telephone: form.telephone
      })
    } else {
      await auth.login({ email: form.email, password: form.password })
    }
    // Pas de navigation : le hub bascule tout seul sur le plateau.
  } catch (e) {
    error.value = e.message || 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="apanel card">
    <div class="apanel__scroll">
      <div class="apanel__head">
        <p class="muted">
          {{
            mode === 'register'
              ? 'Créez votre compte pour jouer, gagner des badges et tenter les 1 000 €.'
              : 'Connectez-vous pour reprendre votre progression.'
          }}
        </p>
      </div>

      <div class="switch">
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Inscription</button>
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Connexion</button>
      </div>

      <form @submit.prevent="submit">
        <div v-if="error" class="error-msg">{{ error }}</div>

        <template v-if="mode === 'register'">
          <div class="row">
            <div class="field row__grow">
              <label for="ap-pseudo">Pseudo</label>
              <input
                id="ap-pseudo"
                v-model="form.pseudo"
                class="input"
                type="text"
                placeholder="Ex : SurferHervé"
                maxlength="20"
                required
              />
            </div>
            <div ref="avatarWrap" class="field avatarpick">
              <label id="ap-avatar-lbl">Avatar</label>
              <button
                type="button"
                class="avatarpick__btn"
                aria-haspopup="true"
                :aria-expanded="avatarOpen"
                aria-labelledby="ap-avatar-lbl"
                @click="avatarOpen = !avatarOpen"
              >
                <span class="avatarpick__cur"><Avatar :value="form.avatar" /></span>
                <span class="avatarpick__caret" aria-hidden="true">▾</span>
              </button>
              <div v-if="avatarOpen" class="avatarpick__pop" role="menu">
                <button
                  v-for="(a, i) in AVATARS"
                  :key="a.key"
                  type="button"
                  class="avatar-opt"
                  :class="{ active: form.avatar === a.key }"
                  role="menuitem"
                  :aria-label="`Avatar ${i + 1}`"
                  @click="pickAvatar(a.key)"
                >
                  <!-- 40 images d'un coup, soit ~1 Mo : `lazy` laisse le
                       navigateur ne charger que ce qui entre dans le popover. -->
                  <img class="avatar-opt__img" :src="a.img" alt="" loading="lazy" />
                </button>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="ap-societe">Société</label>
            <input
              id="ap-societe"
              v-model="form.societe"
              class="input"
              type="text"
              placeholder="Raison sociale"
              maxlength="120"
              required
            />
          </div>
          <div class="field">
            <label for="ap-tel">Téléphone <span class="opt">facultatif</span></label>
            <input id="ap-tel" v-model="form.telephone" class="input" type="tel" placeholder="06 12 34 56 78" maxlength="30" />
          </div>
        </template>

        <div class="field">
          <label>E-mail</label>
          <input v-model="form.email" class="input" type="email" placeholder="vous@exemple.fr" required />
        </div>
        <div class="field">
          <label for="ap-pwd">Mot de passe</label>
          <input
            id="ap-pwd"
            v-model="form.password"
            class="input"
            type="password"
            :placeholder="mode === 'register' ? '8 caractères minimum' : 'Votre mot de passe'"
            :minlength="mode === 'register' ? 8 : undefined"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            required
          />
        </div>

        <button class="btn btn--lg btn--block" type="submit" :disabled="loading">
          {{ loading ? 'Un instant…' : mode === 'register' ? '🚀 Créer mon compte' : '▶ Se connecter' }}
        </button>
      </form>

      <!-- La société est obligatoire (c'est la qualification du prospect) mais
           c'est aussi la donnée qu'on hésite le plus à donner. Dire tout de
           suite où elle n'ira pas lève le frein. Formulation vérifiée contre le
           code, pas promise à la légère : l'agrégation du classement ne remonte
           que `pseudo` et `avatar` (routes/leaderboard.js), et la société n'est
           affichée qu'au joueur lui-même, dans sa propre fiche (PlayerSheet).
           D'où « aux autres joueurs » et non « jamais » tout court. -->
      <p v-if="mode === 'register'" class="apanel__privacy">
        <ShieldCheck :size="15" class="apanel__privacy-ico" aria-hidden="true" />
        <span>Votre raison sociale n'est jamais affichée aux autres joueurs : dans le classement, seul votre pseudo apparaît.</span>
      </p>

      <p class="apanel__foot muted">
        {{ mode === 'register' ? 'Déjà un compte ?' : 'Pas encore de compte ?' }}
        <button class="link-btn" @click="mode = mode === 'register' ? 'login' : 'register'">
          {{ mode === 'register' ? 'Se connecter' : "S'inscrire" }}
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Occupe exactement la place du plateau. Si le formulaire dépasse (petite
   fenêtre, mode inscription), c'est lui qui défile — jamais la page. */
.apanel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}
.apanel__scroll {
  overflow-y: auto;
  padding: 16px 18px;
}
.apanel__head {
  text-align: center;
  margin-bottom: 12px;
}
.apanel__head p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
}
.switch {
  display: flex;
  background: #eef1f8;
  border-radius: 999px;
  padding: 3px;
  margin-bottom: 12px;
}
.switch button {
  flex: 1;
  padding: 7px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.82rem;
  background: transparent;
  color: var(--ink-soft);
}
.switch button.active {
  background: #fff;
  color: var(--coral);
  box-shadow: var(--shadow);
}
/* Compact : le panneau doit tenir sans scroll, et laisser la place au champ
   société. On resserre ici plutôt que dans styles.css, qui sert aux autres vues. */
.apanel :deep(.field) {
  margin-bottom: 9px;
}
.apanel :deep(.field label) {
  font-size: 0.76rem;
  margin-bottom: 3px;
}
.apanel :deep(.input) {
  padding: 9px 12px;
  font-size: 0.88rem;
  border-width: 1.5px;
}
.apanel :deep(.error-msg) {
  padding: 7px 10px;
  font-size: 0.8rem;
  margin-bottom: 8px;
}
/* Bouton fin, sans le relief épais du .btn du jeu. */
.apanel :deep(.btn) {
  padding: 11px 18px;
  font-size: 0.92rem;
  box-shadow: 0 3px 10px rgba(43, 45, 90, 0.18);
}
.apanel :deep(.btn:active) {
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(43, 45, 90, 0.18);
}

/* Pseudo + avatar sur une ligne. */
.row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.row__grow {
  flex: 1;
  min-width: 0;
}
.opt {
  font-weight: 700;
  font-size: 0.68rem;
  color: var(--ink-soft);
  text-transform: lowercase;
  letter-spacing: 0;
}

/* Avatar en popover : la grille de 10 mangeait la hauteur du panneau. */
.avatarpick {
  position: relative;
  flex-shrink: 0;
}
/* 48px = la hauteur d'un .input (13px de padding x2 + le texte + 2px de bordure
   x2). Le bouton est sur la même ligne que le champ Pseudo : toute autre valeur
   se voit comme un décrochage. */
.avatarpick__btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 48px;
  padding: 0 8px 0 7px;
  border-radius: var(--radius-sm);
  border: 1.5px solid #e3e8f2;
  background: #fff;
  transition: border 0.15s, box-shadow 0.15s;
}
.avatarpick__btn:hover,
.avatarpick__btn[aria-expanded='true'] {
  border-color: var(--sky);
  box-shadow: 0 0 0 3px rgba(57, 182, 255, 0.18);
}
/* Ce span n'avait qu'un font-size : il portait du texte. Il porte maintenant une
   image, qui se dimensionne sur son conteneur — sans taille explicite elle
   s'effondrerait à 0. Le font-size reste pour les anciens avatars emoji. */
.avatarpick__cur {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 1.15rem;
  line-height: 1;
}
.avatarpick__caret {
  font-size: 0.7rem;
  color: var(--ink-soft);
}
.avatarpick__pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 8px;
  background: #fff;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  animation: pop-in 0.12s ease;
  /* 40 avatars sur 5 colonnes = 8 rangées : ça dépasse le panneau, qui ne
     défile pas (il occupe exactement la place du plateau). Le popover défile
     donc lui-même. La hauteur est bornée en px et non en rangées : c'est ce
     qu'on veut garantir, que le bouton reste visible au-dessus. */
  max-height: 288px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.avatar-opt {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f6fc;
  font-size: 1.05rem;
  transition: transform 0.1s;
  padding: 0;
}
.avatar-opt__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-opt:hover {
  transform: scale(1.08);
}
.avatar-opt.active {
  background: #fff;
  box-shadow: 0 0 0 2px var(--sky);
}
/* Rassurance, pas avertissement : un vert discret plutôt qu'un bandeau d'alerte.
   `align-items: start` car le texte passe sur deux lignes et l'icône doit rester
   en tête, pas se centrer verticalement sur le bloc. */
.apanel__privacy {
  display: flex;
  align-items: start;
  gap: 7px;
  margin: 12px 0 0;
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  background: rgba(46, 204, 113, 0.09);
  color: var(--ink-soft);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
}
.apanel__privacy-ico {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--leaf);
}
.apanel__foot {
  text-align: center;
  margin-top: 14px;
  margin-bottom: 0;
  font-size: 0.9rem;
}
.link-btn {
  background: none;
  color: var(--sky);
  font-weight: 800;
}
</style>
