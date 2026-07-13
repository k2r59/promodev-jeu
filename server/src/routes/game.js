import { Router } from 'express'
import { Score } from '../models/Score.js'
import { requireAuth } from '../middleware/auth.js'
import { DAILY_CHALLENGES, BADGES, dayKey } from '../gameData.js'

const router = Router()

// Renvoie l'état des défis du jour pour l'utilisateur
function challengesState(user) {
  const key = dayKey()
  const progress = (user.dailyChallenges && user.dailyChallenges[key]) || {}
  return DAILY_CHALLENGES.map((c) => {
    const claimedKey = `${key}:${c.id}`
    const value = Math.min(progress[c.id] || 0, c.goal)
    return {
      id: c.id,
      label: c.label,
      icon: c.icon,
      goal: c.goal,
      reward: c.reward,
      xp: c.xp,
      progress: value,
      done: value >= c.goal,
      claimed: user.claimedChallenges.includes(claimedKey)
    }
  })
}

function badgesState(user) {
  return BADGES.map((b) => ({
    key: b.key,
    label: b.label,
    icon: b.icon,
    desc: b.desc,
    unlocked: user.badges.includes(b.key)
  }))
}

// POST /api/game/session  — soumettre le résultat d'une partie
router.post('/session', requireAuth, async (req, res) => {
  try {
    const user = req.user
    let { score, maxCombo, boostersUsed, matches, durationSec } = req.body || {}

    // Validation / bornage anti-triche basique
    score = Math.max(0, Math.min(Number(score) || 0, 1_000_000))
    maxCombo = Math.max(0, Math.min(Number(maxCombo) || 0, 999))
    boostersUsed = Math.max(0, Math.min(Number(boostersUsed) || 0, 999))
    matches = Math.max(0, Math.min(Number(matches) || 0, 100000))
    durationSec = Math.max(0, Math.min(Number(durationSec) || 120, 3600))

    // Enregistre la partie (historique + classements)
    await Score.create({
      user: user._id,
      pseudo: user.pseudo,
      avatar: user.avatar,
      score,
      maxCombo,
      boostersUsed,
      matches,
      durationSec
    })

    // --- Progression des défis quotidiens ---
    const key = dayKey()
    const daily = { ...(user.dailyChallenges || {}) }
    const today = { ...(daily[key] || {}) }
    const session = { score, maxCombo, boostersUsed, matches }
    const rewards = { gems: 0, xp: 0, completed: [] }

    for (const c of DAILY_CHALLENGES) {
      const inc = c.match(session)
      if (!inc) continue
      const before = today[c.id] || 0
      const after = Math.min(before + inc, c.goal)
      today[c.id] = after
      const claimedKey = `${key}:${c.id}`
      // Récompense automatique quand le défi passe complété
      if (before < c.goal && after >= c.goal && !user.claimedChallenges.includes(claimedKey)) {
        rewards.gems += c.reward
        rewards.xp += c.xp
        rewards.completed.push({ id: c.id, label: c.label, reward: c.reward, xp: c.xp })
        user.claimedChallenges.push(claimedKey)
      }
    }
    daily[key] = today
    user.dailyChallenges = daily
    user.markModified('dailyChallenges')

    // --- Stats cumulées + XP de la partie (1 XP / 10 pts) ---
    const gameXp = Math.floor(score / 10)
    user.xp += gameXp + rewards.xp
    user.gems += rewards.gems
    user.gamesPlayed += 1
    user.totalScore += score
    user.boostersUsedTotal += boostersUsed
    if (score > user.bestScoreAllTime) user.bestScoreAllTime = score
    if (maxCombo > user.bestCombo) user.bestCombo = maxCombo
    user.recomputeLevel()

    // --- Badges nouvellement débloqués ---
    const newBadges = []
    for (const b of BADGES) {
      if (!user.badges.includes(b.key) && b.check(user)) {
        user.badges.push(b.key)
        newBadges.push({ key: b.key, label: b.label, icon: b.icon })
      }
    }

    await user.save()

    res.json({
      user: user.toPublic(),
      gained: { gameXp, ...rewards, newBadges },
      challenges: challengesState(user),
      badges: badgesState(user)
    })
  } catch (err) {
    console.error('session error', err)
    res.status(500).json({ error: 'Erreur lors de l’enregistrement de la partie.' })
  }
})

// GET /api/game/challenges
router.get('/challenges', requireAuth, (req, res) => {
  res.json({ challenges: challengesState(req.user), resetAt: nextResetISO() })
})

// GET /api/game/badges
router.get('/badges', requireAuth, (req, res) => {
  res.json({ badges: badgesState(req.user) })
})

function nextResetISO() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return next.toISOString()
}

export default router
