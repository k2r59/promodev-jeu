import { Router } from 'express'
import mongoose from 'mongoose'
import { Score } from '../models/Score.js'
import { config } from '../config.js'

const router = Router()

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

async function bestPerUser(period, limit = 100) {
  const match = {}
  const start = periodStart(period)
  if (start) match.createdAt = { $gte: start }

  return Score.aggregate([
    { $match: match },
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

// GET /api/leaderboard?period=day|week|month|all&limit=100&me=<userId>
router.get('/', async (req, res) => {
  try {
    const period = ['day', 'week', 'month', 'all'].includes(req.query.period) ? req.query.period : 'week'
    const limit = Math.min(Number(req.query.limit) || 100, 200)
    const rows = await bestPerUser(period, limit)

    const board = rows.map((r, i) => ({
      rank: i + 1,
      userId: r._id,
      pseudo: r.pseudo,
      avatar: r.avatar,
      score: r.score,
      maxCombo: r.maxCombo,
      finalist: i < 100 && period === 'all'
    }))

    // Rang du joueur courant (même s'il est hors top)
    let me = null
    if (req.query.me && mongoose.isValidObjectId(req.query.me)) {
      const full = await bestPerUser(period, 100000)
      const idx = full.findIndex((r) => String(r._id) === String(req.query.me))
      if (idx >= 0) {
        me = {
          rank: idx + 1,
          userId: full[idx]._id,
          pseudo: full[idx].pseudo,
          avatar: full[idx].avatar,
          score: full[idx].score,
          total: full.length
        }
      }
    }

    res.json({ period, board, me, operationEnd: config.operationEnd })
  } catch (err) {
    console.error('leaderboard error', err)
    res.status(500).json({ error: 'Erreur lors du chargement du classement.' })
  }
})

export default router
