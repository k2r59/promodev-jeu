import { Router } from 'express'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import * as Sentry from '@sentry/node'
import { Score } from '../models/Score.js'
import { GameSession } from '../models/GameSession.js'
import { requireAuth } from '../middleware/auth.js'
import { dailyPick, BADGES, dayKey } from '../gameData.js'

const router = Router()

// --- Anti-triche du score --------------------------------------------------
// Le score est calculé dans le navigateur : le serveur ne peut pas le recalculer
// sans rejouer la partie (chantier à part). À défaut, on rend la triche coûteuse
// et détectable, sur trois appuis :
//  1. une partie ouvre une session horodatée côté serveur (/start) ;
//  2. la soumission (/session) doit arriver APRÈS un temps de jeu plausible, et
//     la session ne vaut qu'une fois ;
//  3. le score est borné par ce temps réellement écoulé.
// Le curl instantané, le rejeu et les scores absurdes tombent. Un score truqué
// mais plausible, posté après 2 min d'attente, reste possible — il est alors
// anormal et relève de la disqualification (art. 10 du règlement).

// Durée d'une partie : 120 s de jeu + ~2 s de décompte. En deçà de 100 s, aucune
// partie honnête n'a pu se terminer : c'est forcément une soumission forgée.
const GAME_MIN_ELAPSED_MS = 100 * 1000
const GAME_SESSION_TTL_MS = 10 * 60 * 1000

// Plafond de points par seconde. Volontairement TRÈS large (l'objectif est ~25
// pts/s, un très bon joueur ~250) : le but est de couper les scores absurdes
// (le clamp historique tolérait 1 000 000, soit ~8 000 pts/s), pas de risquer
// de recaler un joueur d'exception. À resserrer une fois les vrais scores connus.
const MAX_POINTS_PER_SEC = 1000

// Rate-limit PAR JOUEUR (clé = uid), et non par IP : le public est B2B, plusieurs
// prospects partagent l'IP publique de leur entreprise — une limite par IP les
// punirait les uns pour les autres. 30 appels / 15 min : une partie dure 2 min,
// personne n'en joue quinze honnêtement dans ce laps de temps.
const gameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: { error: 'Trop de parties en peu de temps. Patientez quelques minutes.' }
})

// Renvoie l'état des défis du jour pour l'utilisateur.
// dailyPick est déterministe : cette liste et celle utilisée au moment de
// crediter une partie sont forcément les mêmes.
function challengesState(user) {
  const key = dayKey()
  const progress = (user.dailyChallenges && user.dailyChallenges[key]) || {}
  return dailyPick(key).map((c) => {
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

// POST /api/game/start  — ouvrir une partie (horodatée serveur)
router.post('/start', requireAuth, gameLimiter, async (req, res) => {
  try {
    const token = crypto.randomBytes(24).toString('base64url')
    await GameSession.create({
      token,
      user: req.user._id,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + GAME_SESSION_TTL_MS)
    })
    res.json({ sessionToken: token })
  } catch (err) {
    Sentry.captureException(err)
    console.error('game/start error', err)
    res.status(500).json({ error: 'Impossible de démarrer la partie.' })
  }
})

// POST /api/game/session  — soumettre le résultat d'une partie
router.post('/session', requireAuth, gameLimiter, async (req, res) => {
  try {
    const user = req.user
    let { score, maxCombo, boostersUsed, matches } = req.body || {}
    const sessionToken = typeof (req.body || {}).sessionToken === 'string' ? req.body.sessionToken : ''

    // Consomme la session de façon ATOMIQUE : findOneAndUpdate sur usedAt:null
    // garantit qu'une seule requête concurrente la trouve libre. Deux onglets
    // qui soumettent le même jeton en même temps → un seul passe.
    const gs = sessionToken
      ? await GameSession.findOneAndUpdate(
          { token: sessionToken, user: user._id, usedAt: null },
          { $set: { usedAt: new Date() } },
          { new: false } // le doc AVANT update : porte startedAt et usedAt:null
        )
      : null
    if (!gs) return res.status(400).json({ error: 'Partie invalide ou déjà enregistrée. Relancez une partie.' })

    // Temps RÉELLEMENT écoulé, mesuré serveur — le client ne dicte plus la durée.
    const elapsedMs = Date.now() - gs.startedAt.getTime()
    if (elapsedMs < GAME_MIN_ELAPSED_MS)
      return res.status(400).json({ error: 'Partie trop courte pour être valide.' })
    const durationSec = Math.round(elapsedMs / 1000)

    score = Math.max(0, Math.min(Number(score) || 0, 1_000_000))
    maxCombo = Math.max(0, Math.min(Number(maxCombo) || 0, 999))
    boostersUsed = Math.max(0, Math.min(Number(boostersUsed) || 0, 999))
    matches = Math.max(0, Math.min(Number(matches) || 0, 100000))

    // Le score doit tenir dans ce que le temps écoulé permet. Au-delà, il n'a pas
    // pu être joué : on refuse plutôt que d'inscrire un score frauduleux au
    // classement du prix. On trace, pour la détection a posteriori (art. 10).
    const scoreCap = durationSec * MAX_POINTS_PER_SEC
    if (score > scoreCap) {
      console.warn(`[anti-triche] score refusé user=${user._id} score=${score} cap=${scoreCap} durée=${durationSec}s`)
      return res.status(400).json({ error: 'Score incohérent avec la durée de la partie.' })
    }

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

    // Seuls les défis tirés pour aujourd'hui comptent : sinon on ferait
    // progresser des défis que le joueur ne voit même pas.
    for (const c of dailyPick(key)) {
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
    Sentry.captureException(err)
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
