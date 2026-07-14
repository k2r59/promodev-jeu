<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { Hourglass } from 'lucide-vue-next'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const period = ref('week')
const board = ref([])
const me = ref(null)
const operationEnd = ref(null)
const loading = ref(true)

const tabs = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'all', label: 'Général' }
]

async function load() {
  loading.value = true
  try {
    const res = await api('/leaderboard', { query: { period: period.value, limit: 100, me: auth.user?.id } })
    board.value = res.board
    me.value = res.me
    operationEnd.value = res.operationEnd
  } catch (e) {
    board.value = []
  } finally {
    loading.value = false
  }
}

const daysLeft = computed(() => {
  if (!operationEnd.value) return null
  const diff = new Date(operationEnd.value) - new Date()
  return Math.max(0, Math.ceil(diff / 86400000))
})

watch(period, load)
onMounted(load)
</script>

<template>
  <div class="lb page">
    <div class="card page__card">
      <div class="lb__head">
        <h1>Classement</h1>
        <p class="muted">
          Seul votre <b>meilleur score</b> est conservé. En fin d'opération, les
          <b>100 meilleurs</b> deviennent finalistes pour le tirage au sort des 1 000 € !
          <span v-if="daysLeft !== null" class="pill pill--days">
            <Hourglass :size="13" aria-hidden="true" /> {{ daysLeft }} jours restants
          </span>
        </p>
        <div class="tabs">
          <button v-for="t in tabs" :key="t.key" :class="{ active: period === t.key }" @click="period = t.key">
            {{ t.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="muted center" style="padding: 30px">Chargement du classement…</div>
      <div v-else-if="!board.length" class="muted center" style="padding: 30px">
        Aucun score pour cette période. À vous de jouer ! 🏄
      </div>
      <div v-else class="lb-list">
        <div
          v-for="row in board"
          :key="row.userId"
          class="row"
          :class="{ 'row--me': String(row.userId) === String(auth.user?.id), 'row--finalist': row.finalist }"
        >
          <span class="row__rank" :data-rank="row.rank">
            <template v-if="row.rank <= 3">{{ ['🥇', '🥈', '🥉'][row.rank - 1] }}</template>
            <template v-else>{{ row.rank }}</template>
          </span>
          <span class="row__avatar">{{ row.avatar }}</span>
          <span class="row__name">
            {{ row.pseudo }}
            <em v-if="String(row.userId) === String(auth.user?.id)">(vous)</em>
            <span v-if="row.finalist" class="finalist-tag">finaliste</span>
          </span>
          <span class="row__combo" v-if="row.maxCombo">🔥x{{ row.maxCombo }}</span>
          <span class="row__score">{{ row.score.toLocaleString('fr-FR') }} ⭐</span>
        </div>
      </div>

      <div v-if="me && !board.some((b) => String(b.userId) === String(auth.user?.id))" class="me-banner">
        <span class="row__rank">{{ me.rank }}</span>
        <span class="row__avatar">{{ me.avatar }}</span>
        <span class="row__name">{{ me.pseudo }} <em>(vous)</em></span>
        <span class="row__score">{{ me.score.toLocaleString('fr-FR') }} ⭐</span>
      </div>
      <p v-else-if="!auth.isAuth" class="muted center" style="margin-top: 14px">
        <RouterLink :to="{ path: '/', query: { mode: 'connexion' } }" class="link">Connectez-vous</RouterLink> pour apparaître dans le classement.
      </p>
    </div>
  </div>
</template>

<style scoped>
.lb {
  max-width: 780px;
  margin: 0 auto;
  width: 100%;
}
.lb__head {
  margin-bottom: 16px;
}
.lb__head h1 {
  font-size: 1.8rem;
  margin-bottom: 6px;
}
.pill--days {
  background: #eaf7ff;
  color: var(--sea);
  margin-left: 6px;
}
.tabs {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  background: #eef1f8;
  border-radius: 999px;
  padding: 4px;
}
.tabs button {
  flex: 1;
  padding: 10px;
  border-radius: 999px;
  font-weight: 800;
  background: transparent;
  color: var(--ink-soft);
}
.tabs button.active {
  background: #fff;
  color: var(--coral);
  box-shadow: var(--shadow);
}
.lb-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 14px;
}
.row:nth-child(odd) {
  background: #f7f9fd;
}
.row--me {
  background: linear-gradient(90deg, #fff0f6, #ffe6f0) !important;
  box-shadow: inset 0 0 0 2px var(--coral);
}
.row--finalist .row__name {
  color: var(--sea);
}
.row__rank {
  width: 34px;
  text-align: center;
  font-weight: 900;
  font-size: 1rem;
  flex-shrink: 0;
}
.row__avatar {
  font-size: 1.5rem;
}
.row__name {
  flex: 1;
  font-weight: 800;
}
.row__name em {
  color: var(--coral);
  font-style: normal;
  margin-left: 4px;
}
.finalist-tag {
  display: inline-block;
  background: #eaf7ff;
  color: var(--sea);
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  margin-left: 6px;
}
.row__combo {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--coral);
}
.row__score {
  font-weight: 900;
  color: var(--sea);
  white-space: nowrap;
}
.me-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-top: 12px;
  border-radius: 14px;
  background: linear-gradient(90deg, #fff0f6, #ffe6f0);
  box-shadow: inset 0 0 0 2px var(--coral);
}
.link {
  color: var(--sky);
  font-weight: 800;
}
</style>
