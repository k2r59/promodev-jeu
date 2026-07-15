<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'
import imgCoffre from '../assets/features/recompenses.png'
import imgPalmier from '../assets/nav/accueil.png'
import { badgePos } from '../badges.js'

const auth = useAuthStore()
const badges = ref([])
const loading = ref(true)

const STEPS = [
  { icon: '🏄', html: 'Jouez et enregistrez votre <b>meilleur score</b>.' },
  { icon: '🏆', html: 'Terminez dans le <b>Top 100</b> à la fin de l’opération pour devenir finaliste.' },
  { icon: '🎯', html: 'Un <b>tirage au sort</b> parmi les 100 finalistes désigne le grand gagnant.' }
]

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
        <div class="pill pill--tag">🏅 Récompense finale</div>
        <div class="grandprize__amount">1 000 €</div>
        <p>de remise sur une future opération Promodev.</p>
        <img class="grandprize__coffre" :src="imgCoffre" alt="" aria-hidden="true" />
      </div>
      <div class="grandprize__right">
        <h2>Comment gagner ?</h2>
        <ol class="steps">
          <li v-for="(s, i) in STEPS" :key="i" class="step">
            <span class="step__num">{{ i + 1 }}</span>
            <span class="step__ico" aria-hidden="true">{{ s.icon }}</span>
            <span class="step__txt" v-html="s.html"></span>
          </li>
        </ol>
        <p class="note">
          <span class="note__ico" aria-hidden="true">i</span>
          <span>Chacun garde une chance réelle : investissez-vous, mais la chance fait le reste !</span>
        </p>
      </div>
    </div>

    <!-- Badges -->
    <div class="card">
      <div class="card__title">
        <img class="ico ico--img" :src="imgPalmier" alt="" aria-hidden="true" /> Vos badges
      </div>
      <div v-if="loading" class="muted center">Chargement…</div>
      <div v-else class="badge-grid">
        <div v-for="b in badges" :key="b.key" class="badge" :class="{ locked: !b.unlocked }">
          <div class="badge__visual">
            <!-- Le libellé est peint dans le ruban : l'afficher sous le badge
                 le dirait deux fois. La description, elle, reste — c'est elle
                 qui apprend au joueur comment le décrocher. -->
            <span class="badge__hex" role="img" :aria-label="b.label" :style="{ backgroundPosition: badgePos(b.key) }"></span>
            <span v-if="!b.unlocked" class="badge__lock" aria-label="Verrouillé">🔒</span>
          </div>
          <div class="badge__desc">{{ b.desc }}</div>
        </div>
      </div>
      <p v-if="!auth.isAuth" class="signin">
        <span class="signin__ico" aria-hidden="true">🔒</span>
        <span>
          <RouterLink :to="{ path: '/', query: { mode: 'connexion' } }" class="link">Connectez-vous</RouterLink>
          pour débloquer et suivre vos badges.
        </span>
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
  background: linear-gradient(165deg, #ffeec4, #ffdc95);
  border-radius: 18px;
  padding: 20px 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pill--tag {
  background: linear-gradient(180deg, var(--coral-2), var(--coral));
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  box-shadow: 0 3px 8px rgba(255, 94, 120, 0.35);
}
.grandprize__amount {
  font-size: 3.2rem;
  font-weight: 900;
  color: #e8620d;
  text-shadow: 0 2px 0 #fff;
  margin: 12px 0 2px;
  line-height: 1;
}
.grandprize__left p {
  font-weight: 700;
  color: #7a4b00;
  margin: 0;
  font-size: 0.88rem;
}
.grandprize__coffre {
  width: 78%;
  max-width: 200px;
  height: auto;
  margin-top: -4px;
  filter: drop-shadow(0 6px 10px rgba(120, 90, 40, 0.3));
}
.grandprize__right h2 {
  margin-bottom: 12px;
  font-size: 1.3rem;
}

/* Étapes numérotées : la pastille porte le rang, l'ordre a du sens ici. */
.steps {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.step {
  display: grid;
  grid-template-columns: 24px 24px 1fr;
  align-items: start;
  gap: 9px;
  font-weight: 600;
  line-height: 1.4;
  font-size: 0.92rem;
}
.step__num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #ffd0d9, #ffb3c1);
  color: #c22c48;
  font-weight: 900;
  font-size: 0.75rem;
}
.step__ico {
  font-size: 1.1rem;
  line-height: 1.2;
}
.note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: #eef4fd;
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.86rem;
  line-height: 1.4;
}
.note__ico {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #5cbdf5, #2e93e0);
  color: #fff;
  font-weight: 900;
  font-style: italic;
  font-size: 0.85rem;
}
/* Les 6 badges tiennent sur une ligne : colonnes fixes plutôt qu'auto-fill,
   qui repliait dès que la place manquait. */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
.badge {
  text-align: center;
  padding: 14px 8px 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(43, 45, 90, 0.07);
}
.badge__visual {
  position: relative;
  width: 76px;
  margin: 0 auto 10px;
}
/* Case du sprite, fluide : le badge suit la largeur de sa colonne de grille.
   C'est pour ça que la position est en % (cf. badges.js) — un décalage en
   pixels aurait obligé à figer une taille ici. `aspect-ratio` donne au <span>
   la hauteur qu'une <img> tirait de son fichier. */
.badge__hex {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  background-image: url('../assets/badges/badges-sprite.png');
  background-repeat: no-repeat;
  background-size: 600% 100%;
  filter: drop-shadow(0 4px 7px rgba(43, 45, 90, 0.24));
}
/* Cadenas en pastille, posé sur le coin du badge verrouillé. */
.badge__lock {
  position: absolute;
  top: -2px;
  right: -6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  background: linear-gradient(180deg, #fff, #e9edf6);
  box-shadow: 0 2px 5px rgba(43, 45, 90, 0.25);
}
.badge.locked .badge__hex {
  filter: grayscale(1) drop-shadow(0 3px 6px rgba(43, 45, 90, 0.16));
  opacity: 0.75;
}
.badge.locked .badge__desc {
  opacity: 0.7;
}
/* La description remonte : elle est seule sous le badge depuis que le libellé
   vit dans le ruban du visuel. */
.badge__desc {
  font-size: 0.75rem;
  color: var(--ink-soft);
  font-weight: 600;
  margin-top: 8px;
  line-height: 1.3;
}

.signin {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin: 14px 0 0;
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.9rem;
}
.signin__ico {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  background: linear-gradient(180deg, #5cbdf5, #2e93e0);
  flex-shrink: 0;
}
.link {
  color: var(--sky);
  font-weight: 800;
}
@media (max-width: 860px) {
  .badge-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 620px) {
  .grandprize {
    grid-template-columns: 1fr;
  }
  .badge-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
