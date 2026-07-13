<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()

const challenges = ref([])
const board = ref([])
const me = ref(null)
const loading = ref(true)

const topBadges = ['🥥', '🕶️', '🏄', '📸', '🔒']

async function load() {
  loading.value = true
  try {
    const lb = await api('/leaderboard', {
      query: { period: 'week', limit: 5, me: auth.user?.id }
    })
    board.value = lb.board
    me.value = lb.me
    if (auth.isAuth) {
      const ch = await api('/game/challenges')
      challenges.value = ch.challenges
    }
  } catch (e) {
    // silencieux : le hub reste utilisable
  } finally {
    loading.value = false
  }
}

function play() {
  if (auth.isAuth) router.push('/jouer')
  else router.push({ name: 'auth', query: { redirect: '/jouer' } })
}

const previewChallenges = computed(() => challenges.value.slice(0, 3))

onMounted(load)
</script>

<template>
  <div class="home">
    <!-- Colonne gauche -->
    <aside class="col col--left">
      <!-- Bandeau récompense -->
      <div class="prize card">
        <div class="prize__tag">À GAGNER</div>
        <div class="prize__amount">1 000 €</div>
        <div class="prize__desc">de remise sur votre future opération promo !</div>
        <RouterLink to="/recompenses" class="btn btn--sun btn--block">En savoir plus</RouterLink>
        <div class="prize__deco">🦩🏄🌴</div>
      </div>

      <!-- Défis du jour -->
      <div class="card">
        <div class="card__title"><span class="ico">🏝️</span> Défis du jour</div>
        <template v-if="auth.isAuth && previewChallenges.length">
          <div v-for="c in previewChallenges" :key="c.id" class="chal">
            <span class="chal__ico">{{ c.icon }}</span>
            <div class="chal__body">
              <div class="chal__label">{{ c.label }}</div>
              <div class="progress"><div class="progress__bar" :style="{ width: Math.round((c.progress / c.goal) * 100) + '%' }"></div></div>
            </div>
            <span class="chal__reward">{{ c.progress }}/{{ c.goal }} <b>💎{{ c.reward }}</b></span>
          </div>
          <RouterLink to="/defis" class="btn btn--ghost btn--block" style="margin-top: 10px">Voir tous les défis</RouterLink>
        </template>
        <p v-else class="muted center" style="padding: 8px 0">
          Connectez-vous pour relever les défis quotidiens et gagner des gemmes !
        </p>
      </div>
    </aside>

    <!-- Colonne centrale -->
    <section class="col col--center">
      <div class="hero card">
        <div class="hero__badges">🌞 🍦 🏖️ 🍉 ⭐ 🐚 🥥 🌴</div>
        <h1 class="hero__title">Le Jeu de l'Été</h1>
        <p class="hero__sub">Un Match-3 estival ultra addictif. 2 minutes chrono, des combos qui explosent et 1 000 € à la clé !</p>
        <button class="btn btn--lg hero__play" @click="play">▶ Partie rapide</button>
        <div v-if="!auth.isAuth" class="hero__hint">
          Nouveau ? <RouterLink to="/connexion" class="link">Créez votre compte gratuit</RouterLink> pour jouer et grimper au classement.
        </div>
      </div>

      <div class="features">
        <div class="feature"><span>🌟</span><b>Simple & fun</b><small>Facile à jouer, difficile à lâcher</small></div>
        <div class="feature"><span>🍦</span><b>Combos & boosters</b><small>Multiplicateurs x2, x3, x5…</small></div>
        <div class="feature"><span>🏖️</span><b>Pour tous</b><small>Jouez quand vous voulez</small></div>
        <div class="feature"><span>🎁</span><b>Récompenses</b><small>Badges, XP et 1 000 € de remise</small></div>
      </div>
    </section>

    <!-- Colonne droite -->
    <aside class="col col--right">
      <!-- Classement -->
      <div class="card">
        <div class="card__title"><span class="ico">🏆</span> Classement (semaine)</div>
        <div v-if="loading" class="muted center">Chargement…</div>
        <template v-else>
          <div
            v-for="row in board"
            :key="row.userId"
            class="lb-row"
            :class="{ 'lb-row--me': me && String(row.userId) === String(auth.user?.id) }"
          >
            <span class="lb-rank" :data-rank="row.rank">{{ row.rank }}</span>
            <span class="lb-avatar">{{ row.avatar }}</span>
            <span class="lb-name">{{ row.pseudo }}<em v-if="me && String(row.userId) === String(auth.user?.id)"> (vous)</em></span>
            <span class="lb-score">{{ row.score.toLocaleString('fr-FR') }} ⭐</span>
          </div>
          <div v-if="me && !board.some((b) => String(b.userId) === String(auth.user?.id))" class="lb-row lb-row--me">
            <span class="lb-rank">{{ me.rank }}</span>
            <span class="lb-avatar">{{ me.avatar }}</span>
            <span class="lb-name">{{ me.pseudo }} <em>(vous)</em></span>
            <span class="lb-score">{{ me.score.toLocaleString('fr-FR') }} ⭐</span>
          </div>
          <p v-if="!board.length" class="muted center">Soyez le premier à marquer des points !</p>
          <RouterLink to="/classement" class="btn btn--ghost btn--block" style="margin-top: 10px">Voir le classement complet</RouterLink>
        </template>
      </div>

      <!-- Badges -->
      <div class="card">
        <div class="card__title"><span class="ico">🏅</span> Badges</div>
        <div class="badges-preview">
          <span v-for="(b, i) in topBadges" :key="i" class="badge-chip">{{ b }}</span>
        </div>
        <RouterLink to="/recompenses" class="btn btn--ghost btn--block" style="margin-top: 12px">Voir tous les badges</RouterLink>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 16px;
  padding-top: 18px;
  align-items: start;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prize {
  background: linear-gradient(160deg, #ffd98a, #ffbe55);
  text-align: center;
  position: relative;
  overflow: hidden;
}
.prize__tag {
  display: inline-block;
  background: var(--coral);
  color: #fff;
  font-weight: 900;
  padding: 4px 16px;
  border-radius: 999px;
  font-size: 0.8rem;
  letter-spacing: 1px;
}
.prize__amount {
  font-size: 3rem;
  font-weight: 900;
  color: #b23c00;
  line-height: 1;
  margin: 8px 0 4px;
  text-shadow: 0 2px 0 #fff;
}
.prize__desc {
  font-weight: 700;
  color: #7a4b00;
  margin-bottom: 14px;
  font-size: 0.92rem;
}
.prize__deco {
  font-size: 1.4rem;
  margin-top: 12px;
}

.chal {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}
.chal__ico {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: #f3f6fc;
  border-radius: 12px;
  flex-shrink: 0;
}
.chal__body {
  flex: 1;
  min-width: 0;
}
.chal__label {
  font-weight: 800;
  font-size: 0.85rem;
  margin-bottom: 5px;
}
.chal__reward {
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}
.chal__reward b {
  display: block;
  color: var(--sea);
}

.hero {
  text-align: center;
  background: linear-gradient(165deg, #ffffff, #eaf7ff);
}
.hero__badges {
  font-size: 1.6rem;
  letter-spacing: 4px;
  margin-bottom: 8px;
}
.hero__title {
  font-size: 2.4rem;
  color: var(--ink);
  background: linear-gradient(90deg, var(--coral), var(--sun));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero__sub {
  color: var(--ink-soft);
  font-weight: 600;
  max-width: 440px;
  margin: 10px auto 18px;
}
.hero__play {
  font-size: 1.3rem;
  padding: 18px 40px;
}
.hero__hint {
  margin-top: 14px;
  font-size: 0.88rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.link {
  color: var(--sky);
  font-weight: 800;
}

.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.feature {
  background: var(--card);
  border-radius: var(--radius-sm);
  padding: 14px 10px;
  text-align: center;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.feature span {
  font-size: 1.8rem;
}
.feature b {
  font-size: 0.9rem;
}
.feature small {
  color: var(--ink-soft);
  font-size: 0.72rem;
  font-weight: 600;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px;
  border-radius: 12px;
}
.lb-row--me {
  background: linear-gradient(90deg, #fff0f6, #ffe6f0);
}
.lb-rank {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-weight: 900;
  font-size: 0.85rem;
  background: #eef1f8;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.lb-rank[data-rank='1'] {
  background: linear-gradient(180deg, #ffe08a, #ffc93c);
  color: #7a4b00;
}
.lb-rank[data-rank='2'] {
  background: linear-gradient(180deg, #e6ecf5, #c3cede);
  color: #4a556b;
}
.lb-rank[data-rank='3'] {
  background: linear-gradient(180deg, #ffcfa0, #ff9d5c);
  color: #7a3b00;
}
.lb-avatar {
  font-size: 1.3rem;
}
.lb-name {
  flex: 1;
  font-weight: 800;
  font-size: 0.9rem;
}
.lb-name em {
  color: var(--coral);
  font-style: normal;
  font-weight: 700;
}
.lb-score {
  font-weight: 900;
  color: var(--sea);
  font-size: 0.9rem;
  white-space: nowrap;
}

.badges-preview {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}
.badge-chip {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  background: linear-gradient(180deg, #fff, #eef3fb);
  border-radius: 14px;
  box-shadow: var(--shadow);
}

@media (max-width: 1080px) {
  .home {
    grid-template-columns: 1fr 1fr;
  }
  .col--center {
    grid-column: 1 / -1;
    order: -1;
  }
}
@media (max-width: 720px) {
  .home {
    grid-template-columns: 1fr;
  }
  .features {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero__title {
    font-size: 2rem;
  }
}
</style>
