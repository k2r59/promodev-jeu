<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  SIZE,
  createGrid,
  findMatches,
  clearCells,
  collapse,
  swap,
  swapMakesMatch,
  areAdjacent,
  hasAnyMove,
  reshuffle,
  boosterCells
} from '../game/engine.js'
import { TILES, BOOSTERS } from '../game/gameData.js'
import { sfx } from '../game/sound.js'

const props = defineProps({
  active: { type: Boolean, default: true } // input autorisé (partie en cours)
})
const emit = defineEmits(['update', 'combo', 'floating'])

const grid = ref(createGrid())
const clearing = reactive(new Set()) // clés "r,c" en cours de destruction
const selected = ref(null) // { r, c }
const busy = ref(false) // résolution en cours
const armedBooster = ref(null) // booster prêt à être placé

// Inventaire de départ (comme le mockup : 3 / 2 / 1)
const inventory = reactive({ bombe: 3, eclair: 2, vague: 1 })

const stats = reactive({ score: 0, maxCombo: 0, boostersUsed: 0, matches: 0 })
const comboPopup = ref(0)

const tiles = computed(() => {
  const out = []
  const g = grid.value
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = g[r][c]
      if (cell && cell.type !== null) out.push({ id: cell.id, type: cell.type, r, c })
    }
  }
  return out
})

function tileStyle(t) {
  return {
    transform: `translate(${t.c * 100}%, ${t.r * 100}%)`
  }
}
function keyOf(r, c) {
  return `${r},${c}`
}
function emitUpdate() {
  emit('update', { ...stats })
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms))

onMounted(emitUpdate)

// --- Interaction ---
let pointerStart = null

function onPointerDown(e, r, c) {
  if (!canPlay.value) return
  pointerStart = { r, c, x: e.clientX ?? 0, y: e.clientY ?? 0 }
}

function onPointerUp(e, r, c) {
  if (!canPlay.value) return
  if (armedBooster.value) {
    applyBooster(r, c)
    return
  }
  const start = pointerStart
  pointerStart = null
  if (!start) return

  const dx = (e.clientX ?? 0) - start.x
  const dy = (e.clientY ?? 0) - start.y
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  // Swipe détecté
  if (Math.max(absX, absY) > 18) {
    let target
    if (absX > absY) target = { r: start.r, c: start.c + (dx > 0 ? 1 : -1) }
    else target = { r: start.r + (dy > 0 ? 1 : -1), c: start.c }
    selected.value = null
    trySwap(start, target)
    return
  }

  // Tap
  if (selected.value) {
    if (selected.value.r === r && selected.value.c === c) {
      selected.value = null
    } else if (areAdjacent(selected.value, { r, c })) {
      const from = selected.value
      selected.value = null
      trySwap(from, { r, c })
    } else {
      selected.value = { r, c }
    }
  } else {
    selected.value = { r, c }
  }
}

const canPlay = computed(() => props.active && !busy.value)

async function trySwap(a, b) {
  if (!a || !b) return
  if (b.r < 0 || b.r >= SIZE || b.c < 0 || b.c >= SIZE) return
  if (!areAdjacent(a, b)) return

  busy.value = true
  const g = grid.value
  if (swapMakesMatch(g, a, b)) {
    sfx.swap()
    swap(g, a, b)
    grid.value = [...g] // force le re-render
    await delay(180)
    await resolve()
  } else {
    // Échange invalide : petit aller-retour
    sfx.invalid()
    swap(g, a, b)
    grid.value = [...g]
    await delay(160)
    swap(g, a, b)
    grid.value = [...g]
    await delay(160)
  }
  busy.value = false
}

// Résout toutes les cascades avec multiplicateur de combo croissant.
async function resolve() {
  let combo = 0
  const g = grid.value
  while (true) {
    const matches = findMatches(g)
    if (matches.size === 0) break
    combo++

    const mult = combo
    const gained = matches.size * 10 * mult + (matches.size >= 4 ? 60 : 0)
    stats.score += gained
    stats.matches += 1
    if (combo > stats.maxCombo) stats.maxCombo = combo

    if (combo >= 2) {
      comboPopup.value = combo
      emit('combo', combo)
    }
    emit('floating', { text: `+${gained}`, combo })
    emitUpdate()
    sfx.match(combo)

    // Phase 1 : animation de destruction
    matches.forEach((k) => clearing.add(k))
    grid.value = [...g]
    await delay(230)

    // Phase 2 : suppression + gravité
    clearCells(g, matches)
    clearing.clear()
    collapse(g)
    grid.value = [...g]
    await delay(250)
  }

  comboPopup.value = 0

  // Plus aucun coup possible : on mélange
  if (!hasAnyMove(g)) {
    emit('floating', { text: 'Mélange !', combo: 0 })
    reshuffle(g)
    grid.value = [...g]
    await delay(300)
  }
}

// --- Boosters ---
function armBooster(key) {
  if (!canPlay.value || inventory[key] <= 0) return
  armedBooster.value = armedBooster.value === key ? null : key
  selected.value = null
}

async function applyBooster(r, c) {
  const key = armedBooster.value
  armedBooster.value = null
  if (!key || inventory[key] <= 0) return

  busy.value = true
  const g = grid.value
  const cells = boosterCells(g, key, r, c)
  inventory[key]--
  stats.boostersUsed++

  const gained = cells.size * 15
  stats.score += gained
  emit('floating', { text: `+${gained}`, combo: 0 })
  sfx.booster()

  cells.forEach((k) => clearing.add(k))
  grid.value = [...g]
  await delay(260)

  clearCells(g, cells)
  clearing.clear()
  collapse(g)
  grid.value = [...g]
  emitUpdate()
  await delay(250)

  await resolve()
  busy.value = false
}

// Ajoute des boosters depuis l'extérieur (récompense de combo, etc.)
function addBooster(key, n = 1) {
  if (inventory[key] != null) inventory[key] += n
}
function reset() {
  grid.value = createGrid()
  clearing.clear()
  selected.value = null
  armedBooster.value = null
  busy.value = false
  Object.assign(inventory, { bombe: 3, eclair: 2, vague: 1 })
  Object.assign(stats, { score: 0, maxCombo: 0, boostersUsed: 0, matches: 0 })
  emitUpdate()
}

defineExpose({ reset, addBooster, stats })

const boosterList = computed(() =>
  Object.values(BOOSTERS).map((b) => ({ ...b, count: inventory[b.key] }))
)
</script>

<template>
  <div class="gamewrap">
    <div class="board" :class="{ 'board--armed': armedBooster }">
      <div
        v-for="t in tiles"
        :key="t.id"
        class="tile"
        :class="{
          'tile--clearing': clearing.has(keyOf(t.r, t.c)),
          'tile--selected': selected && selected.r === t.r && selected.c === t.c
        }"
        :style="tileStyle(t)"
        @pointerdown="onPointerDown($event, t.r, t.c)"
        @pointerup="onPointerUp($event, t.r, t.c)"
      >
        <span class="tile__face" :style="{ background: TILES[t.type].color }">
          {{ TILES[t.type].emoji }}
        </span>
      </div>

      <!-- Popup de combo -->
      <transition name="combo">
        <div v-if="comboPopup >= 2" class="combo-popup">
          <span class="combo-popup__txt">COMBO</span>
          <span class="combo-popup__mult">x{{ comboPopup }}</span>
        </div>
      </transition>

      <div v-if="armedBooster" class="board__hint">Touchez une tuile pour utiliser {{ BOOSTERS[armedBooster].label }}</div>
    </div>

    <!-- Boosters -->
    <div class="boosters">
      <button
        v-for="b in boosterList"
        :key="b.key"
        class="booster"
        :class="{ 'booster--armed': armedBooster === b.key, 'booster--empty': b.count <= 0 }"
        :disabled="b.count <= 0 || !active"
        :title="b.desc"
        @click="armBooster(b.key)"
      >
        <span class="booster__emoji">{{ b.emoji }}</span>
        <span class="booster__count">{{ b.count }}</span>
        <span class="booster__label">{{ b.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.gamewrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.board {
  position: relative;
  width: 100%;
  max-width: 560px;
  aspect-ratio: 1;
  border-radius: 22px;
  background: linear-gradient(160deg, #1f8fd4, #1666a8);
  padding: 8px;
  box-shadow: inset 0 4px 16px rgba(0, 0, 0, 0.28), var(--shadow-lg);
  touch-action: none;
  user-select: none;
  overflow: hidden;
}
.board--armed {
  box-shadow: inset 0 0 0 4px var(--sun), inset 0 4px 16px rgba(0, 0, 0, 0.28), var(--shadow-lg);
}
.tile {
  position: absolute;
  top: 8px;
  left: 8px;
  width: calc((100% - 16px) / 8);
  height: calc((100% - 16px) / 8);
  padding: 3px;
  transition: transform 0.24s cubic-bezier(0.34, 1.3, 0.7, 1);
  will-change: transform;
  cursor: pointer;
}
.tile__face {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  font-size: clamp(1.1rem, 5.4vw, 2rem);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.12), inset 0 3px 0 rgba(255, 255, 255, 0.45), 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  animation: pop-in 0.25s ease backwards;
}
.tile--selected .tile__face {
  transform: scale(1.12);
  box-shadow: 0 0 0 4px #fff, 0 0 18px rgba(255, 255, 255, 0.9);
  z-index: 3;
}
.tile--clearing .tile__face {
  animation: burst 0.24s ease forwards;
}
@keyframes burst {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.28) rotate(8deg);
    filter: brightness(1.6);
  }
  100% {
    transform: scale(0);
    filter: brightness(2.2);
    opacity: 0;
  }
}

.board__hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 6px 14px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.82rem;
  pointer-events: none;
  white-space: nowrap;
}

/* Popup combo */
.combo-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  z-index: 5;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
}
.combo-popup__txt {
  font-size: clamp(1.6rem, 7vw, 2.6rem);
  font-weight: 900;
  color: #fff;
  -webkit-text-stroke: 3px var(--coral);
  paint-order: stroke fill;
  letter-spacing: 2px;
}
.combo-popup__mult {
  font-size: clamp(2.6rem, 12vw, 4.6rem);
  font-weight: 900;
  color: var(--sun);
  -webkit-text-stroke: 4px #d8850a;
  paint-order: stroke fill;
  line-height: 0.9;
}
.combo-enter-active {
  animation: combo-in 0.35s cubic-bezier(0.2, 1.5, 0.4, 1);
}
.combo-leave-active {
  animation: combo-out 0.3s ease forwards;
}
@keyframes combo-in {
  from {
    transform: translate(-50%, -50%) scale(0.2) rotate(-12deg);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1) rotate(0);
    opacity: 1;
  }
}
@keyframes combo-out {
  to {
    transform: translate(-50%, -140%) scale(1.1);
    opacity: 0;
  }
}

/* Boosters */
.boosters {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.booster {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 82px;
  padding: 10px 6px 8px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fff, #f3f6fc);
  box-shadow: var(--shadow);
  transition: transform 0.1s, box-shadow 0.15s;
}
.booster:hover:not(:disabled) {
  transform: translateY(-2px);
}
.booster--armed {
  box-shadow: 0 0 0 3px var(--sun), var(--shadow);
  background: linear-gradient(180deg, #fff8e5, #ffeebf);
}
.booster--empty {
  opacity: 0.45;
}
.booster__emoji {
  font-size: 1.7rem;
}
.booster__count {
  position: absolute;
  top: -6px;
  right: -4px;
  background: var(--coral);
  color: #fff;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 0.8rem;
  border: 2px solid #fff;
}
.booster__label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--ink-soft);
}
</style>
