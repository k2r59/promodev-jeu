import { Router } from 'express'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'
import * as Sentry from '@sentry/node'
import { Score } from '../models/Score.js'
import { optionalUid } from '../middleware/auth.js'
import { config } from '../config.js'

const router = Router()

// Classement PUBLIC (pas de token) : sans garde, c'était une agrégation complète
// de toute la collection à chaque appel, relançable en boucle par un anonyme.
// La parade tient en trois temps : rate-limit + cache court du top-100 + rang
// perso calculé léger. Rien de tout ça ne se voit à l'usage — voir plus bas.
const leaderboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // très large pour un humain (le classement s'ouvre à la demande) ; borne les rafales
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans un instant.' }
})

function periodStart(period) {
  const now = new Date()
  if (period === 'day') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  }
  if (period === 'week') {
    // Lundi 00:00 UTC de la semaine courante
    const day = (now.getUTCDay() + 6) % 7 // 0 = lundi
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0))
    return monday
  }
  if (period === 'month') {
    // 1er du mois courant, 00:00 UTC
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  }
  return null // global
}

function periodMatch(period) {
  const start = periodStart(period)
  return start ? { createdAt: { $gte: start } } : {}
}

// Meilleur score par joueur sur la période, trié — le cœur du top-N.
async function bestPerUser(period, limit) {
  return Score.aggregate([
    { $match: periodMatch(period) },
    { $sort: { score: -1, createdAt: 1 } },
    {
      $group: {
        _id: '$user',
        pseudo: { $first: '$pseudo' },
        avatar: { $first: '$avatar' },
        score: { $max: '$score' },
        maxCombo: { $max: '$maxCombo' },
        lastPlayed: { $max: '$createdAt' }
      }
    },
    { $sort: { score: -1, lastPlayed: 1 } },
    { $limit: limit }
  ])
}

// Nombre de joueurs distincts sur la période (pour afficher « rang X / total »).
async function distinctPlayers(period) {
  const r = await Score.aggregate([{ $match: periodMatch(period) }, { $group: { _id: '$user' } }, { $count: 'n' }])
  return r[0]?.n || 0
}

// --- Cache du top-100 -------------------------------------------------------
// TTL volontairement COURT : le classement reste temps réel à l'œil (au pire
// 10 s de retard, imperceptible), mais une rafale de requêtes — ou un curl en
// boucle — tape ce cache mémoire au lieu de relancer l'agrégation. Le résultat
// est le MÊME pour tous les spectateurs, donc mutualisable sans rien fausser.
// On garde le top-200 (le maximum servable) et on tranche selon `limit`.
const CACHE_TTL_MS = 10 * 1000
const boardCache = new Map() // period -> { at, board, total }

async function getBoardCached(period) {
  const hit = boardCache.get(period)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit

  const rows = await bestPerUser(period, 200)
  const board = rows.map((r, i) => ({
    rank: i + 1,
    userId: r._id,
    pseudo: r.pseudo,
    avatar: r.avatar,
    score: r.score,
    maxCombo: r.maxCombo,
    finalist: i < 100 && period === 'all'
  }))
  const total = await distinctPlayers(period)
  const entry = { at: Date.now(), board, total }
  boardCache.set(period, entry)
  return entry
}

// Rang d'un joueur, calculé FRAIS et LÉGER (pas de matérialisation de tout le
// classement) : son meilleur score, puis le nombre de joueurs distincts qui
// font mieux. C'est ce qui garde « je viens de scorer, je vois mon vrai rang »
// exact à la seconde, même quand le top-100 vient du cache.
async function playerRank(period, userId) {
  const match = periodMatch(period)
  const mine = await Score.aggregate([
    { $match: { ...match, user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$user', pseudo: { $first: '$pseudo' }, avatar: { $first: '$avatar' }, score: { $max: '$score' } } }
  ])
  if (!mine.length) return null
  const myBest = mine[0].score
  // Joueurs distincts ayant un meilleur score STRICTEMENT supérieur : le $match
  // sur score s'appuie sur l'index composite (createdAt, score), il ne balaie
  // pas toute la collection.
  const above = await Score.aggregate([
    { $match: { ...match, score: { $gt: myBest } } },
    { $group: { _id: '$user' } },
    { $count: 'n' }
  ])
  return { rank: (above[0]?.n || 0) + 1, userId: mine[0]._id, pseudo: mine[0].pseudo, avatar: mine[0].avatar, score: myBest }
}

// GET /api/leaderboard?period=day|week|month|all&limit=100&me=<userId>
router.get('/', leaderboardLimiter, async (req, res) => {
  try {
    const period = ['day', 'week', 'month', 'all'].includes(req.query.period) ? req.query.period : 'week'
    const limit = Math.min(Number(req.query.limit) || 100, 200)

    const { board, total } = await getBoardCached(period)

    // Rang du joueur : calculé UNIQUEMENT pour le joueur authentifié (uid déduit
    // de son jeton), et seulement s'il le demande (?me présent, qui n'est plus
    // qu'un drapeau « je veux mon rang »). On ignore la VALEUR de ?me : sinon un
    // anonyme forcerait l'agrégation de rang — potentiellement coûteuse pour un
    // score bas — en boucle avec des ids au hasard, contournant le cache. Un
    // joueur ne peut donc calculer que SON propre rang.
    let me = null
    const uid = req.query.me ? optionalUid(req) : null
    if (uid && mongoose.isValidObjectId(uid)) {
      const meId = String(uid)
      // S'il est dans le top-200 déjà chargé : rang exact (départage des égalités
      // inclus) sans requête de plus ; sinon calcul léger.
      const inBoard = board.find((b) => String(b.userId) === meId)
      me = inBoard
        ? { rank: inBoard.rank, userId: inBoard.userId, pseudo: inBoard.pseudo, avatar: inBoard.avatar, score: inBoard.score }
        : await playerRank(period, meId)
      if (me) me.total = total
    }

    res.json({ period, board: board.slice(0, limit), me, operationEnd: config.operationEnd })
  } catch (err) {
    Sentry.captureException(err)
    console.error('leaderboard error', err)
    res.status(500).json({ error: 'Erreur lors du chargement du classement.' })
  }
})

export default router
