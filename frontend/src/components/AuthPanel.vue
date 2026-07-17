<script setup>
// Formulaire inscription/connexion tel qu'il s'affiche à la place du plateau,
// dans la colonne centrale du hub. Occupe la même hauteur, sans scroll de page.
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ShieldCheck } from 'lucide-vue-next'
import { AVATARS, DEFAULT_AVATAR } from '../avatars.js'
import Avatar from './Avatar.vue'
import PromoBlock from './PromoBlock.vue'
import AlertDialog from './AlertDialog.vue'
import { useAuthStore } from '../stores/auth.js'
import { api } from '../api/client.js'

const auth = useAuthStore()
const route = useRoute()

// Trois états : 'register', 'login', et 'forgot' — la demande de lien de
// réinitialisation. 'forgot' est un sous-état de la connexion (l'onglet
// Connexion y reste actif) et n'a pas d'URL : on n'y arrive que par un clic
// depuis le formulaire, et un rechargement doit ramener à la connexion.
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
const forgotSent = ref(false)

// Le lien « mot de passe oublié » n'existe que si le serveur sait envoyer un
// e-mail (SMTP configuré). Faux par défaut : tant qu'on ne sait pas, on
// n'affiche rien. Se tromper dans ce sens ne coûte qu'un lien manquant ; dans
// l'autre, on promettrait un e-mail qui ne partirait jamais.
const resetEnabled = ref(false)

// Changer d'onglet ne doit pas traîner l'erreur ni la confirmation du
// précédent : elles ne parlent plus de ce qu'on regarde.
watch(mode, () => {
  error.value = ''
  forgotSent.value = false
})

const form = reactive({
  pseudo: '',
  societe: '',
  telephone: '',
  email: '',
  password: '',
  avatar: DEFAULT_AVATAR,
  // Consentements (art. 2). Le serveur les réexige : les cases ne sont qu'un
  // rappel visuel, elles ne prouvent rien à elles seules.
  acceptRules: false, // 18 ans + règlement — obligatoire
  acceptData: false, // traitement des données (RGPD) — obligatoire
  acceptMarketing: false // prospection — facultatif
})

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
onMounted(async () => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  try {
    const cfg = await api('/config')
    resetEnabled.value = !!cfg.passwordResetEnabled
  } catch {
    // Serveur muet : on laisse le lien caché plutôt que de l'afficher à l'aveugle.
  }
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'forgot') {
      await api('/auth/forgot', { method: 'POST', body: { email: form.email } })
      // Le serveur répond la même chose que l'e-mail existe ou non, pour ne pas
      // livrer un énumérateur de comptes : on affiche donc une confirmation
      // qui ne promet rien non plus.
      forgotSent.value = true
    } else if (mode.value === 'register') {
      await auth.register({
        pseudo: form.pseudo,
        email: form.email,
        password: form.password,
        avatar: form.avatar,
        societe: form.societe,
        telephone: form.telephone,
        acceptRules: form.acceptRules,
        acceptData: form.acceptData,
        acceptMarketing: form.acceptMarketing
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
              ? 'Créez votre compte pour jouer, gagner des badges et tenter les 500 € de cartes cadeaux.'
              : mode === 'forgot'
                ? 'Indiquez l’e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.'
                : 'Connectez-vous pour reprendre votre progression.'
          }}
        </p>
      </div>

      <div class="switch">
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Inscription</button>
        <!-- 'forgot' garde l'onglet Connexion actif : c'est un détour dans ce
             parcours-là, pas un troisième onglet. -->
        <button :class="{ active: mode === 'login' || mode === 'forgot' }" @click="mode = 'login'">Connexion</button>
      </div>

      <!-- Confirmation d'envoi : remplace le formulaire, car il n'y a plus rien
           à y faire. Le texte ne dit pas « c'est envoyé » mais « si un compte
           existe » — le serveur lui-même refuse de trancher, pour ne pas
           laisser énumérer les comptes. -->
      <div v-if="mode === 'forgot' && forgotSent" class="apanel__sent">
        <p class="apanel__sent-title">📬 C’est parti !</p>
        <p>
          Si un compte existe avec <b>{{ form.email }}</b
          >, un lien de réinitialisation vient d’y être envoyé. Il est valable une heure.
        </p>
        <p class="apanel__sent-hint muted">Pensez à regarder dans vos spams.</p>
        <button class="btn btn--lg btn--block" type="button" @click="mode = 'login'">Retour à la connexion</button>
      </div>

      <form v-else @submit.prevent="submit">
        <template v-if="mode === 'register'">
          <div class="row">
            <div class="field row__grow">
              <label for="ap-pseudo">Pseudo <span class="req" aria-hidden="true">*</span></label>
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
                  <!-- `lazy` par prudence : en SVG les 20 pèsent 136 ko en tout,
                       mais rien n'oblige à les charger avant d'ouvrir le menu. -->
                  <img class="avatar-opt__img" :src="a.img" alt="" loading="lazy" />
                </button>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="ap-societe">Société <span class="opt">facultatif</span></label>
            <input
              id="ap-societe"
              v-model="form.societe"
              class="input"
              type="text"
              placeholder="Raison sociale"
              maxlength="120"
            />
          </div>
          <div class="field">
            <label for="ap-tel">Téléphone <span class="opt">facultatif</span></label>
            <input id="ap-tel" v-model="form.telephone" class="input" type="tel" placeholder="06 12 34 56 78" maxlength="30" />
          </div>
        </template>

        <div class="field">
          <!-- Ce label n'avait pas de `for` et son champ pas d'id : le clic sur
               l'intitulé ne donnait pas le focus, et un lecteur d'écran
               annonçait un champ sans nom. -->
          <label for="ap-email">E-mail <span v-if="mode === 'register'" class="req" aria-hidden="true">*</span></label>
          <input
            id="ap-email"
            v-model="form.email"
            class="input"
            type="email"
            placeholder="vous@exemple.fr"
            autocomplete="email"
            required
          />
        </div>
        <div v-if="mode !== 'forgot'" class="field">
          <label for="ap-pwd">Mot de passe <span v-if="mode === 'register'" class="req" aria-hidden="true">*</span></label>
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

        <!-- L'astérisque ne veut rien dire sans sa légende. `aria-hidden` sur
             les étoiles elles-mêmes : l'attribut `required` des champs porte
             déjà l'information pour les lecteurs d'écran, la répéter en
             ponctuation ne ferait que bavarder. -->
        <p v-if="mode === 'register'" class="apanel__req">* champs obligatoires</p>

        <!-- Information RGPD au point de collecte (art. 12). Les liens s'ouvrent
             dans un nouvel onglet : sur le même, ils feraient perdre la saisie,
             le formulaire vivant dans le hub et non sur une page à part. -->
        <template v-if="mode === 'register'">
          <p class="apanel__rgpd">
            Les informations recueillies sont traitées par PromoDev afin de créer et gérer votre compte,
            enregistrer vos parties et vos scores, établir le classement, prévenir les fraudes, réaliser le
            tirage au sort et attribuer les lots. Les champs signalés par un astérisque sont obligatoires
            pour participer. Pour en savoir plus sur l'utilisation de vos données et l'exercice de vos droits,
            consultez notre
            <RouterLink to="/confidentialite" target="_blank">politique de confidentialité</RouterLink>.
          </p>

          <label class="apanel__accept">
            <input v-model="form.acceptRules" type="checkbox" class="apanel__accept-box" />
            <span>
              Je certifie être âgé(e) de 18 ans ou plus, remplir les conditions de participation et avoir lu
              et accepté sans réserve le
              <a href="/reglement-jeu-de-l-ete-promodev-2026.pdf" target="_blank" rel="noopener">règlement du Jeu de l'Été PromoDev</a>.
              <span class="req" aria-hidden="true">*</span>
            </span>
          </label>
          <label class="apanel__accept">
            <input v-model="form.acceptData" type="checkbox" class="apanel__accept-box" />
            <span>
              J'accepte le traitement de mes données personnelles par PromoDev, uniquement dans le cadre du
              jeu, conformément à la
              <RouterLink to="/confidentialite" target="_blank">politique de confidentialité</RouterLink>.
              <span class="req" aria-hidden="true">*</span>
            </span>
          </label>
          <!-- Facultative, et visiblement à part : c'est un opt-in marketing
               distinct, s'inscrire au jeu ne doit jamais valoir consentement à
               la prospection. Pas d'astérisque, pas de blocage du bouton. -->
          <label class="apanel__accept apanel__accept--opt">
            <input v-model="form.acceptMarketing" type="checkbox" class="apanel__accept-box" />
            <span>
              Je souhaite recevoir par e-mail les actualités, offres commerciales et invitations de
              PromoDev. Je pourrai me désinscrire à tout moment.
            </span>
          </label>
        </template>

        <button
          class="btn btn--lg btn--block"
          type="submit"
          :disabled="loading || (mode === 'register' && (!form.acceptRules || !form.acceptData))"
        >
          <span v-if="loading" class="spin" aria-hidden="true"></span>
          {{
            loading
              ? 'Un instant…'
              : mode === 'register'
                ? '🚀 Créer mon compte'
                : mode === 'forgot'
                  ? '✉️ Envoyer le lien'
                  : '▶ Se connecter'
          }}
        </button>

        <p v-if="mode === 'login' && resetEnabled" class="apanel__forgot">
          <button class="link-btn" type="button" @click="mode = 'forgot'">Mot de passe oublié ?</button>
        </p>
        <p v-if="mode === 'forgot'" class="apanel__forgot">
          <button class="link-btn" type="button" @click="mode = 'login'">Retour à la connexion</button>
        </p>
      </form>

      <!-- La société est facultative, mais celui qui la donne hésite : dire tout
           de suite où elle n'ira pas lève le frein. Formulation vérifiée contre
           le code, pas promise à la légère : l'agrégation du classement ne
           remonte que `pseudo` et `avatar` (routes/leaderboard.js), et la société
           n'est affichée qu'au joueur lui-même, dans sa propre fiche
           (PlayerSheet). D'où « aux autres joueurs » et non « jamais » tout court. -->
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

      <!-- Le prospect vient de donner sa raison sociale : c'est le moment où
           dire qui la reçoit. Le bloc s'adapte seul à la largeur (container
           query), il tient donc aussi bien ici, sous une colonne étroite, que
           sur la pleine largeur de la page d'aide. -->
      <PromoBlock class="apanel__promo" />
    </div>

    <AlertDialog :message="error" @close="error = ''" />
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
/* Corail, comme les erreurs : c'est la même famille d'information — ce que le
   formulaire exige de vous. */
.req {
  color: var(--coral);
  font-weight: 900;
}
.apanel__req {
  margin: 0 0 10px;
  font-size: 0.7rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.apanel__rgpd {
  margin: 0 0 10px;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--ink-soft);
}
/* La case et son texte sur une ligne, l'un aligné à l'autre. La case ne rétrécit
   pas quand le texte passe sur plusieurs lignes. */
.apanel__accept {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 0 0 12px;
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--ink);
  cursor: pointer;
}
.apanel__accept-box {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  accent-color: var(--coral);
  cursor: pointer;
}
/* La case marketing est facultative : séparée par un filet et un ton plus doux,
   pour qu'on la distingue au premier regard des deux cases obligatoires. */
.apanel__accept--opt {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(43, 45, 90, 0.1);
  color: var(--ink-soft);
}
.apanel__forgot {
  text-align: center;
  margin: 10px 0 0;
  font-size: 0.8rem;
}

/* Confirmation d'envoi. Vert : c'est une bonne nouvelle, pas une alerte — et
   ça la distingue au premier coup d'œil du bandeau d'erreur, corail, qui
   occupe la même place dans le panneau. */
.apanel__sent {
  padding: 14px 15px;
  border-radius: var(--radius-sm);
  background: rgba(46, 204, 113, 0.09);
  font-size: 0.85rem;
  line-height: 1.45;
}
.apanel__sent p {
  margin: 0 0 9px;
}
.apanel__sent-title {
  font-weight: 900;
  font-size: 0.95rem;
}
/* L'e-mail saisi peut être long et n'a aucun espace où se couper : sans ça il
   élargissait le panneau, qui tient une largeur imposée par le plateau. */
.apanel__sent b {
  overflow-wrap: anywhere;
}
.apanel__sent-hint {
  font-size: 0.76rem;
}
.apanel__sent .btn {
  margin-top: 4px;
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
/* Le bloc de marque n'est pas la suite du formulaire, c'est un autre sujet :
   il lui faut nettement plus d'air que l'espacement interne des champs, sinon
   il colle au « Déjà un compte ? » et se lit comme sa continuation. */
.apanel__promo {
  display: block;
  margin-top: 26px;
}
.link-btn {
  background: none;
  color: var(--sky);
  font-weight: 800;
}
</style>
