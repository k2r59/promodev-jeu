import mongoose from 'mongoose'
import { config } from './config.js'

let memoryServer = null

export async function connectDB() {
  mongoose.set('strictQuery', true)

  let uri = config.mongoUri

  // Aucune URI fournie : en dev on démarre un MongoDB en mémoire (zéro config).
  if (!uri) {
    if (config.isProd) {
      console.error('❌ MONGODB_URI est requis en production.')
      process.exit(1)
    }
    console.log('ℹ️  Aucune MONGODB_URI : démarrage d’un MongoDB en mémoire (dev)…')
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('promodev_jeu_ete')
    console.log('   URI temporaire :', uri)
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    console.log('✅ MongoDB connecté')
  } catch (err) {
    console.error('❌ Erreur de connexion MongoDB :', err.message)
    console.error('   Vérifiez MONGODB_URI dans votre .env')
    process.exit(1)
  }
}

// Arrêt propre du serveur en mémoire.
async function shutdown() {
  try {
    await mongoose.disconnect()
    if (memoryServer) await memoryServer.stop()
  } finally {
    process.exit(0)
  }
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
