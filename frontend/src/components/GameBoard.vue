<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  createGrid,
  findMatches,
  clearCells,
  collapse,
  swap,
  swapMakesMatch,
  areAdjacent,
  hasAnyMove,
  findAnyMove,
  reshuffle,
  boosterCells
} from '../game/engine.js'
import { TILES, BOOSTERS } from '../game/gameData.js'
import { sfx } from '../game/sound.js'
import { haptic } from '../game/haptics.js'
import { createBoardRenderer, loadTileImages } from '../game/boardRenderer.js'

const props = defineProps({
  active: { type: Boolean, default: true }, // input autorisé (partie en cours)
  // Portrait : le plateau se taille sur la place disponible (cf. fitShape).
  // Sinon il reste carré, comme le veut la colonne centrale du hub desktop.
  portrait: { type: Boolean, default: false }
})
const emit = defineEmits(['update', 'combo', 'floating'])

// --- Format du plateau -----------------------------------------------------
// Un plateau carré sur un téléphone, c'est un carré au milieu avec du vide
// au-dessus et en dessous — d'autant plus vide que l'écran est allongé, et les
// ratios vont de 0,39 (Fold) à 0,70 (iPad). On fait donc l'inverse : la largeur
// disponible fixe la taille d'une case, et on empile autant de rangées que la
// hauteur en accepte. Le plateau remplit l'écran quel qu'en soit le ratio.
//
// Le comptage est en JS parce qu'il donne un entier (on ne pose pas 10,4
// rangées) ; le CSS, lui, garde la mise à l'échelle exacte (cf. .board).

// Retrait entre le bord du plateau et la surface de jeu, en px.
const BOARD_PAD = 8

const SQUARE = { cols: 8, rows: 8 }
const ROWS_MIN = 8
// Plafond de forme, pas de place : au-delà de 12 rangées pour 6 ou 7 colonnes,
// le plateau devient une tour et les cascades n'en finissent plus. Les écrans
// les plus allongés (Galaxy Fold, r=0,39) gardent donc un peu d'air.
const ROWS_MAX = 12

// La largeur d'une case, c'est la largeur du plateau divisée par les colonnes :
// c'est donc `colsFor` qui décide du confort au pouce. On vise ~55px, en
// n'oubliant pas le bas du tableau (téléphones étroits, où 7 colonnes
// donneraient des cases de 45px) ni le haut (tablettes).
function colsFor(w) {
  if (w < 360) return 6
  if (w < 480) return 7
  if (w < 720) return 8
  return 9
}

const fitEl = ref(null)
const shape = ref({ ...SQUARE })
let ro = null

function fitShape() {
  if (!props.portrait) {
    shape.value = { ...SQUARE }
    return
  }
  const el = fitEl.value
  if (!el) return
  const w = el.clientWidth
  const h = el.clientHeight
  if (!w || !h) return
  const cols = colsFor(w)
  const rows = Math.max(ROWS_MIN, Math.min(ROWS_MAX, Math.round(h / (w / cols))))
  if (shape.value.cols === cols && shape.value.rows === rows) return
  shape.value = { cols, rows }
}

watch(() => props.portrait, fitShape)

const grid = ref(createGrid(SQUARE.cols, SQUARE.rows))
const clearing = reactive(new Set()) // clés "r,c" en cours de destruction
const selected = ref(null) // { r, c }
const busy = ref(false) // résolution en cours
const armedBooster = ref(null) // booster prêt à être placé

// Inventaire de départ (comme le mockup : 3 / 2 / 1)
const inventory = reactive({ bombe: 3, eclair: 2, vague: 1 })

const stats = reactive({ score: 0, maxCombo: 0, boostersUsed: 0, matches: 0 })
const comboPopup = ref(0)

// Changer de format (rotation, redimensionnement de la fenêtre) rebat les
// cartes : on repart d'une grille au bon format plutôt que de redécouper
// l'ancienne. Jamais en pleine partie — on ne vole pas son plateau au joueur ;
// la grille en cours garde alors son format, et le plateau se remet simplement
// à l'échelle.
watch(shape, ({ cols, rows }) => {
  if (props.active) return
  if (grid.value.length === rows && grid.value[0].length === cols) return
  grid.value = createGrid(cols, rows)
  clearing.clear()
  selected.value = null
  armedBooster.value = null
})

const tiles = computed(() => {
  const out = []
  const g = grid.value
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      const cell = g[r][c]
      if (cell && cell.type !== null) out.push({ id: cell.id, type: cell.type, r, c })
    }
  }
  return out
})

function emitUpdate() {
  emit('update', { ...stats })
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms))

// --- Indice après inactivité ---
// Au bout de HINT_DELAY sans rien toucher, on met en surbrillance une tuile
// jouable. Toute interaction relance le compte à rebours.
const HINT_DELAY = 10000
// On surligne les DEUX tuiles de l'échange. N'en montrer qu'une laissait le
// joueur deviner avec quoi l'échanger — le coup était bon mais illisible.
const hint = ref(null) // { a: {r,c}, b: {r,c} }
let hintTimer = null

function armHint() {
  clearTimeout(hintTimer)
  hint.value = null
  if (!props.active) return
  hintTimer = setTimeout(() => {
    // Rien à suggérer pendant une cascade : le plateau bouge encore.
    if (!canPlay.value) return armHint()
    hint.value = findAnyMove(grid.value)
  }, HINT_DELAY)
}

// L'indice n'a de sens que manette en main : on l'arme et le désarme avec la
// partie. `immediate` est nécessaire : sans lui, un montage alors que la partie
// tourne déjà (aucun changement de `active`) n'armerait jamais rien.
watch(
  () => props.active,
  (on) => (on ? armHint() : (clearTimeout(hintTimer), (hint.value = null))),
  { immediate: true }
)
onUnmounted(() => clearTimeout(hintTimer))

// --- Interaction -----------------------------------------------------------
// Le doigt tire vraiment la tuile : elle et sa voisine glissent en miroir tant
// qu'on n'a pas lâché, et se reposent si on renonce. C'est ce qui fait le
// toucher des match-3 du commerce, et ce qui manquait — l'ancien geste partait
// à l'aveugle, sans rien montrer avant le résultat.
//
// Le pointage vise des pixels et le canvas convertit en case : il n'y a plus
// une seule tuile dans le DOM à qui accrocher un écouteur.
const canvasEl = ref(null)
let drag = null // { a, dir: 'x'|'y'|null, b, x0, y0 }

// Au-delà de ce déplacement, le geste est un glissé et plus un tap.
const DRAG_MIN = 6
// Part de la case à franchir pour que le coup parte au relâchement. En dessous,
// on considère que le joueur a hésité et on repose les tuiles.
const DRAG_COMMIT = 0.45

const canPlay = computed(() => props.active && !busy.value)

function cellAt(e) {
  return rd ? rd.cellAt(e.clientX, e.clientY) : null
}

function onPointerDown(e) {
  if (!canPlay.value) return
  const cell = cellAt(e)
  if (!cell) return
  armHint() // le joueur agit : on repart de zéro
  drag = { a: cell, dir: null, b: null, x0: e.clientX, y0: e.clientY }
  canvasEl.value?.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e) {
  if (!drag || !canPlay.value || armedBooster.value) return
  const dx = e.clientX - drag.x0
  const dy = e.clientY - drag.y0
  if (!drag.dir) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_MIN) return
    // L'axe se fige au premier engagement : sans ça, un geste en diagonale ferait
    // sauter la tuile d'une voisine à l'autre.
    drag.dir = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    selected.value = null
  }
  const { w, h } = rd.cellSize
  const b =
    drag.dir === 'x'
      ? { r: drag.a.r, c: drag.a.c + (dx > 0 ? 1 : -1) }
      : { r: drag.a.r + (dy > 0 ? 1 : -1), c: drag.a.c }
  // Tirer vers le vide hors plateau ne doit rien déclencher.
  if (b.r < 0 || b.r >= gridRows.value || b.c < 0 || b.c >= gridCols.value) {
    rd.snapBack(performance.now())
    drag.b = null
    tick()
    return
  }
  drag.b = b
  const t = Math.min(1, drag.dir === 'x' ? Math.abs(dx) / w : Math.abs(dy) / h)
  rd.setDrag(drag.a, b, t)
  drag.t = t
  tick()
}

function onPointerUp(e) {
  const d = drag
  drag = null
  if (!canPlay.value) return

  if (armedBooster.value) {
    const cell = cellAt(e)
    rd?.clearDrag()
    if (cell) applyBooster(cell.r, cell.c)
    return
  }
  if (!d) return

  // Glissé assez franc : on joue le coup.
  if (d.dir && d.b && d.t >= DRAG_COMMIT) {
    rd.clearDrag()
    selected.value = null
    trySwap(d.a, d.b)
    return
  }
  // Glissé esquissé puis abandonné : les tuiles se reposent.
  if (d.dir) {
    rd.snapBack(performance.now())
    tick()
    return
  }

  // Pas de glissé : c'est un tap. On garde la sélection à deux temps, qui reste
  // le geste le plus sûr sur les petites cases.
  const cell = cellAt(e)
  if (!cell) return
  const { r, c } = cell
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

// Le doigt sort de l'écran, un appel arrive… : on repose les tuiles plutôt que
// de laisser le plateau figé en plein geste.
function onPointerCancel() {
  drag = null
  rd?.snapBack(performance.now())
  tick()
}

async function trySwap(a, b) {
  if (!a || !b) return
  const g = grid.value
  if (b.r < 0 || b.r >= g.length || b.c < 0 || b.c >= g[0].length) return
  if (!areAdjacent(a, b)) return

  busy.value = true
  if (swapMakesMatch(g, a, b)) {
    sfx.swap()
    swap(g, a, b)
    grid.value = [...g] // force le re-render
    await delay(180)
    await resolve()
  } else {
    // Échange invalide : petit aller-retour
    sfx.invalid()
    haptic.invalid()
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
    haptic.match(combo)

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

  // Le plateau a changé : l'ancien indice ne vaut plus rien.
  armHint()
}

// --- Boosters ---
function armBooster(key) {
  if (!canPlay.value || inventory[key] <= 0) return
  armedBooster.value = armedBooster.value === key ? null : key
  selected.value = null
  if (armedBooster.value) haptic.tap()
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
  haptic.booster()

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
  grid.value = createGrid(shape.value.cols, shape.value.rows)
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

// Le format pilote le quadrillage, la taille des tuiles et le rectangle du
// plateau : une seule source, passée au CSS. On le lit sur la grille RÉELLE et
// non sur `shape` : en pleine partie la grille garde son ancien format, et
// l'affichage doit suivre la grille, pas l'intention.
const gridCols = computed(() => grid.value[0].length)
const gridRows = computed(() => grid.value.length)
const shapeVars = computed(() => ({
  '--cols': gridCols.value,
  '--rows': gridRows.value,
  '--board-ratio': gridCols.value / gridRows.value,
  '--board-pad': BOARD_PAD + 'px'
}))

// --- Rendu -----------------------------------------------------------------
// Le canvas ne fait que dessiner l'état du moteur : dès que les tuiles, ce qui
// explose, la sélection ou l'indice bougent, on lui pousse la nouvelle scène et
// on relance la boucle. Le moteur, lui, ignore tout du rendu — c'est ce qui a
// permis de remplacer la couche d'affichage sans y toucher d'une ligne.
//
// Ce bloc est en fin de script à dessein : ses `watch` lisent des refs déclarées
// plus haut, et les évaluent dès le setup.
let rd = null
let raf = 0

// La boucle s'arrête dès que plus rien ne bouge, et repart au moindre changement.
// Sur un téléphone, tourner à 60 im/s pour redessiner l'identique pendant les dix
// secondes où le joueur réfléchit, c'est de la batterie jetée.
function boucle(now) {
  raf = 0
  if (!rd) return
  if (rd.frame(now)) raf = requestAnimationFrame(boucle)
}
function tick() {
  if (!raf && rd) raf = requestAnimationFrame(boucle)
}

function pousse() {
  if (!rd) return
  rd.setShape(gridCols.value, gridRows.value)
  rd.sync(tiles.value, clearing, performance.now())
  tick()
}

// `clearing` est un Set réactif : Vue suit .add/.delete, donc `clearing.size`
// suffit à déclencher chaque phase d'explosion.
watch([tiles, () => clearing.size], pousse)
watch(selected, (v) => {
  rd?.setSelected(v)
  tick()
})
watch(hint, (v) => {
  rd?.setHint(v)
  tick()
})

function mesure() {
  const cv = canvasEl.value
  if (!cv || !rd) return
  fitShape()
  // Le CSS décide de la taille du plateau ; le canvas s'y conforme, à la densité
  // réelle de l'écran (devicePixelRatio) — sinon tout serait flou sur mobile.
  const box = cv.getBoundingClientRect()
  rd.setSize(box.width, box.height, window.devicePixelRatio || 1)
  pousse()
}

onMounted(async () => {
  emitUpdate()
  // Les illustrations doivent être décodées avant le premier dessin : un canvas
  // ne sait pas afficher une image qui n'est pas encore arrivée.
  const images = await loadTileImages(TILES)
  if (!canvasEl.value) return // démonté pendant le chargement
  rd = createBoardRenderer(canvasEl.value, images)
  mesure()
  // Mesurer .board-fit ne peut pas boucler : `container-type: size` le rend
  // indépendant de son contenu, donc changer le plateau ne le redimensionne pas.
  ro = new ResizeObserver(mesure)
  ro.observe(fitEl.value)
  ro.observe(canvasEl.value)
})
onUnmounted(() => {
  ro?.disconnect()
  if (raf) cancelAnimationFrame(raf)
  rd = null
})
</script>

<template>
  <div class="gamewrap" :style="shapeVars">
    <!-- Boîte de mesure : c'est elle qui donne au plateau la place disponible.
         `container-type: size` permet au plateau de se calculer en CSS pur
         (cf. .board), sans mesure JS ni dépendance circulaire. -->
    <div ref="fitEl" class="board-fit">
      <div class="board" :class="{ 'board--armed': armedBooster }">
        <!-- Une seule surface : quadrillage, tuiles et animations y sont
             dessinées (cf. game/boardRenderer.js). Le fond, le rayon et l'ombre
             du plateau restent au CSS — le canvas n'a rien à y gagner. -->
        <canvas
          ref="canvasEl"
          class="board__canvas"
          role="img"
          :aria-label="`Plateau de jeu, ${gridCols} colonnes sur ${gridRows} rangées`"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        ></canvas>

        <!-- Popup de combo -->
        <transition name="combo">
          <div v-if="comboPopup >= 2" class="combo-popup">
            <span class="combo-popup__txt">COMBO</span>
            <span class="combo-popup__mult">x{{ comboPopup }}</span>
          </div>
        </transition>

        <div v-if="armedBooster" class="board__hint">Touchez une tuile pour utiliser {{ BOOSTERS[armedBooster].label }}</div>
      </div>
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
  height: 100%;
  min-height: 0;
  width: 100%;
}

/* DÉFAUT — la page défile : personne n'impose de hauteur au plateau, il se cale
   donc sur la largeur et en déduit sa hauteur. Surtout pas de `container-type`
   ici : la hauteur de .board-fit vaudrait 0, et un plateau calculé sur `100cqh`
   avec ça tombe à 1px (constaté à 16px de large sur une fenêtre 900x800). */
.board-fit {
  width: 100%;
  display: grid;
  place-items: center;
}
/* `content-box` est essentiel : `aspect-ratio` s'applique à la boîte désignée par
   box-sizing, et la surface de jeu, elle, vit dans la boîte de CONTENU. Avec le
   border-box par défaut, le ratio était juste au bord du plateau mais faux à
   l'intérieur — retirer 16px sur les deux axes d'un rectangle 0,50 n'en laisse
   pas un. Les cases sortaient à 52,0x53,3 sur un Galaxy Fold. Ici c'est le
   contenu qui vaut exactement colonnes/rangées, donc des cases carrées au pixel.
   Les largeurs retranchent donc le retrait, puisqu'il s'ajoute par-dessus. */
.board {
  position: relative;
  box-sizing: content-box;
  width: calc(100% - var(--board-pad) * 2);
  /* Borné par la fenêtre : sans ça, sur un 1024x768 le plateau prenait toute la
     largeur de la colonne, soit 986px de haut — il aurait fallu défiler pour
     voir le bas de son propre plateau. */
  max-width: min(100% - var(--board-pad) * 2, 62vh);
  aspect-ratio: var(--cols) / var(--rows);
  border-radius: 22px;
  background: linear-gradient(160deg, #1f8fd4, #1666a8);
  padding: var(--board-pad);
  box-shadow: inset 0 4px 16px rgba(0, 0, 0, 0.28), var(--shadow-lg);
  touch-action: none;
  user-select: none;
  overflow: hidden;
  cursor: pointer;
}
/* Les DEUX seuls cas où le shell cadre l'app sur la fenêtre (écran de jeu
   portrait, hub desktop) : là, et seulement là, .board-fit a une hauteur propre.
   Le plateau prend alors la plus grande taille qui y tienne — borné par la
   largeur sur un téléphone allongé, par la hauteur sur un écran trapu — sans
   jamais déborder, quel que soit le ratio.
   C'est ce que `height:100%` + `max-width` ne sait PAS faire (mesuré : 465px de
   large dans une boîte de 300) ; les unités de conteneur, si. Ces deux requêtes
   doivent rester alignées sur celles du shell (App.vue, styles.css). */
@media (orientation: portrait) and (max-width: 1100px),
  (orientation: landscape) and (min-width: 1100px) and (min-height: 620px) {
  .board-fit {
    flex: 1;
    min-height: 0;
    container-type: size;
  }
  /* Le retrait est déduit des DEUX bornes : en content-box il s'ajoute autour du
     contenu, donc c'est bien la surface de jeu qu'on cale dans la place libre. */
  .board {
    width: min(100cqw - var(--board-pad) * 2, (100cqh - var(--board-pad) * 2) * var(--board-ratio));
    /* Le repli en vh n'a plus lieu d'être : .board-fit borne déjà, et sur une
       tablette il rognerait le plateau (804px voulus, 731 accordés). */
    max-width: none;
  }
}

.board--armed {
  box-shadow: inset 0 0 0 4px var(--sun), inset 0 4px 16px rgba(0, 0, 0, 0.28), var(--shadow-lg);
}
/* La surface de jeu. Quadrillage, tuiles, explosions, indice, sélection et geste
   sont tous dessinés dedans : le CSS qui les portait (une centaine de lignes de
   .tile, @keyframes burst, hint-pulse…) vit désormais dans boardRenderer.js, aux
   mêmes durées et aux mêmes courbes. Sa taille en pixels est fixée en JS d'après
   celle-ci, à la densité de l'écran. */
.board__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
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
/* Dimensionné sur le plateau (cqw) et non sur la fenêtre : un COMBO x5 garde la
   même allure sur un plateau de 350px que sur celui, énorme, d'une tablette. */
.combo-popup__txt {
  font-size: clamp(1.4rem, 11cqw, 2.6rem);
  font-weight: 900;
  color: #fff;
  -webkit-text-stroke: 3px var(--coral);
  paint-order: stroke fill;
  letter-spacing: 2px;
}
.combo-popup__mult {
  font-size: clamp(2.4rem, 19cqw, 4.6rem);
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
/* Hauteur fixe (--boosters-h) : voir la note sur --hud-h dans styles.css. */
.boosters {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: stretch;
  height: var(--boosters-h);
  flex-shrink: 0;
}
/* Libellé à droite de l'icône plutôt qu'en dessous : la rangée est deux fois
   moins haute, et toute la hauteur reprise ici va au plateau. */
.booster {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 11px;
  border-radius: 14px;
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
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--ink-soft);
  white-space: nowrap;
}

/* Écran de jeu portrait : les boosters deviennent un dock, cibles au pouce.
   Le libellé passe sous l'icône — la rangée est plus haute mais chaque bouton
   est bien plus large, donc plus facile à viser. */
@media (orientation: portrait) and (max-width: 1100px) {
  /* Le HUD est à fleur d'écran (il est plein cadre) ; le plateau, lui, garde
     une marge — c'est aussi la zone de rejet des gestes de bord du système. */
  .gamewrap {
    gap: 8px;
    padding: 0 8px 8px;
  }
  .boosters {
    width: 100%;
    gap: 8px;
  }
  .booster {
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
    padding: 4px 6px;
    border-radius: 16px;
  }
  .booster:hover:not(:disabled) {
    transform: none;
  }
  .booster:active:not(:disabled) {
    transform: scale(0.94);
  }
  .booster__emoji {
    font-size: 1.5rem;
    line-height: 1.1;
  }
  .booster__label {
    font-size: 0.62rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .booster__count {
    top: -5px;
    right: 6px;
  }
}
</style>
