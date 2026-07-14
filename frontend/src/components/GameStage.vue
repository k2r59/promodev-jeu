<script setup>
// Le jeu tel qu'il vit dans la colonne centrale du hub : HUD + plateau + overlays.
// Le composant se dimensionne sur la hauteur qu'on lui donne (pas de scroll).
import { ref, reactive, computed, onUnmounted } from 'vue'
import GameBoard from './GameBoard.vue'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'
import { sfx } from '../game/sound.js'

const auth = useAuthStore()

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
      score: live.score,
      maxCombo: live.maxCombo,
      boostersUsed: live.boostersUsed,
      matches: live.matches,
      durationSec: GAME_SECONDS
    }
    const res = await api('/game/session', { method: 'POST', body: payload })
    auth.setUser(res.user)
    result.value = res
    if (res.gained && (res.gained.gems > 0 || res.gained.newBadges?.length)) sfx.reward()
  } catch (e) {
    submitError.value = e.message || 'Impossible d’enregistrer le score.'
  } finally {
    submitting.value = false
  }
}

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
    <!-- HUD -->
    <div class="hud card">
      <div class="hud__item">
        <span class="hud__lbl">Score</span>
        <span class="hud__val hud__val--score">⭐ {{ live.score.toLocaleString('fr-FR') }}</span>
      </div>
      <div class="hud__item">
        <span class="hud__lbl">Temps</span>
        <span class="hud__val hud__val--time" :class="{ 'is-low': timeLeft <= 10 && isPlaying }">⏱️ {{ timeStr }}</span>
      </div>
      <div class="hud__item hud__item--obj">
        <span class="hud__lbl">Objectif</span>
        <span class="hud__obj-txt">Atteindre {{ OBJECTIVE.toLocaleString('fr-FR') }} points</span>
        <div class="progress progress--sun"><div class="progress__bar" :style="{ width: objectivePct + '%' }"></div></div>
      </div>
    </div>

    <!-- Plateau -->
    <div class="board-zone">
      <GameBoard ref="board" :active="isPlaying" @update="onUpdate" @floating="onFloating" />

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
          <p class="muted">2 minutes chrono pour aligner un max de tuiles estivales et exploser votre score !</p>
          <button class="btn btn--lg" @click="startGame">▶ C'est parti !</button>
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

          <div v-if="submitting" class="muted">Enregistrement du score…</div>
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
            <div v-if="result.gained.newBadges?.length" class="unlocks">
              <div class="unlocks__title">🏅 Nouveaux badges</div>
              <div class="badge-strip">
                <span v-for="b in result.gained.newBadges" :key="b.key" class="badge-pop">{{ b.icon }} {{ b.label }}</span>
              </div>
            </div>
          </template>

          <div class="overlay__actions">
            <button class="btn btn--sea" @click="replay">🔁 Rejouer</button>
            <button class="btn btn--ghost" @click="backToIntro">Fermer</button>
            <RouterLink to="/classement" class="btn btn--sun">🏆 Classement</RouterLink>
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
/* Compact : chaque pixel repris ici va au plateau, qui est bridé par la hauteur. */
.hud {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 8px 16px;
  flex-shrink: 0;
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
  font-size: 1.3rem;
  font-weight: 900;
}
.hud__val--score {
  color: var(--coral);
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
</style>
