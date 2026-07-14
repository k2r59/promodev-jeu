// Rendu du plateau sur canvas. Aucune dépendance à Vue : le composant lui pousse
// l'état du moteur (les tuiles, ce qui explose, ce qui est sélectionné), le
// moteur reste seul maître du jeu, et ce fichier ne fait que dessiner.
//
// Il remplace ~84 <div> animés par CSS. Le DOM s'en sortait — les tuiles étaient
// déjà composées par le GPU — mais chaque cascade y détruisait et recréait des
// nœuds, et le navigateur devait recalculer le style de tout le plateau à chaque
// image. Ici, une seule surface, un seul dessin.
//
// Le contrat visuel est de rejouer À L'IDENTIQUE ce que faisait le CSS : mêmes
// durées, mêmes courbes, mêmes tailles. Les valeurs ci-dessous sont donc reprises
// telles quelles de l'ancienne feuille de style — d'où les commentaires qui la
// citent. Une seule chose change, en mieux : les tuiles neuves tombent du haut au
// lieu d'apparaître sur place (l'ancien `animation: pop-in` sur un nœud neuf).

// --- Courbes ---------------------------------------------------------------
// Résolution d'une cubic-bezier CSS par Newton-Raphson : c'est ce qui permet de
// rejouer exactement `cubic-bezier(.34,1.3,.7,1)`, dépassement compris.
function cubicBezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a
  const B = (a, b) => 3 * b - 6 * a
  const C = (a) => 3 * a
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a)
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 6; i++) {
      const s = slope(t, x1, x2)
      if (Math.abs(s) < 1e-6) break
      t -= (calc(t, x1, x2) - x) / s
    }
    return calc(t, y1, y2)
  }
}

// .tile { transition: transform .24s cubic-bezier(.34,1.3,.7,1) }
const EASE_MOVE = cubicBezier(0.34, 1.3, 0.7, 1)
// Le `ease` du CSS, pour pop-in et burst.
const EASE = cubicBezier(0.25, 0.1, 0.25, 1)

const DUR_MOVE = 240
const DUR_BURST = 240
const DUR_SNAP = 170 // retour en place quand le geste ne vaut pas un coup
const HINT_PERIOD = 1100 // hint-pulse: 1.1s
const DRAG_LIFT = 1.08 // la tuile tirée se soulève légèrement, comme sous le doigt

// Géométrie, reprise du CSS : .tile { padding: 3px } puis .tile__img { 92% }.
const TILE_PAD = 3
const IMG_RATIO = 0.92
const FACE_RADIUS = 14 // .tile__face
const CELL_MARGIN = 1.5 // .board__cell { margin: 1.5px }
const CELL_RADIUS = 9 // .board__cell
const CELL_FILL = 'rgba(255,255,255,0.085)'
// Marge autour du sprite pour loger l'ombre portée sans la rogner.
const SHADOW_PAD = 10

export function loadTileImages(tiles) {
  return Promise.all(
    tiles.map(
      (t) =>
        new Promise((resolve) => {
          const img = new Image()
          // Une image manquante ne doit pas figer le plateau : on rend `null` et
          // le dessin la saute. Mieux vaut un trou qu'un jeu bloqué.
          img.onload = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = t.img
        })
    )
  )
}

export function createBoardRenderer(canvas, images) {
  const ctx = canvas.getContext('2d')
  const sprites = new Map() // id -> état visuel de la tuile
  let cols = 8
  let rows = 8
  let cssW = 0
  let cssH = 0
  let cellW = 0
  let cellH = 0
  let dpr = 1
  let gridLayer = null // quadrillage pré-dessiné (statique)
  let cache = null // { cell, tiles: [canvas], flash: [canvas] }
  let selected = null
  let hint = null
  let drag = null // { a, b, t: 0..1, relachee: timestamp|0, t0 }
  let dirty = true
  let reduced = false

  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    // matchMedia indisponible : on garde les animations
  }

  const key = (r, c) => `${r},${c}`

  function roundRect(c2, x, y, w, h, r) {
    // roundRect natif là où il existe (tous les navigateurs à jour), repli sinon.
    if (c2.roundRect) {
      c2.beginPath()
      c2.roundRect(x, y, w, h, r)
      return
    }
    const rr = Math.min(r, w / 2, h / 2)
    c2.beginPath()
    c2.moveTo(x + rr, y)
    c2.arcTo(x + w, y, x + w, y + h, rr)
    c2.arcTo(x + w, y + h, x, y + h, rr)
    c2.arcTo(x, y + h, x, y, rr)
    c2.arcTo(x, y, x + w, y, rr)
    c2.closePath()
  }

  // Pré-rend chaque tuile (image + ombre) et sa silhouette blanche, à la taille
  // exacte de la case. Sans ça il faudrait activer l'ombre du contexte à chaque
  // tuile et à chaque image — c'est le poste le plus coûteux du canvas 2D.
  function buildCache() {
    const boxW = Math.max(1, (cellW - TILE_PAD * 2) * IMG_RATIO)
    const boxH = Math.max(1, (cellH - TILE_PAD * 2) * IMG_RATIO)
    const cw = Math.ceil((boxW + SHADOW_PAD * 2) * dpr)
    const ch = Math.ceil((boxH + SHADOW_PAD * 2) * dpr)

    const tiles = []
    const flash = []
    for (const img of images) {
      const c1 = document.createElement('canvas')
      c1.width = cw
      c1.height = ch
      const g = c1.getContext('2d')
      g.scale(dpr, dpr)
      if (img) {
        // object-fit: contain — l'illustration garde ses proportions dans la case.
        const s = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight)
        const w = img.naturalWidth * s
        const h = img.naturalHeight * s
        const x = SHADOW_PAD + (boxW - w) / 2
        const y = SHADOW_PAD + (boxH - h) / 2
        // .tile__img { filter: drop-shadow(0 3px 4px rgba(0,0,0,.32)) }
        g.shadowColor = 'rgba(0,0,0,0.32)'
        g.shadowBlur = 4
        g.shadowOffsetY = 3
        g.drawImage(img, x, y, w, h)
      }
      tiles.push(c1)

      // Silhouette blanche : sert le flash de l'explosion (le `brightness()` de
      // l'ancienne animation, qu'un canvas 2D ne sait pas faire à moindre coût).
      const c2 = document.createElement('canvas')
      c2.width = cw
      c2.height = ch
      const g2 = c2.getContext('2d')
      g2.scale(dpr, dpr)
      if (img) {
        const s = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight)
        const w = img.naturalWidth * s
        const h = img.naturalHeight * s
        g2.drawImage(img, SHADOW_PAD + (boxW - w) / 2, SHADOW_PAD + (boxH - h) / 2, w, h)
        g2.globalCompositeOperation = 'source-in'
        g2.fillStyle = '#fff'
        g2.fillRect(0, 0, c2.width, c2.height)
      }
      flash.push(c2)
    }
    cache = { tiles, flash, w: boxW + SHADOW_PAD * 2, h: boxH + SHADOW_PAD * 2 }
  }

  function buildGrid() {
    const c1 = document.createElement('canvas')
    c1.width = Math.max(1, Math.ceil(cssW * dpr))
    c1.height = Math.max(1, Math.ceil(cssH * dpr))
    const g = c1.getContext('2d')
    g.scale(dpr, dpr)
    g.fillStyle = CELL_FILL
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        roundRect(g, c * cellW + CELL_MARGIN, r * cellH + CELL_MARGIN, cellW - CELL_MARGIN * 2, cellH - CELL_MARGIN * 2, CELL_RADIUS)
        g.fill()
      }
    }
    gridLayer = c1
  }

  // On ne fixe QUE la taille du bitmap. Surtout pas canvas.style.width/height :
  // c'est le CSS qui dimensionne le canvas (100% du plateau), et un style inline
  // le figerait — il l'avait gelé à 358x358, la taille du plateau carré mesurée
  // au premier passage, et le portrait 374x641 n'arrivait plus jamais à le
  // reprendre (l'inline gagne toujours contre `width: 100%`).
  function setSize(w, h, ratio) {
    const nw = Math.max(1, Math.round(w))
    const nh = Math.max(1, Math.round(h))
    const nd = Math.min(ratio || 1, 3) // au-delà de 3x on paie des pixels que personne ne voit
    if (nw === cssW && nh === cssH && nd === dpr) return
    cssW = nw
    cssH = nh
    dpr = nd
    canvas.width = Math.ceil(cssW * dpr)
    canvas.height = Math.ceil(cssH * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    recompute()
  }

  function setShape(c, r) {
    if (c === cols && r === rows) return
    cols = c
    rows = r
    recompute()
  }

  function recompute() {
    if (!cssW || !cssH) return
    cellW = cssW / cols
    cellH = cssH / rows
    buildGrid()
    buildCache()
    dirty = true
  }

  // Synchronise les sprites sur l'état du moteur. C'est ici que naissent les
  // animations : une tuile dont la case cible change part en interpolation
  // depuis là où elle se trouve réellement — y compris en plein vol.
  function sync(tiles, clearing, now) {
    const vus = new Set()
    const neuves = []

    for (const t of tiles) {
      vus.add(t.id)
      let s = sprites.get(t.id)
      if (!s) {
        s = { id: t.id, type: t.type, r: t.r, c: t.c, x: t.c, y: t.r, fromX: t.c, fromY: t.r, t0: now, dur: 0, born: now, burstAt: 0 }
        sprites.set(t.id, s)
        neuves.push(s)
      } else if (s.r !== t.r || s.c !== t.c) {
        s.fromX = s.x
        s.fromY = s.y
        s.r = t.r
        s.c = t.c
        s.t0 = now
        s.dur = reduced ? 0 : DUR_MOVE
      }
      s.type = t.type
      if (clearing.has(key(t.r, t.c))) {
        if (!s.burstAt) s.burstAt = now
      } else {
        s.burstAt = 0
      }
    }

    // Les tuiles neuves tombent du haut, en bloc : dans une colonne où k tuiles
    // ont été recréées, elles démarrent de -k à -1 et parcourent donc toutes la
    // même distance. Les faire toutes venir de très haut leur donnerait des
    // vitesses différentes, et le plateau paraîtrait désordonné.
    if (neuves.length) {
      const parColonne = new Map()
      for (const s of neuves) {
        if (!parColonne.has(s.c)) parColonne.set(s.c, [])
        parColonne.get(s.c).push(s)
      }
      for (const [, liste] of parColonne) {
        const k = liste.length
        liste.sort((a, b) => a.r - b.r)
        for (const s of liste) {
          s.fromY = s.r - k
          s.fromX = s.c
          s.y = s.fromY
          s.x = s.c
          s.t0 = now
          s.dur = reduced ? 0 : DUR_MOVE
        }
      }
    }

    for (const id of sprites.keys()) if (!vus.has(id)) sprites.delete(id)
    dirty = true
  }

  const setSelected = (v) => {
    selected = v
    dirty = true
  }
  const setHint = (v) => {
    hint = v
    dirty = true
  }

  // --- Geste ---------------------------------------------------------------
  // Pendant que le doigt tire, les deux tuiles glissent l'une vers l'autre en
  // miroir : on voit le coup AVANT de le valider. C'est ce retour-là qui
  // manquait — l'ancien swipe partait à l'aveugle et ne montrait rien.
  const setDrag = (a, b, t) => {
    drag = { a, b, t: Math.max(0, Math.min(1, t)), relachee: 0, t0: 0 }
    dirty = true
  }
  // Le geste n'a pas abouti : les tuiles reviennent se poser, elles ne sautent pas.
  const snapBack = (now) => {
    if (!drag || drag.relachee) return
    if (reduced || drag.t === 0) {
      drag = null
    } else {
      drag.relachee = now
      drag.t0 = drag.t
    }
    dirty = true
  }
  const clearDrag = () => {
    drag = null
    dirty = true
  }
  // Décalage du sprite dû au geste, en cases.
  function dragOffset(s) {
    if (!drag) return null
    const { a, b, t } = drag
    if (s.r === a.r && s.c === a.c) return { dx: (b.c - a.c) * t, dy: (b.r - a.r) * t, tire: true }
    if (s.r === b.r && s.c === b.c) return { dx: (a.c - b.c) * t, dy: (a.r - b.r) * t, tire: false }
    return null
  }

  // Anneau lumineux : rejoue `box-shadow: 0 0 0 Npx couleur, 0 0 Bpx halo`.
  function ring(cx, cy, w, h, radius, width, color, glow, glowBlur) {
    ctx.save()
    ctx.shadowColor = glow
    ctx.shadowBlur = glowBlur
    ctx.strokeStyle = color
    ctx.lineWidth = width
    // Le tracé est décalé d'une demi-épaisseur : `box-shadow` pose son anneau à
    // l'extérieur de la boîte, alors qu'un stroke est centré sur le tracé.
    const o = width / 2
    roundRect(ctx, cx - w / 2 - o, cy - h / 2 - o, w + o * 2, h + o * 2, radius + o)
    ctx.stroke()
    ctx.restore()
  }

  function drawSprite(s, now) {
    const idx = s.type
    if (!cache || !cache.tiles[idx]) return

    // Position : interpolation entre la case de départ et la case cible.
    let x = s.x
    let y = s.y
    if (s.dur > 0) {
      const p = Math.min(1, (now - s.t0) / s.dur)
      const e = EASE_MOVE(p)
      x = s.fromX + (s.c - s.fromX) * e
      y = s.fromY + (s.r - s.fromY) * e
      if (p >= 1) {
        s.dur = 0
        x = s.c
        y = s.r
      }
    } else {
      x = s.c
      y = s.r
    }
    s.x = x
    s.y = y

    let scale = 1
    let rot = 0
    let alpha = 1
    let flash = 0

    if (s.burstAt && !reduced) {
      // @keyframes burst : 0% scale(1) ; 40% scale(1.28) rotate(8deg)
      // brightness(1.6) ; 100% scale(0) brightness(2.2) opacity(0)
      const p = Math.min(1, (now - s.burstAt) / DUR_BURST)
      if (p < 0.4) {
        const k = EASE(p / 0.4)
        scale = 1 + 0.28 * k
        rot = (8 * k * Math.PI) / 180
        flash = 0.3 * k
      } else {
        const k = EASE((p - 0.4) / 0.6)
        scale = 1.28 * (1 - k)
        rot = (8 * Math.PI) / 180
        alpha = 1 - k
        flash = 0.3 + 0.3 * k
      }
    } else if (s.burstAt && reduced) {
      return
    }

    // Le geste déplace la tuile par-dessus son interpolation : le doigt prime
    // toujours sur ce que le moteur était en train de jouer.
    const dg = dragOffset(s)
    if (dg) {
      x += dg.dx
      y += dg.dy
      if (dg.tire) scale *= DRAG_LIFT
    }

    const isSel = selected && selected.r === s.r && selected.c === s.c
    const isHint = hint && ((hint.a.r === s.r && hint.a.c === s.c) || (hint.b.r === s.r && hint.b.c === s.c))

    // .tile--hint : respiration continue. La sélection prime — elle vient après
    // dans la cascade CSS d'origine.
    if (isHint && !isSel && !s.burstAt && !reduced) {
      const ph = ((now % HINT_PERIOD) / HINT_PERIOD) * Math.PI * 2
      scale *= 1 + 0.09 * (0.5 - 0.5 * Math.cos(ph))
    }
    if (isSel && !s.burstAt) scale *= 1.12 // .tile--selected { transform: scale(1.12) }

    const cx = (x + 0.5) * cellW
    const cy = (y + 0.5) * cellH

    // Les anneaux sont sous la tuile, comme un box-shadow l'est sous son contenu.
    const faceW = cellW - TILE_PAD * 2
    const faceH = cellH - TILE_PAD * 2
    if (isSel && !s.burstAt) {
      ring(cx, cy, faceW * scale, faceH * scale, FACE_RADIUS, 4, '#fff', 'rgba(255,255,255,0.9)', 18)
    } else if (isHint && !s.burstAt && !reduced) {
      const ph = ((now % HINT_PERIOD) / HINT_PERIOD) * Math.PI * 2
      const k = 0.5 - 0.5 * Math.cos(ph)
      ctx.save()
      ctx.globalAlpha = k
      ring(cx, cy, faceW * scale, faceH * scale, FACE_RADIUS, 3, '#ffc93c', 'rgba(255,201,60,0.85)', 16)
      ctx.restore()
    } else if (isHint && reduced) {
      ring(cx, cy, faceW, faceH, FACE_RADIUS, 3, '#ffc93c', 'rgba(255,201,60,0.85)', 16)
    }

    const sp = cache.tiles[idx]
    const w = cache.w * scale
    const h = cache.h * scale

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx, cy)
    if (rot) ctx.rotate(rot)
    ctx.drawImage(sp, -w / 2, -h / 2, w, h)
    if (flash > 0) {
      ctx.globalAlpha = alpha * flash
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(cache.flash[idx], -w / 2, -h / 2, w, h)
    }
    ctx.restore()
  }

  // Une image. Renvoie true s'il faut en redemander une autre — c'est ce qui
  // permet à la boucle de s'arrêter quand le plateau est au repos, plutôt que de
  // tourner à 60 im/s dans le vide (et de vider la batterie du téléphone).
  function frame(now) {
    // Retour en place du geste avorté.
    if (drag && drag.relachee) {
      const p = Math.min(1, (now - drag.relachee) / DUR_SNAP)
      drag.t = drag.t0 * (1 - EASE(p))
      if (p >= 1) drag = null
    }

    let anime = false
    for (const s of sprites.values()) {
      if (s.dur > 0 && now - s.t0 < s.dur) anime = true
      if (s.burstAt && now - s.burstAt < DUR_BURST) anime = true
    }
    if (hint && !reduced) anime = true
    if (drag) anime = true
    if (!anime && !dirty) return false

    ctx.clearRect(0, 0, cssW, cssH)
    if (gridLayer) ctx.drawImage(gridLayer, 0, 0, cssW, cssH)

    // Ordre de passage : les tuiles au repos, puis celle qu'on tire (elle est
    // soulevée), puis celles qui explosent — elles grossissent et ne doivent
    // jamais être recouvertes par une voisine.
    const rang = (s) => (s.burstAt ? 2 : dragOffset(s) ? 1 : 0)
    const liste = [...sprites.values()].sort((a, b) => rang(a) - rang(b))
    for (const s of liste) drawSprite(s, now)

    dirty = false
    return anime
  }

  return {
    setSize,
    setShape,
    sync,
    setSelected,
    setHint,
    setDrag,
    snapBack,
    clearDrag,
    frame,
    invalidate: () => (dirty = true),
    get cellSize() {
      return { w: cellW, h: cellH }
    },
    // Conversion pixels -> case : le pointage vise des pixels, comme sur
    // n'importe quel canvas.
    cellAt(clientX, clientY) {
      const box = canvas.getBoundingClientRect()
      if (!box.width || !box.height) return null
      const c = Math.floor(((clientX - box.left) / box.width) * cols)
      const r = Math.floor(((clientY - box.top) / box.height) * rows)
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null
      return { r, c }
    }
  }
}
