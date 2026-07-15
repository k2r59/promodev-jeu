// Migration ponctuelle : donne une image d'avatar aux comptes créés avant que
// les avatars soient des images (ils portent un emoji : '😎', '🏄'…).
//
// Pourquoi les scores aussi : Score.avatar est une COPIE FIGÉE au moment de la
// partie, et le classement lit celle du meilleur score (`$first` dans
// routes/leaderboard.js). Migrer les comptes sans les scores ne changerait donc
// rien à ce que les joueurs voient — c'est le classement qui est l'enjeu.
//
// Rejouable sans dégât : l'attribution est déterministe (avatarForId), et on ne
// touche qu'aux valeurs qui ne sont pas déjà des clés connues.
//
//   node scripts/migrate-avatars.js            # simulation, n'écrit rien
//   node scripts/migrate-avatars.js --write    # applique
//
// En prod :
//   heroku run node scripts/migrate-avatars.js -a <app>            # d'abord
//   heroku run node scripts/migrate-avatars.js --write -a <app>    # ensuite

import mongoose from 'mongoose'
import { config } from '../src/config.js'
import { User } from '../src/models/User.js'
import { Score } from '../src/models/Score.js'
import { isAvatarKey, avatarForId } from '../src/avatars.js'

const WRITE = process.argv.includes('--write')

async function main() {
  if (!config.mongoUri) {
    console.error('MONGODB_URI absente : cette migration vise une vraie base, pas le Mongo en mémoire du dev.')
    process.exit(1)
  }
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
  console.log(WRITE ? '⚠️  MODE ÉCRITURE' : 'ℹ️  Simulation (aucune écriture) — ajoutez --write pour appliquer')

  const users = await User.find({}, { avatar: 1 }).lean()
  const aMigrer = users.filter((u) => !isAvatarKey(u.avatar))

  console.log(`\nComptes            : ${users.length}`)
  console.log(`  déjà en image    : ${users.length - aMigrer.length}`)
  console.log(`  à migrer         : ${aMigrer.length}`)

  let scoresTouches = 0
  for (const u of aMigrer) {
    const cle = avatarForId(u._id)
    if (WRITE) {
      await User.updateOne({ _id: u._id }, { $set: { avatar: cle } })
      const r = await Score.updateMany({ user: u._id }, { $set: { avatar: cle } })
      scoresTouches += r.modifiedCount
    } else {
      scoresTouches += await Score.countDocuments({ user: u._id })
    }
    console.log(`  ${String(u._id)}  ${JSON.stringify(u.avatar)} -> ${cle}`)
  }

  console.log(`\nScores ${WRITE ? 'mis à jour' : 'qui seraient mis à jour'} : ${scoresTouches} / ${await Score.countDocuments()}`)

  await mongoose.disconnect()
  if (!WRITE) console.log('\nRien n’a été écrit. Relancez avec --write si le rapport ci-dessus vous convient.')
}

main().catch(async (e) => {
  console.error('Échec :', e.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
