// Moteur Match-3 pur (sans dépendance à Vue). Une grille est un tableau 2D
// de cellules { id, type } où type est l'index dans TILES (ou null = vide).

import { TILES } from './gameData.js'

export const SIZE = 8
export const TYPE_COUNT = TILES.length

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
export function createGrid() {
  let grid
  do {
    grid = []
    for (let r = 0; r < SIZE; r++) {
      const row = []
      for (let c = 0; c < SIZE; c++) {
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

export function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
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

  // Horizontal
  for (let r = 0; r < SIZE; r++) {
    let run = 1
    for (let c = 1; c <= SIZE; c++) {
      const same =
        c < SIZE &&
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
  for (let c = 0; c < SIZE; c++) {
    let run = 1
    for (let r = 1; r <= SIZE; r++) {
      const same =
        r < SIZE &&
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

// Existe-t-il au moins un coup gagnant ?
export function hasAnyMove(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c < SIZE - 1 && swapMakesMatch(grid, { r, c }, { r, c: c + 1 })) return true
      if (r < SIZE - 1 && swapMakesMatch(grid, { r, c }, { r: r + 1, c })) return true
    }
  }
  return false
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
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1
    for (let r = SIZE - 1; r >= 0; r--) {
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
  if (booster === 'bombe') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (inBounds(r + dr, c + dc)) keys.add(`${r + dr},${c + dc}`)
      }
  } else if (booster === 'eclair') {
    for (let k = 0; k < SIZE; k++) {
      keys.add(`${r},${k}`)
      keys.add(`${k},${c}`)
    }
  } else if (booster === 'vague') {
    const t = grid[r][c].type
    for (let rr = 0; rr < SIZE; rr++)
      for (let cc = 0; cc < SIZE; cc++) {
        if (grid[rr][cc].type === t) keys.add(`${rr},${cc}`)
      }
  }
  return keys
}

// Mélange la grille tout en évitant les alignements immédiats.
export function reshuffle(grid) {
  const types = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) types.push(grid[r][c].type)
  do {
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[types[i], types[j]] = [types[j], types[i]]
    }
    let idx = 0
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) grid[r][c] = { id: grid[r][c].id, type: types[idx++] }
  } while (findMatches(grid).size > 0 || !hasAnyMove(grid))
}
