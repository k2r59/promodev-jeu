// Moteur Match-3 pur (sans dépendance à Vue). Une grille est un tableau 2D
// de cellules { id, type } où type est l'index dans TILES (ou null = vide).
//
// La grille n'est plus forcément carrée : en portrait (mobile/tablette) le
// plateau est plus haut que large. Aucune fonction ne connaît donc de taille
// fixe — toutes lisent les dimensions de la grille qu'on leur passe. C'est ce
// qui évite un état global à synchroniser entre le moteur et l'affichage.

import { TILES } from './gameData.js'

// Format paysage/desktop. Le portrait (7x9 = 63 cases) tient dans le même ordre
// de grandeur : les scores restent comparables d'un appareil à l'autre, ce qui
// compte puisqu'il n'y a qu'un seul classement.
export const COLS = 8
export const ROWS = 8
export const TYPE_COUNT = TILES.length

const rowsOf = (grid) => grid.length
const colsOf = (grid) => grid[0].length

let _idSeq = 1
function nextId() {
  return _idSeq++
}

export function randType() {
  return Math.floor(Math.random() * TYPE_COUNT)
}

function cell(type) {
  return { id: nextId(), type }
}

// Crée une grille sans aucun alignement de départ, et garantissant qu'un coup existe.
export function createGrid(cols = COLS, rows = ROWS) {
  let grid
  do {
    grid = []
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < cols; c++) {
        let t
        do {
          t = randType()
        } while (
          (c >= 2 && row[c - 1].type === t && row[c - 2].type === t) ||
          (r >= 2 && grid[r - 1][c].type === t && grid[r - 2][c].type === t)
        )
        row.push(cell(t))
      }
      grid.push(row)
    }
  } while (findMatches(grid).size === 0 ? !hasAnyMove(grid) : true)
  return grid
}

export function inBounds(grid, r, c) {
  return r >= 0 && r < rowsOf(grid) && c >= 0 && c < colsOf(grid)
}

export function areAdjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1
}

export function swap(grid, a, b) {
  const tmp = grid[a.r][a.c]
  grid[a.r][a.c] = grid[b.r][b.c]
  grid[b.r][b.c] = tmp
}

// Renvoie un Set de clés "r,c" faisant partie d'un alignement >= 3.
export function findMatches(grid) {
  const matched = new Set()
  const rows = rowsOf(grid)
  const cols = colsOf(grid)

  // Horizontal
  for (let r = 0; r < rows; r++) {
    let run = 1
    for (let c = 1; c <= cols; c++) {
      const same =
        c < cols &&
        grid[r][c] &&
        grid[r][c - 1] &&
        grid[r][c].type !== null &&
        grid[r][c].type === grid[r][c - 1].type
      if (same) {
        run++
      } else {
        if (run >= 3) {
          for (let k = c - run; k < c; k++) matched.add(`${r},${k}`)
        }
        run = 1
      }
    }
  }
  // Vertical
  for (let c = 0; c < cols; c++) {
    let run = 1
    for (let r = 1; r <= rows; r++) {
      const same =
        r < rows &&
        grid[r] &&
        grid[r][c] &&
        grid[r - 1][c] &&
        grid[r][c].type !== null &&
        grid[r][c].type === grid[r - 1][c].type
      if (same) {
        run++
      } else {
        if (run >= 3) {
          for (let k = r - run; k < r; k++) matched.add(`${k},${c}`)
        }
        run = 1
      }
    }
  }
  return matched
}

// Un échange (a,b) produit-il un alignement ? (sans muter durablement)
export function swapMakesMatch(grid, a, b) {
  swap(grid, a, b)
  const ok = findMatches(grid).size > 0
  swap(grid, a, b)
  return ok
}

// Premier coup gagnant trouvé, sous la forme { a, b }, ou null s'il n'y en a
// aucun. Sert à deux choses : détecter un plateau bloqué, et proposer un indice.
export function findAnyMove(grid) {
  const rows = rowsOf(grid)
  const cols = colsOf(grid)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1 && swapMakesMatch(grid, { r, c }, { r, c: c + 1 }))
        return { a: { r, c }, b: { r, c: c + 1 } }
      if (r < rows - 1 && swapMakesMatch(grid, { r, c }, { r: r + 1, c }))
        return { a: { r, c }, b: { r: r + 1, c } }
    }
  }
  return null
}

// Existe-t-il au moins un coup gagnant ?
export function hasAnyMove(grid) {
  return findAnyMove(grid) !== null
}

// Marque les cellules comme vides (type = null).
export function clearCells(grid, keys) {
  for (const key of keys) {
    const [r, c] = key.split(',').map(Number)
    if (grid[r] && grid[r][c]) grid[r][c].type = null
  }
}

// Fait tomber les tuiles et recomble le haut avec de nouvelles tuiles.
// Réutilise les objets existants (id stable) pour l'animation ; crée de
// nouveaux ids pour les tuiles neuves.
export function collapse(grid) {
  const rows = rowsOf(grid)
  const cols = colsOf(grid)
  for (let c = 0; c < cols; c++) {
    let write = rows - 1
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][c].type !== null) {
        if (write !== r) {
          grid[write][c] = grid[r][c]
          grid[r][c] = { id: nextId(), type: null }
        }
        write--
      }
    }
    for (let r = write; r >= 0; r--) {
      grid[r][c] = cell(randType())
    }
  }
}

// Zones ciblées par les boosters (renvoie un Set de clés).
export function boosterCells(grid, booster, r, c) {
  const keys = new Set()
  const rows = rowsOf(grid)
  const cols = colsOf(grid)
  if (booster === 'bombe') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (inBounds(grid, r + dr, c + dc)) keys.add(`${r + dr},${c + dc}`)
      }
  } else if (booster === 'eclair') {
    // Toute la ligne et toute la colonne : leurs longueurs diffèrent en portrait.
    for (let cc = 0; cc < cols; cc++) keys.add(`${r},${cc}`)
    for (let rr = 0; rr < rows; rr++) keys.add(`${rr},${c}`)
  } else if (booster === 'vague') {
    const t = grid[r][c].type
    for (let rr = 0; rr < rows; rr++)
      for (let cc = 0; cc < cols; cc++) {
        if (grid[rr][cc].type === t) keys.add(`${rr},${cc}`)
      }
  }
  return keys
}

// Mélange la grille tout en évitant les alignements immédiats.
export function reshuffle(grid) {
  const rows = rowsOf(grid)
  const cols = colsOf(grid)
  const types = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) types.push(grid[r][c].type)
  do {
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[types[i], types[j]] = [types[j], types[i]]
    }
    let idx = 0
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) grid[r][c] = { id: grid[r][c].id, type: types[idx++] }
  } while (findMatches(grid).size > 0 || !hasAnyMove(grid))
}
