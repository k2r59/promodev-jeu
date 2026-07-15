<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'
import { useUiStore } from '../stores/ui.js'
import { Target, Trophy, Award } from 'lucide-vue-next'
import GameStage from '../components/GameStage.vue'
import AuthPanel from '../components/AuthPanel.vue'
import imgPrize from '../assets/blocks/prize.png'
// Même fichier que l'icône « Accueil » de la nav : Vite ne le dédouble pas.
import imgPalmier from '../assets/nav/accueil.png'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()

// Déconnecté, le formulaire ne s'affiche jamais de lui-même : il faut l'avoir
// demandé, via « Se connecter » dans la barre (?mode=connexion) ou via
// « C'est parti » sur le plateau.
const showAuth = computed(() => !auth.isAuth && ui.authFormOpen)

// Le plateau en vitrine, sur grand écran seulement : il y tient à côté du
// cadeau et donne envie avant qu'on réclame un compte. En portrait il prendrait
// tout l'écran et repousserait l'accroche des 1 000 € hors de vue — la page
// déconnectée y reste une page d'accroche.
const showBoard = computed(() => auth.isAuth || !ui.portrait)
const ouvreFormulaire = () => (ui.authFormOpen = true)

watch(
  () => route.query.mode,
  (mode) => {
    if (mode) ui.authFormOpen = true
  },
  { immediate: true }
)
// Se déconnecter ramène à l'accroche, pas au formulaire : on ne réclame pas un
// compte à quelqu'un qui vient de partir.
watch(
  () => auth.isAuth,
  (v) => {
    if (!v) ui.authFormOpen = false
  }
)
// Quitter l'accueil referme le formulaire : en revenant, on retombe sur
// l'accroche et c'est un clic volontaire (« Se connecter », le cadeau, ou
// « C'est parti ») qui le rouvre. Sans ça il restait ouvert en travers du
// chemin de quelqu'un qui n'avait fait que passer voir le classement.
onUnmounted(() => (ui.authFormOpen = false))

const challenges = ref([])
const board = ref([])
const loading = ref(true)

// --- Largeur de la colonne centrale ---------------------------------------
// Le plateau est un carré piloté par la hauteur disponible. Sa colonne doit
// épouser sa largeur, sinon les blocs latéraux restent à distance. Le CSS seul
// n'y arrive pas : la colonne veut sa largeur du contenu, le plateau veut la
// sienne de sa hauteur, que le flex ne résout qu'après — c'est circulaire.
// On mesure donc la hauteur (qui, elle, ne dépend pas de la largeur).
// Le formulaire reçoit la même largeur : il occupe exactement la même place.
const centerEl = ref(null)
const centerW = ref(null)
let ro = null
let lastH = 0

const GAPS = 24 // .stage (hud→zone) + .gamewrap (plateau→boosters)
const SIDE_COLS = 340 * 2 + 16 * 2 // colonnes latérales + gouttières

const isDesktopFit = () =>
  window.matchMedia('(orientation: landscape) and (min-width: 1100px) and (min-height: 620px)').matches

// Hauteurs du chrome du plateau, lues sur les variables CSS (voir styles.css).
// Le calcul est le même que le jeu soit affiché ou non : le formulaire obtient
// donc exactement la largeur du plateau.
function cssPx(name, fallback) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(v) ? v : fallback
}

// Le hub n'étant plus bridé à 1240px, sa largeur dépend du plateau — donc de la
// hauteur de la fenêtre. La barre du site ne peut pas s'aligner dessus en CSS
// seul : on lui publie la largeur mesurée. Sans ça, le logo filait au bord
// pendant que le bloc cadeau restait centré 150px plus loin.
// +28 : les 2x14px de padding du .container. On aligne le CONTENU de la barre
// sur les colonnes, pas sa boîte — sans ça le logo tombait 14px trop à droite.
const CONTAINER_PAD = 28

function publieLargeurHub(w) {
  const root = document.documentElement.style
  if (w) root.setProperty('--hub-w', w + SIDE_COLS + CONTAINER_PAD + 'px')
  else root.removeProperty('--hub-w')
}

function fitCenter() {
  const el = centerEl.value
  if (!el) return
  if (!isDesktopFit()) {
    centerW.value = null
    publieLargeurHub(null)
    lastH = 0
    return
  }
  const h = el.clientHeight
  if (!h || h === lastH) return // ignore nos propres changements de largeur
  lastH = h
  // Le plateau prend toute la hauteur restante, borné par la largeur encore
  // libre une fois les colonnes latérales posées.
  const byHeight = h - cssPx('--hud-h', 63) - cssPx('--boosters-h', 50) - GAPS
  const byWidth = (el.parentElement?.clientWidth || 0) - SIDE_COLS
  centerW.value = Math.round(Math.max(280, Math.min(byHeight, byWidth)))
  publieLargeurHub(centerW.value)
}

const badges = ref([])

// Les fichiers sont nommés d'après les clés du serveur (debutant, rapide,
// stratege, combo, expert, mystere) : pas de table de correspondance à tenir.
const BADGE_IMGS = import.meta.glob('../assets/badges/*.png', { eager: true, import: 'default' })
const badgeImg = (key) => BADGE_IMGS[`../assets/badges/${key}.png`]

// 5 badges max sur le hub ; la liste complète est sur /recompenses.
const topBadges = computed(() => badges.value.slice(0, 5))

// Onglets du classement. Les clés sont celles de l'API (day|week|month|all).
const LB_TABS = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'all', label: 'Général' }
]
const period = ref('week')

async function loadBoard() {
  // Top 5 strict : le hub n'affiche que le podium, le reste est sur /classement.
  const lb = await api('/leaderboard', { query: { period: period.value, limit: 5 } })
  board.value = lb.board
}

async function setPeriod(key) {
  if (period.value === key) return
  period.value = key
  loading.value = true
  try {
    await loadBoard()
  } catch (e) {
    // silencieux : le hub reste utilisable
  } finally {
    loading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    await loadBoard()
    if (auth.isAuth) {
      const [ch, bd] = await Promise.all([api('/game/challenges'), api('/game/badges')])
      challenges.value = ch.challenges
      badges.value = bd.badges
    }
  } catch (e) {
    // silencieux : le hub reste utilisable
  } finally {
    loading.value = false
  }
}

// 3 défis max sur le hub ; la liste complète est sur /defis.
const previewChallenges = computed(() => challenges.value.slice(0, 3))
const isMe = (row) => !!auth.user && String(row.userId) === String(auth.user.id)

// Teintes des pastilles de défis, dans l'ordre de la maquette.
const CHAL_TINTS = ['#ffe4c4', '#d4ecff', '#ffeeae']

onMounted(() => {
  load()
  fitCenter()
  ro = new ResizeObserver(fitCenter)
  ro.observe(centerEl.value)
})
// Pas de nettoyage de --hub-w au démontage, et c'est voulu : avec
// <transition mode="out-in">, le onUnmounted de la vue sortante peut passer
// APRÈS le onMounted de l'entrante — au retour sur le hub, il effaçait la
// valeur que fitCenter venait de publier, et la barre repartait à 1240.
// La variable ne sert de toute façon qu'à `.app-shell--hub` : ailleurs, elle
// dort sans rien faire.
onUnmounted(() => ro?.disconnect())
</script>

<template>
  <div class="home">
    <!-- Colonne gauche -->
    <aside class="col col--left">
      <!-- Bandeau récompense : visuel complet, le CTA est une zone cliquable posée
           sur le bouton dessiné dans l'image.
           Déconnecté, il ouvre le formulaire : sur la page d'accroche c'est le
           seul visuel qui donne envie, autant qu'il mène à l'inscription plutôt
           que dans une impasse. Connecté, il fait ce qu'il annonce et emmène aux
           récompenses. -->
      <div class="prize">
        <img
          class="prize__img"
          :src="imgPrize"
          alt="À gagner : 1 000 € de remise sur votre future opération promo !"
        />
        <RouterLink v-if="auth.isAuth" to="/recompenses" class="prize__cta">
          <span class="sr-only">En savoir plus sur les 1 000 € à gagner</span>
        </RouterLink>
        <button v-else class="prize__cta" @click="ouvreFormulaire">
          <span class="sr-only">Créer un compte pour tenter de gagner les 1 000 €</span>
        </button>
      </div>

      <!-- Défis du jour -->
      <div class="card">
        <div class="card__title"><img class="ico ico--img" :src="imgPalmier" alt="" aria-hidden="true" /> Défis du jour</div>
        <template v-if="auth.isAuth && previewChallenges.length">
          <div v-for="(c, i) in previewChallenges" :key="c.id" class="chal">
            <span class="chal__ico" :style="{ '--tint': CHAL_TINTS[i % CHAL_TINTS.length] }">{{ c.icon }}</span>
            <div class="chal__body">
              <div class="chal__label">{{ c.label }}</div>
              <div class="progress"><div class="progress__bar" :style="{ width: Math.round((c.progress / c.goal) * 100) + '%' }"></div></div>
            </div>
            <span class="chal__reward">{{ c.progress }}/{{ c.goal }} <b>💎{{ c.reward }}</b></span>
          </div>
          <RouterLink to="/defis" class="btn btn--block ch-cta"><Target :size="15" aria-hidden="true" /> Voir tous les défis</RouterLink>
        </template>
        <p v-else class="muted center" style="padding: 8px 0; font-size: 0.93rem">
          Connectez-vous pour relever les défis quotidiens et gagner des gemmes !
        </p>
      </div>

    </aside>

    <!-- Colonne centrale. Déconnecté, on montre quand même le plateau : on voit
         le jeu avant qu'on nous demande quoi que ce soit, et « C'est parti »
         ouvre alors le formulaire, qui vient prendre exactement sa place. -->
    <section ref="centerEl" class="col col--center" :style="centerW ? { width: centerW + 'px' } : null">
      <AuthPanel v-if="showAuth" />
      <GameStage v-else-if="showBoard" @auth="ouvreFormulaire" />
    </section>

    <!-- Colonne droite -->
    <aside class="col col--right">
      <!-- Classement -->
      <div class="card">
        <div class="card__title"><img class="ico ico--img" :src="imgPalmier" alt="" aria-hidden="true" /> Classement</div>
        <div class="lb-tabs" role="tablist">
          <button
            v-for="t in LB_TABS"
            :key="t.key"
            class="lb-tab"
            :class="{ 'is-active': period === t.key }"
            role="tab"
            :aria-selected="period === t.key"
            @click="setPeriod(t.key)"
          >
            {{ t.label }}
          </button>
        </div>
        <div v-if="loading" class="muted center">Chargement…</div>
        <template v-else>
          <div
            v-for="row in board"
            :key="row.userId"
            class="lb-row"
            :class="{ 'lb-row--me': isMe(row) }"
          >
            <span class="lb-rank" :data-rank="row.rank">{{ row.rank }}</span>
            <span class="lb-avatar">{{ row.avatar }}</span>
            <span class="lb-name">{{ row.pseudo }}<em v-if="isMe(row)"> (vous)</em></span>
            <span class="lb-score">{{ row.score.toLocaleString('fr-FR') }} ⭐</span>
          </div>
          <p v-if="!board.length" class="muted center">Soyez le premier à marquer des points !</p>
          <RouterLink to="/classement" class="btn btn--block lb-cta"><Trophy :size="15" aria-hidden="true" /> Voir le classement complet</RouterLink>
        </template>
      </div>

      <!-- Badges -->
      <div class="card">
        <div class="card__title"><img class="ico ico--img" :src="imgPalmier" alt="" aria-hidden="true" /> Badges</div>
        <div class="badges-preview">
          <div v-for="b in topBadges" :key="b.key" class="bdg" :class="{ 'bdg--locked': !b.unlocked }" :title="b.desc">
            <img class="bdg__hex" :src="badgeImg(b.key)" :alt="b.label" />
            <span class="bdg__lbl">{{ b.label }}</span>
          </div>
          <p v-if="!topBadges.length" class="muted center" style="padding: 8px 0; margin: 0; font-size: 0.93rem">
            Connectez-vous pour débloquer vos badges !
          </p>
        </div>
        <RouterLink to="/recompenses" class="btn btn--block lb-cta"><Award :size="15" aria-hidden="true" /> Voir tous les badges</RouterLink>
      </div>
    </aside>

  </div>
</template>

<style scoped>
.home {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 16px;
  padding-top: 18px;
  align-items: start;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Desktop : le hub occupe la hauteur donnée par le shell. Les colonnes latérales
   défilent en interne si leur contenu déborde ; la page, elle, ne défile pas.
   En flex (et non en grid), la colonne centrale se dimensionne sur son contenu :
   le plateau étant bridé par la hauteur, les colonnes viennent se coller à lui
   au lieu de laisser un vide de chaque côté. */
@media (orientation: landscape) and (min-width: 1100px) and (min-height: 620px) {
  .home {
    display: flex;
    justify-content: center;
    height: 100%;
    min-height: 0;
    align-items: stretch;
    padding-top: 14px;
  }
  /* Le plateau étant bridé par la hauteur, la largeur donnée aux colonnes ne lui
     est pas prise : elle serait perdue en marges. */
  .col--left,
  .col--right {
    flex: 0 0 340px;
  }
  /* Largeur ajustée en JS sur le carré du plateau (voir fitCenter).
     560px = repli avant la première mesure, pour que le HUD soit mesuré
     à sa largeur réelle et non replié.
     `order: 0` n'est pas décoratif : la règle `max-width: 1080px` plus bas dans
     ce fichier pose `order: -1` (héritage de l'ancienne grille empilée) et, en
     flex, ça sortait le jeu à gauche du cadeau. On l'annule ici plutôt que de
     compter sur l'ordre du fichier. */
  .col--center {
    flex: 0 0 auto;
    width: 560px;
    order: 0;
  }
  .col {
    height: 100%;
    min-height: 0;
  }
  .col--left,
  .col--right {
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .col--center {
    overflow: hidden;
  }
}

.prize {
  position: relative;
  line-height: 0;
}
.prize__img {
  width: 100%;
  height: auto;
  border-radius: var(--radius);
  /* Deux ombres, pas une : le ciel du visuel est du même bleu que le fond de
     page, donc l'ombre portée seule ne détache pas le bord haut. Le premier
     drop-shadow est un liseré de contact (flou 1px) qui redessine la découpe ;
     le second donne la profondeur. */
  filter: drop-shadow(0 0 1px rgba(43, 45, 90, 0.3)) drop-shadow(0 10px 22px rgba(43, 45, 90, 0.28));
}
/* Calée sur le bouton « EN SAVOIR PLUS » dessiné dans le visuel.
   `background: none` : c'est tantôt un lien, tantôt un <button>, et un bouton
   arrive avec un fond gris par défaut qui masquerait le visuel. */
.prize__cta {
  position: absolute;
  left: 26%;
  top: 70%;
  width: 46.7%;
  height: 10.6%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 999px;
  transition: transform 0.08s ease, box-shadow 0.15s ease;
}
.prize__cta:hover {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.85);
}
.prize__cta:active {
  transform: translateY(2px);
}
.prize__cta:focus-visible {
  outline: 3px solid var(--sky);
  outline-offset: 2px;
}


.chal {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}
.chal__ico {
  font-size: 1.7rem;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  background: var(--tint, #f3f6fc);
  border-radius: 15px;
  box-shadow: inset 0 -2px 0 rgba(43, 45, 90, 0.07);
  flex-shrink: 0;
}
.chal__body {
  flex: 1;
  min-width: 0;
}
.chal__label {
  font-weight: 800;
  font-size: 0.85rem;
  margin-bottom: 5px;
}
.chal__reward {
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}
.chal__reward b {
  display: block;
  color: var(--sea);
}



/* Onglets de période : piste claire, onglet actif en pastille bleue. */
.lb-tabs {
  display: flex;
  gap: 2px;
  background: #eaf4fd;
  border-radius: 999px;
  padding: 3px;
  margin-bottom: 10px;
}
.lb-tab {
  flex: 1;
  padding: 7px 4px;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font-weight: 800;
  font-size: 0.8rem;
  transition: background 0.15s, color 0.15s;
}
.lb-tab:hover:not(.is-active) {
  color: var(--ink);
}
.lb-tab.is-active {
  background: linear-gradient(180deg, var(--sky-2), var(--sky));
  color: #fff;
  box-shadow: 0 2px 6px rgba(57, 182, 255, 0.4);
}

/* CTA des cartes du hub : pastille pleine largeur, en capitales.
   Rose pour le classement, bleu pour les défis — comme la maquette. */
/* Pastilles plates et fines, sans le relief épais du .btn du jeu. */
.lb-cta,
.ch-cta {
  margin-top: 10px;
  padding: 11px 18px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.84rem;
  box-shadow: 0 3px 10px rgba(43, 45, 90, 0.18);
}
.lb-cta:active,
.ch-cta:active {
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(43, 45, 90, 0.18);
}
.ch-cta {
  background: linear-gradient(180deg, #5cbdf5, #2e93e0);
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px;
  border-radius: 12px;
}
.lb-row--me {
  background: linear-gradient(90deg, #fff0f6, #ffe6f0);
}
.lb-rank {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-weight: 900;
  font-size: 0.85rem;
  background: #eef1f8;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.lb-rank[data-rank='1'] {
  background: linear-gradient(180deg, #ffe08a, #ffc93c);
  color: #7a4b00;
}
.lb-rank[data-rank='2'] {
  background: linear-gradient(180deg, #e6ecf5, #c3cede);
  color: #4a556b;
}
.lb-rank[data-rank='3'] {
  background: linear-gradient(180deg, #ffcfa0, #ff9d5c);
  color: #7a3b00;
}
.lb-avatar {
  font-size: 1.3rem;
}
.lb-name {
  flex: 1;
  font-weight: 800;
  font-size: 0.9rem;
}
.lb-name em {
  color: var(--coral);
  font-style: normal;
  font-weight: 700;
}
.lb-score {
  font-weight: 900;
  color: var(--sea);
  font-size: 0.9rem;
  white-space: nowrap;
}

.badges-preview {
  display: flex;
  gap: 6px;
  justify-content: space-between;
  align-items: flex-start;
}
.bdg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.bdg__hex {
  width: 100%;
  max-width: 54px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 3px 5px rgba(43, 45, 90, 0.22));
}
.bdg__lbl {
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
  text-align: center;
  line-height: 1.15;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bdg--locked .bdg__hex {
  filter: grayscale(1) drop-shadow(0 2px 4px rgba(43, 45, 90, 0.14));
  opacity: 0.7;
}
.bdg--locked .bdg__lbl {
  opacity: 0.65;
}

@media (max-width: 1080px) {
  .home {
    grid-template-columns: 1fr 1fr;
  }
  .col--center {
    grid-column: 1 / -1;
    order: -1;
  }
}
@media (max-width: 720px) {
  .home {
    grid-template-columns: 1fr;
  }
}

/* Portrait. Deux écrans très différents partagent cette route :
   - connecté (.app-shell--game) : c'est LE jeu, cadré sur la fenêtre ;
   - déconnecté : c'est un formulaire d'inscription, donc une page qui défile,
     et le cadeau des 1 000 € reste — c'est lui qui donne envie de s'inscrire.
   D'où le préfixe .app-shell--game : sans lui, le formulaire héritait d'une
   hauteur fixe et ses derniers champs sortaient de l'écran. */
@media (orientation: portrait) and (max-width: 1100px) {
  .home {
    display: flex;
    flex-direction: column;
    /* Indispensable : la règle de base pose `align-items: start` pour la grille
       desktop. En flex colonne, cette valeur empêche la colonne de s'étirer en
       largeur — le jeu se tassait sur la largeur de son contenu. */
    align-items: stretch;
  }
  /* Déconnecté : le classement, les badges et les défis n'ont rien à dire à qui
     n'a pas de compte, et ils ont chacun leur onglet. Restent le formulaire et
     le cadeau. */
  .col--right,
  .col--left > .card {
    display: none;
  }
  /* Une tablette n'a pas besoin de champs de 750px de large.
     Ciblé sur « pas l'écran de jeu » plutôt qu'annulé ensuite : `margin: auto`
     désactive `align-items: stretch`, et un simple `max-width: none` côté jeu
     ne suffisait donc pas — le plateau retombait à 288px sur un iPad de 820. */
  .app-shell:not(.app-shell--game) .home {
    max-width: 460px;
    margin: 0 auto;
  }
  /* Formulaire AVANT le cadeau, et c'est un choix : ainsi il tient en entier
     sans défiler, bouton compris. Le cadeau juste dessous répond à « pourquoi
     je donnerais mon e-mail ? » à qui hésite. (`order` était déjà posé par la
     règle 1080px plus haut ; on l'assume ici plutôt que d'en hériter par
     accident.) */
  .col--center {
    order: -1;
    width: auto;
  }

  /* Écran de jeu : il ne reste QUE le jeu. Le cadeau, les défis, le classement
     et les badges ont chacun leur onglet dans la nav du bas ; les empiler sous
     le plateau ne ferait que rallonger une page qu'on ne défile pas.
     `padding-top: 0` ici SEULEMENT : le HUD doit être à fleur de barre. Sur la
     page déconnectée, qui n'est pas le jeu, il collait le formulaire au header. */
  .app-shell--game .home {
    height: 100%;
    min-height: 0;
    padding-top: 0;
    gap: 0;
  }
  .app-shell--game .col--left {
    display: none;
  }
  .app-shell--game .col--center {
    flex: 1;
    min-height: 0;
  }
}
</style>
