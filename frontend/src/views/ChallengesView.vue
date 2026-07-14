<script setup>
import { ref, onMounted, computed } from 'vue'
import { RotateCw, Gem, CircleCheck, Target } from 'lucide-vue-next'
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
  <div class="ch page">
    <div class="card page__card">
      <div class="ch__head">
        <h1>Défis du jour</h1>
        <p class="muted">
          Relevez les défis chaque jour pour gagner des <b>gemmes</b> et de l'<b>XP</b>.
          Les récompenses sont créditées automatiquement dès qu'un défi est complété en jeu.
        </p>
        <div class="ch__meta">
          <span class="pill pill--done">{{ doneCount }}/{{ challenges.length }} complétés</span>
          <span v-if="resetStr" class="pill pill--timer">
            <RotateCw :size="13" aria-hidden="true" /> Réinitialisation dans {{ resetStr }}
          </span>
        </div>
      </div>

      <div v-if="loading" class="muted center">Chargement…</div>
      <div v-else class="ch__grid">
        <div v-for="c in challenges" :key="c.id" class="chal-card" :class="{ done: c.done }">
          <div class="chal-card__ico">{{ c.icon }}</div>
          <div class="chal-card__body">
            <div class="chal-card__label">{{ c.label }}</div>
            <div class="progress"><div class="progress__bar" :style="{ width: Math.round((c.progress / c.goal) * 100) + '%' }"></div></div>
            <div class="chal-card__foot">
              <span>{{ Math.min(c.progress, c.goal) }} / {{ c.goal }}</span>
              <span class="rewards"><Gem :size="13" aria-hidden="true" /> {{ c.reward }} · {{ c.xp }} XP</span>
            </div>
          </div>
          <div class="chal-card__state">
            <CircleCheck v-if="c.done" :size="22" class="ico-done" aria-hidden="true" />
            <Target v-else :size="22" class="ico-todo" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="center cta">
        <RouterLink to="/" class="btn btn--lg">Jouer pour progresser</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ch {
  max-width: 780px;
  margin: 0 auto;
  width: 100%;
}
.ch__head {
  margin-bottom: 16px;
}
.ico-done {
  color: var(--leaf);
}
.ico-todo {
  color: var(--ink-soft);
  opacity: 0.6;
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
/* `min(320px, 100%)` et non `320px` : un minimum rigide ne sait pas rétrécir, et
   la carte débordait de 42px sur un écran de 360 (mesuré). Le `min()` la laisse
   descendre à la largeur réelle quand la colonne est plus étroite que 320. */
.ch__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: 12px;
}
/* Plus de .card ici : les défis vivent dans le bloc unique de la page. */
.chal-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: #f7f9fd;
}
.chal-card.done {
  background: linear-gradient(160deg, #eefff5, #ffffff);
  box-shadow: inset 0 0 0 2px var(--leaf);
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--sea);
}
.chal-card__state {
  display: grid;
  place-items: center;
}
.cta {
  padding-top: 20px;
}
</style>
