<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const badges = ref([])
const loading = ref(true)

// Fallback si non connecté : liste visuelle des badges
const FALLBACK = [
  { key: 'debutant', label: 'Débutant', icon: '🥥', desc: 'Jouer sa première partie', unlocked: false },
  { key: 'rapide', label: 'Rapide', icon: '🕶️', desc: 'Jouer 10 parties', unlocked: false },
  { key: 'stratege', label: 'Stratège', icon: '🏄', desc: 'Atteindre 5 000 points', unlocked: false },
  { key: 'combo', label: 'Combo Master', icon: '📸', desc: 'Réaliser un combo x8', unlocked: false },
  { key: 'expert', label: 'Expert', icon: '🏆', desc: 'Atteindre 15 000 points', unlocked: false },
  { key: 'mystere', label: 'Mystère', icon: '🎁', desc: 'Atteindre le niveau 10', unlocked: false }
]

async function load() {
  if (!auth.isAuth) {
    badges.value = FALLBACK
    loading.value = false
    return
  }
  try {
    const res = await api('/game/badges')
    badges.value = res.badges
  } catch {
    badges.value = FALLBACK
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="rw">
    <!-- Le grand prix -->
    <div class="grandprize card">
      <div class="grandprize__left">
        <div class="pill pill--tag">🎁 Récompense finale</div>
        <div class="grandprize__amount">1 000 €</div>
        <p>de remise sur une future opération Promodev.</p>
      </div>
      <div class="grandprize__right">
        <h2>Comment gagner ?</h2>
        <ol>
          <li>🏄 Jouez et enregistrez votre <b>meilleur score</b>.</li>
          <li>🏆 Terminez dans le <b>Top 100</b> à la fin de l'opération pour devenir finaliste.</li>
          <li>🎲 Un <b>tirage au sort</b> parmi les 100 finalistes désigne le grand gagnant.</li>
        </ol>
        <p class="muted">Chacun garde une chance réelle : investissez-vous, mais la chance fait le reste !</p>
      </div>
    </div>

    <!-- Badges -->
    <div class="card">
      <div class="card__title"><span class="ico">🏅</span> Vos badges</div>
      <div v-if="loading" class="muted center">Chargement…</div>
      <div v-else class="badge-grid">
        <div v-for="b in badges" :key="b.key" class="badge" :class="{ locked: !b.unlocked }">
          <div class="badge__hex">{{ b.unlocked ? b.icon : '🔒' }}</div>
          <div class="badge__label">{{ b.label }}</div>
          <div class="badge__desc">{{ b.desc }}</div>
        </div>
      </div>
      <p v-if="!auth.isAuth" class="muted center" style="margin-top: 12px">
        <RouterLink to="/connexion" class="link">Connectez-vous</RouterLink> pour débloquer et suivre vos badges.
      </p>
    </div>
  </div>
</template>

<style scoped>
.rw {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 18px;
  max-width: 900px;
  margin: 0 auto;
}
.grandprize {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  background: linear-gradient(160deg, #fff, #eaf7ff);
  align-items: center;
}
.grandprize__left {
  text-align: center;
  background: linear-gradient(160deg, #ffd98a, #ffbe55);
  border-radius: 18px;
  padding: 20px;
}
.pill--tag {
  background: var(--coral);
  color: #fff;
}
.grandprize__amount {
  font-size: 3rem;
  font-weight: 900;
  color: #b23c00;
  text-shadow: 0 2px 0 #fff;
  margin: 10px 0 2px;
}
.grandprize__left p {
  font-weight: 700;
  color: #7a4b00;
  margin: 0;
  font-size: 0.9rem;
}
.grandprize__right h2 {
  margin-bottom: 10px;
}
.grandprize__right ol {
  margin: 0 0 10px;
  padding-left: 20px;
  line-height: 1.7;
  font-weight: 600;
}
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
}
.badge {
  text-align: center;
  padding: 14px 8px;
  border-radius: 16px;
  background: #f7f9fd;
}
.badge__hex {
  width: 64px;
  height: 64px;
  margin: 0 auto 8px;
  display: grid;
  place-items: center;
  font-size: 2rem;
  background: linear-gradient(180deg, #fff, #e8eff9);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  box-shadow: var(--shadow);
}
.badge:not(.locked) .badge__hex {
  background: linear-gradient(180deg, #ffe9a8, #ffca4d);
}
.badge.locked {
  opacity: 0.6;
}
.badge__label {
  font-weight: 900;
  font-size: 0.9rem;
}
.badge__desc {
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-weight: 600;
  margin-top: 3px;
}
.link {
  color: var(--sky);
  font-weight: 800;
}
@media (max-width: 620px) {
  .grandprize {
    grid-template-columns: 1fr;
  }
}
</style>
