<script setup>
// Le jeu tel qu'il vit dans la colonne centrale du hub : HUD + plateau + overlays.
// Le composant se dimensionne sur la hauteur qu'on lui donne (pas de scroll).
import { ref, reactive, computed, onUnmounted } from 'vue'
import { Star, Timer, Gem, RotateCw, Trophy } from 'lucide-vue-next'
import GameBoard from './GameBoard.vue'
import SoundButton from './SoundButton.vue'
import PlayerSheet from './PlayerSheet.vue'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'
import { useUiStore } from '../stores/ui.js'
import { sfx } from '../game/sound.js'

const auth = useAuthStore()
const ui = useUiStore()

// Déconnecté, le plateau est une vitrine : on le montre, mais « C'est parti »
// demande le compte au lieu de lancer une partie. Un score ne se joue pas sans
// pouvoir être enregistré.
const emit = defineEmits(['auth'])

const GAME_SECONDS = 120
const OBJECTIVE = 3000

const board = ref(null)
const phase = ref('intro') // intro | countdown | playing | over
const timeLeft = ref(GAME_SECONDS)
const live = reactive({ score: 0, maxCombo: 0, boostersUsed: 0, matches: 0 })
const countdownNum = ref(3)
const floatings = ref([])
const result = ref(null)
const submitting = ref(false)
const submitError = ref('')
// Jeton de la partie en cours, remis par le serveur à /game/start. C'est lui qui
// prouve, à la soumission, qu'une vraie partie a été ouverte et a duré son temps.
const sessionToken = ref('')
const startError = ref('')
const starting = ref(false)

let timerId = null
let floatId = 0

const timeStr = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const objectivePct = computed(() => Math.min(100, Math.round((live.score / OBJECTIVE) * 100)))
const isPlaying = computed(() => phase.value === 'playing')

function onUpdate(s) {
  Object.assign(live, s)
}
function onFloating({ text }) {
  const id = floatId++
  const x = 20 + Math.random() * 60
  floatings.value.push({ id, text, x })
  setTimeout(() => {
    floatings.value = floatings.value.filter((f) => f.id !== id)
  }, 900)
}

async function startGame() {
  if (!auth.isAuth) return emit('auth')
  if (starting.value) return
  // On ouvre la session AVANT de lancer quoi que ce soit : c'est elle qui
  // horodate le départ côté serveur, et sans jeton valide le score serait
  // refusé à la fin. Si l'ouverture échoue, on ne lance pas une partie qui ne
  // pourra pas être enregistrée — on le dit et on reste sur l'intro.
  starting.value = true
  startError.value = ''
  try {
    const res = await api('/game/start', { method: 'POST' })
    sessionToken.value = res.sessionToken
  } catch (e) {
    startError.value = e.message || 'Impossible de démarrer la partie. Réessayez.'
    starting.value = false
    return
  }
  starting.value = false
  // Avant le décompte, pas après : c'est l'accusé de réception du clic. Les
  // trois bips du décompte viennent par-dessus, ils ne se marchent pas dessus.
  sfx.jouer()
  phase.value = 'countdown'
  countdownNum.value = 3
  board.value?.reset()
  for (let n = 3; n >= 1; n--) {
    countdownNum.value = n
    sfx.countdown()
    await sleep(700)
  }
  phase.value = 'playing'
  timeLeft.value = GAME_SECONDS
  timerId = setInterval(tick, 1000)
}

function tick() {
  timeLeft.value--
  if (timeLeft.value <= 5 && timeLeft.value > 0) sfx.countdown()
  if (timeLeft.value <= 0) endGame()
}

async function endGame() {
  clearInterval(timerId)
  phase.value = 'over'
  sfx.gameover()
  await submitScore()
}

async function submitScore() {
  submitting.value = true
  submitError.value = ''
  try {
    const payload = {
      // Le jeton lie ce résultat à la session ouverte au départ. La durée n'est
      // plus envoyée : le serveur la mesure lui-même entre /start et ici.
      sessionToken: sessionToken.value,
      score: live.score,
      maxCombo: live.maxCombo,
      boostersUsed: live.boostersUsed,
      matches: live.matches
    }
    const res = await api('/game/session', { method: 'POST', body: payload })
    // Le jeton ne vaut qu'une fois : on l'oublie, la prochaine partie en aura un neuf.
    sessionToken.value = ''
    auth.setUser(res.user)
    result.value = res
    if (res.gained && (res.gained.gems > 0 || res.gained.newBadges?.length)) sfx.reward()
  } catch (e) {
    submitError.value = e.message || 'Impossible d’enregistrer le score.'
  } finally {
    submitting.value = false
  }
}

// Les défis du jour qui restent à décrocher. La réponse de fin de partie les
// porte déjà (routes/game.js les renvoie à jour) : aucun appel à ajouter, et
// surtout aucun risque d'afficher un état périmé.
//
// Réservé au portrait : sur desktop, le hub montre les défis en permanence dans
// sa colonne de gauche, les répéter ici serait du bruit. Sur mobile il n'y a pas
// de colonne, et l'écran de fin est justement le moment où le joueur décide s'il
// relance — c'est là que l'information vaut quelque chose.
const remainingChallenges = computed(() => (result.value?.challenges || []).filter((c) => !c.done))

function replay() {
  result.value = null
  live.score = 0
  startGame()
}
// Le hub est déjà à l'écran : on revient simplement à l'écran d'accroche.
function backToIntro() {
  result.value = null
  live.score = 0
  timeLeft.value = GAME_SECONDS
  phase.value = 'intro'
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

onUnmounted(() => clearInterval(timerId))
</script>

<template>
  <div class="stage">
    <!-- HUD. En portrait c'est la seule barre de l'écran : elle porte donc aussi
         le profil, les gemmes et le son, que le shell n'affiche plus. -->
    <div class="hud card">
      <PlayerSheet v-if="ui.portrait" class="hud__player" />

      <div class="hud__item hud__item--score">
        <span class="hud__lbl">Score</span>
        <!-- L'objectif est collé au score plutôt que posé sur la jauge : il ne
             coûte ainsi aucune hauteur (contractuelle, cf. --hud-h), et surtout
             il dit d'un coup ce que la jauge seule taisait — que la partie est
             une tentative VERS un but, et non un compteur qui s'empile. -->
        <span class="hud__val hud__val--score">
          <Star :size="17" fill="currentColor" aria-hidden="true" />{{ live.score.toLocaleString('fr-FR') }}
          <small class="hud__goal">/ {{ OBJECTIVE.toLocaleString('fr-FR') }}</small>
        </span>
      </div>
      <div class="hud__item hud__item--time">
        <span class="hud__lbl">Temps</span>
        <span class="hud__val hud__val--time" :class="{ 'is-low': timeLeft <= 10 && isPlaying }">
          <Timer :size="17" aria-hidden="true" />{{ timeStr }}
        </span>
      </div>
      <div class="hud__item hud__item--obj">
        <span class="hud__lbl">Objectif</span>
        <span class="hud__obj-txt">Atteindre {{ OBJECTIVE.toLocaleString('fr-FR') }} points</span>
        <div class="progress progress--sun">
          <div class="progress__bar" :style="{ width: objectivePct + '%' }"></div>
        </div>
        <span class="sr-only">{{ objectivePct }} % de l'objectif</span>
      </div>

      <template v-if="ui.portrait">
        <div class="hud__gems">
          <Gem :size="15" aria-hidden="true" />{{ auth.user?.gems ?? 0 }}
        </div>
        <SoundButton class="hud__snd" />
      </template>
    </div>

    <!-- Plateau -->
    <div class="board-zone">
      <GameBoard ref="board" :active="isPlaying" :portrait="ui.portrait" @update="onUpdate" @floating="onFloating" />

      <div class="floats">
        <transition-group name="floatup">
          <span v-for="f in floatings" :key="f.id" class="floattxt" :style="{ left: f.x + '%' }">{{ f.text }}</span>
        </transition-group>
      </div>

      <!-- Overlay intro -->
      <div v-if="phase === 'intro'" class="overlay">
        <div class="overlay__card">
          <div class="overlay__emoji float">🏖️</div>
          <h2>Prêt à jouer ?</h2>
          <p class="muted">
            2 minutes chrono pour aligner un max de tuiles estivales et exploser votre score !
            <template v-if="!auth.isAuth"><br />Créez votre compte en 30 secondes pour lancer votre première partie.</template>
          </p>
          <p v-if="startError" class="overlay__err">{{ startError }}</p>
          <button class="btn btn--lg btn--leaf" :disabled="starting" @click="startGame">
            <span v-if="starting" class="spin" aria-hidden="true"></span>{{ starting ? 'Un instant…' : "▶ C'est parti !" }}
          </button>
        </div>
      </div>

      <!-- Décompte -->
      <div v-if="phase === 'countdown'" class="overlay overlay--count">
        <div class="count-num" :key="countdownNum">{{ countdownNum }}</div>
      </div>

      <!-- Game over -->
      <div v-if="phase === 'over'" class="overlay">
        <div class="overlay__card overlay__card--result">
          <div class="overlay__emoji">🏆</div>
          <h2>Partie terminée !</h2>
          <div class="final-score">{{ live.score.toLocaleString('fr-FR') }} <small>points</small></div>

          <div v-if="submitting" class="muted"><span class="spin" aria-hidden="true"></span>Enregistrement du score…</div>
          <!-- Reste un bandeau inline là où les formulaires sont passés au
               dialogue modal (AlertDialog) : ce n'est pas une erreur de saisie
               à acquitter, c'est un état de cette carte-ci — il prend la place
               des gains qu'on ne peut pas afficher. Un modal par-dessus
               l'overlay de fin de partie empilerait deux fenêtres pour dire une
               chose qu'on lit très bien ici. -->
          <div v-else-if="submitError" class="error-msg">{{ submitError }}</div>

          <template v-else-if="result">
            <div class="gains">
              <div class="gain"><span>✨ XP</span><b>+{{ (result.gained.gameXp || 0) + (result.gained.xp || 0) }}</b></div>
              <div class="gain"><span>💎 Gemmes</span><b>+{{ result.gained.gems || 0 }}</b></div>
              <div class="gain"><span>🔥 Combo max</span><b>x{{ live.maxCombo }}</b></div>
            </div>

            <div v-if="result.gained.completed?.length" class="unlocks">
              <div class="unlocks__title">🎯 Défis réussis</div>
              <div v-for="c in result.gained.completed" :key="c.id" class="unlock-row">
                {{ c.label }} <span class="pill pill--reward">+{{ c.reward }} 💎</span>
              </div>
            </div>
            <!-- Après les défis réussis, jamais avant : on félicite d'abord, on
                 relance ensuite. -->
            <div v-if="ui.portrait && remainingChallenges.length" class="unlocks unlocks--todo">
              <div class="unlocks__title">🎯 Encore à décrocher aujourd'hui</div>
              <div v-for="c in remainingChallenges" :key="c.id" class="unlock-row">
                <span class="todo__lbl">{{ c.icon }} {{ c.label }}</span>
                <span class="todo__prog">{{ c.progress }}/{{ c.goal }}</span>
                <span class="pill pill--reward">+{{ c.reward }} 💎</span>
              </div>
            </div>

            <div v-if="result.gained.newBadges?.length" class="unlocks">
              <div class="unlocks__title">🏅 Nouveaux badges</div>
              <div class="badge-strip">
                <span v-for="b in result.gained.newBadges" :key="b.key" class="badge-pop">{{ b.icon }} {{ b.label }}</span>
              </div>
            </div>
          </template>

          <div class="overlay__actions">
            <button class="btn btn--sea" @click="replay"><RotateCw :size="15" aria-hidden="true" /> Rejouer</button>
            <button class="btn btn--ghost" @click="backToIntro">Fermer</button>
            <RouterLink to="/classement" class="btn btn--sun"><Trophy :size="15" aria-hidden="true" /> Classement</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Colonne pleine hauteur : le HUD garde sa taille, le plateau prend le reste. */
.stage {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
/* Hauteur fixe (--hud-h) : fitCenter s'en sert pour donner au formulaire
   exactement la largeur du jeu. Ne pas la remplacer par une hauteur auto. */
.hud {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  height: var(--hud-h);
  padding: 0 16px;
  flex-shrink: 0;
  /* Sans ce z-index, le popover du son passait SOUS le plateau. Le HUD porte la
     classe `card`, dont le `backdrop-filter` crée un contexte d'empilement :
     le z-index 60 du popover y restait enfermé et ne pouvait plus rivaliser
     avec .board-zone, qui vient après dans le DOM. C'est donc le HUD entier
     qu'il faut élever, pas le popover — augmenter son z-index n'aurait servi à
     rien. 20 : au-dessus du plateau, sous la barre du site (50) et la nav (60).
     L'overlay de fin de partie n'est pas concerné, il vit dans .board-zone et
     ne couvre que le plateau. */
  z-index: 20;
}
.hud__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hud__item--obj {
  flex: 1;
  min-width: 140px;
}
.hud__lbl {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.hud__val {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 1.3rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.hud__val--score {
  color: var(--coral);
}
/* Le but est un repère, pas une performance : il doit se lire sans disputer
   l'œil au score. Sans ces règles, le <small> héritait du corail et du gras 900
   de .hud__val et les deux nombres sortaient au même poids. */
.hud__goal {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--ink-soft);
}
.hud__val--time {
  color: var(--sea);
}
.hud__val--time.is-low {
  color: var(--coral);
  animation: blink 0.5s steps(2) infinite;
}
@keyframes blink {
  50% {
    opacity: 0.4;
  }
}
.hud__obj-txt {
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 4px;
}

/* Zone qui absorbe la hauteur restante ; le plateau s'y inscrit en carré. */
.board-zone {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
}
.floats {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
}
.floattxt {
  position: absolute;
  top: 40%;
  font-weight: 900;
  font-size: 1.5rem;
  color: #fff;
  -webkit-text-stroke: 2px var(--coral);
  paint-order: stroke fill;
}
.floatup-enter-active {
  transition: all 0.9s ease;
}
.floatup-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.floatup-leave-active {
  transition: all 0.9s ease;
}
.floatup-leave-to {
  opacity: 0;
  transform: translateY(-60px);
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  background: rgba(20, 40, 70, 0.55);
  backdrop-filter: blur(3px);
  border-radius: 22px;
}
.overlay--count {
  background: rgba(20, 40, 70, 0.35);
}
.overlay__card {
  background: #fff;
  border-radius: 24px;
  padding: 22px 20px;
  width: min(92%, 420px);
  max-height: 100%;
  overflow-y: auto;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: pop-in 0.3s ease;
}
.overlay__emoji {
  font-size: 3rem;
}
.overlay__card h2 {
  margin: 6px 0 8px;
  font-size: 1.5rem;
}
.overlay__card p {
  margin: 0 0 18px;
}
.overlay__err {
  color: #c0304a;
  font-weight: 700;
  font-size: 0.9rem;
}
.final-score {
  font-size: 2.6rem;
  font-weight: 900;
  color: var(--coral);
  margin: 6px 0 16px;
}
.final-score small {
  font-size: 1rem;
  color: var(--ink-soft);
}
.gains {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.gain {
  background: #f4f7fc;
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  min-width: 84px;
}
.gain span {
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-weight: 700;
}
.gain b {
  font-size: 1.2rem;
}
.unlocks {
  text-align: left;
  background: #fff8e8;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 12px;
}
.unlocks__title {
  font-weight: 900;
  margin-bottom: 6px;
}
.unlock-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 3px 0;
}
/* Bleu et non le jaune des défis réussis : c'est un rappel, pas une
   récompense. Le joueur doit distinguer d'un coup d'œil ce qu'il a gagné de ce
   qu'il lui reste à faire. */
.unlocks--todo {
  background: #eef7ff;
}
/* Le libellé cède la place en premier : la progression et la récompense sont
   des valeurs courtes qu'on ne peut pas tronquer sans les rendre fausses. */
.todo__lbl {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo__prog {
  flex-shrink: 0;
  margin: 0 8px;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.pill--reward {
  background: #fff;
  color: var(--coral);
}
.badge-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.badge-pop {
  background: #fff;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.85rem;
  box-shadow: var(--shadow);
  animation: pop-in 0.4s ease backwards;
}
/* Une seule ligne, boutons fins : on écrase ici le relief épais des .btn du jeu
   (spécificité 0,2,0 contre 0,1,0 pour .btn--sea/--sun, donc ça passe). */
.overlay__actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: nowrap;
  margin-top: 14px;
}
.overlay__actions .btn {
  flex: 1 1 0;
  min-width: 0;
  padding: 11px 10px;
  font-size: 0.86rem;
  white-space: nowrap;
  box-shadow: 0 3px 10px rgba(43, 45, 90, 0.18);
}
.overlay__actions .btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(43, 45, 90, 0.18);
}
.count-num {
  font-size: 8rem;
  font-weight: 900;
  color: #fff;
  -webkit-text-stroke: 5px var(--coral);
  paint-order: stroke fill;
  animation: count-pulse 0.7s ease;
}
@keyframes count-pulse {
  0% {
    transform: scale(2.2);
    opacity: 0;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.7);
    opacity: 0;
  }
}

/* ---------------------------------------------------------------------------
   Écran de jeu portrait (mobile + tablette)
   La barre du site s'efface : ce HUD devient la seule barre de l'écran. Il
   récupère donc le profil, les gemmes et le son, sans grandir pour autant —
   chaque pixel qu'il ne prend pas revient au plateau.
   --------------------------------------------------------------------------- */
@media (orientation: portrait) and (max-width: 1100px) {
  .stage {
    gap: 8px;
  }
  .hud {
    gap: 10px;
    padding: 0 12px 8px;
    border-radius: 0 0 var(--radius) var(--radius);
  }
  .hud__lbl {
    display: none; /* « SCORE » au-dessus d'une étoile et d'un nombre : redondant */
  }
  .hud__val {
    font-size: 1.15rem;
  }
  /* L'objectif perd son texte et devient un liseré sur toute la largeur, calé
     en bas de la carte : l'information reste, la hauteur part au plateau. */
  .hud__item--obj {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 6px;
    min-width: 0;
    flex: none;
  }
  .hud__obj-txt {
    display: none;
  }
  .hud__item--obj .progress {
    height: 5px;
  }
  .hud__item--score {
    flex: 1;
    min-width: 0;
  }
  .hud__gems {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #eaf7ff;
    color: var(--sea);
    font-weight: 900;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  /* Le bouton son du HUD est plus discret que celui du header : ici il n'est
     pas l'élément principal, il ne doit pas concurrencer le score. */
  .hud__snd :deep(.snd__btn) {
    width: 34px;
    height: 34px;
    box-shadow: none;
    background: #f3f6fc;
  }

  /* Les overlays couvrent le plateau : sur un écran étroit ils prennent presque
     toute la largeur, et le contenu défile si la partie a beaucoup à raconter. */
  .overlay__card {
    width: min(94%, 420px);
    padding: 20px 16px;
  }
  .overlay__emoji {
    font-size: 2.4rem;
  }
  .final-score {
    font-size: 2.2rem;
    margin: 4px 0 12px;
  }
  .gain {
    min-width: 72px;
    padding: 8px 11px;
  }
  .overlay__actions .btn {
    padding: 12px 6px;
    font-size: 0.8rem;
  }
  .count-num {
    font-size: 6rem;
  }
}
</style>
