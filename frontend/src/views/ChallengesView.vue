<script setup>
import { ref, onMounted, computed } from 'vue'
import { api } from '../api/client.js'

const challenges = ref([])
const resetAt = ref(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await api('/game/challenges')
    challenges.value = res.challenges
    resetAt.value = res.resetAt
  } finally {
    loading.value = false
  }
}

const resetStr = computed(() => {
  if (!resetAt.value) return ''
  const diff = new Date(resetAt.value) - new Date()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h ${m}min`
})
const doneCount = computed(() => challenges.value.filter((c) => c.done).length)

onMounted(load)
</script>

<template>
  <div class="ch">
    <div class="ch__head card">
      <h1>⭐ Défis du jour</h1>
      <p class="muted">
        Relevez les défis chaque jour pour gagner des <b>gemmes 💎</b> et de l'<b>XP</b>.
        Les récompenses sont créditées automatiquement dès qu'un défi est complété en jeu.
      </p>
      <div class="ch__meta">
        <span class="pill pill--done">{{ doneCount }}/{{ challenges.length }} complétés</span>
        <span v-if="resetStr" class="pill pill--timer">🔄 Réinitialisation dans {{ resetStr }}</span>
      </div>
    </div>

    <div v-if="loading" class="muted center">Chargement…</div>
    <div v-else class="ch__grid">
      <div v-for="c in challenges" :key="c.id" class="chal-card card" :class="{ done: c.done }">
        <div class="chal-card__ico">{{ c.icon }}</div>
        <div class="chal-card__body">
          <div class="chal-card__label">{{ c.label }}</div>
          <div class="progress"><div class="progress__bar" :style="{ width: Math.round((c.progress / c.goal) * 100) + '%' }"></div></div>
          <div class="chal-card__foot">
            <span>{{ Math.min(c.progress, c.goal) }} / {{ c.goal }}</span>
            <span class="rewards">💎 {{ c.reward }} · ✨ {{ c.xp }} XP</span>
          </div>
        </div>
        <div class="chal-card__state">
          <span v-if="c.done">✅</span>
          <span v-else class="muted">🎯</span>
        </div>
      </div>
    </div>

    <div class="card center cta">
      <RouterLink to="/jouer" class="btn btn--lg">▶ Jouer pour progresser</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.ch {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 18px;
  max-width: 780px;
  margin: 0 auto;
}
.ch__head h1 {
  font-size: 1.8rem;
  margin-bottom: 6px;
}
.ch__meta {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.pill--done {
  background: #e7f9ee;
  color: var(--leaf);
}
.pill--timer {
  background: #eaf7ff;
  color: var(--sea);
}
.ch__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.chal-card {
  display: flex;
  align-items: center;
  gap: 14px;
}
.chal-card.done {
  background: linear-gradient(160deg, #eefff5, #ffffff);
  box-shadow: inset 0 0 0 2px var(--leaf), var(--shadow);
}
.chal-card__ico {
  font-size: 2rem;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  background: #f3f6fc;
  border-radius: 16px;
  flex-shrink: 0;
}
.chal-card__body {
  flex: 1;
  min-width: 0;
}
.chal-card__label {
  font-weight: 800;
  margin-bottom: 8px;
}
.chal-card__foot {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
  margin-top: 6px;
}
.rewards {
  color: var(--sea);
}
.chal-card__state {
  font-size: 1.4rem;
}
.cta {
  padding: 22px;
}
</style>
