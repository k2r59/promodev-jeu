<script setup>
// La dotation : 600 € de cartes cadeaux multi-enseignes, en podium à trois
// gagnants (300 / 200 / 100). Structure déduite des trois valeurs distinctes
// fournies — trois cartes de montants différents = trois rangs, pas un lot
// unique. Le nombre de gagnants du règlement (art. 7) suit cette lecture.
import { Gift } from 'lucide-vue-next'
import imgCoffre from '../assets/features/recompenses.png'

const PRIZES = [
  { rank: 1, medal: '🥇', amount: 300, label: '1ᵉʳ prix' },
  { rank: 2, medal: '🥈', amount: 200, label: '2ᵉ prix' },
  { rank: 3, medal: '🥉', amount: 100, label: '3ᵉ prix' }
]

const STEPS = [
  { icon: '🏄', html: 'Jouez et enregistrez votre <b>meilleur score</b>.' },
  { icon: '🏆', html: 'Terminez dans le <b>Top 100</b> à la clôture, le 31 août, pour devenir finaliste.' },
  { icon: '🎯', html: 'Le <b>tirage au sort</b> du 4 septembre parmi les 100 finalistes désigne les gagnants.' }
]
</script>

<template>
  <div class="dot page">
    <div class="card page__card">
      <div class="dot__head">
        <span class="dot__badge" aria-hidden="true"><Gift :size="26" /></span>
        <div>
          <div class="pill pill--tag">🎁 La dotation</div>
          <h1>600 € de cartes cadeaux à gagner</h1>
          <p class="dot__sub">Des e-cartes cadeaux multi-enseignes, à dépenser où vous voulez.</p>
        </div>
      </div>

      <!-- Le podium : trois rangs, trois montants. -->
      <div class="podium">
        <div v-for="p in PRIZES" :key="p.rank" class="prize" :class="`prize--${p.rank}`">
          <span class="prize__medal" aria-hidden="true">{{ p.medal }}</span>
          <span class="prize__label">{{ p.label }}</span>
          <span class="prize__amount">{{ p.amount }} €</span>
          <span class="prize__kind">carte cadeau multi-enseignes</span>
        </div>
      </div>

      <p class="dot__total">
        <img class="dot__coffre" :src="imgCoffre" alt="" aria-hidden="true" />
        Soit <b>600 €</b> de cartes cadeaux mis en jeu au total.
      </p>

      <section class="dot__how">
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
          <span>
            Chacun garde une chance réelle : le classement départage les finalistes, le tirage fait le
            reste. Voir le <RouterLink to="/reglement">règlement</RouterLink> pour les modalités complètes.
          </span>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dot__head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}
.dot__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffeec4, #ffdc95);
  color: #e8620d;
  flex-shrink: 0;
}
.pill--tag {
  display: inline-block;
  background: linear-gradient(180deg, var(--coral-2), var(--coral));
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 3px 11px;
  border-radius: 999px;
  box-shadow: 0 3px 8px rgba(255, 94, 120, 0.35);
  margin-bottom: 8px;
}
.dot__head h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
}
.dot__sub {
  margin: 0;
  color: var(--ink-soft);
  font-weight: 600;
}

/* Le podium : trois cartes. Le 1er prix est mis en avant (plus grand, relief
   plus marqué), les deux autres suivent. */
.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.prize {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  padding: 20px 14px;
  border-radius: 18px;
  background: linear-gradient(165deg, #fff, #eaf7ff);
  box-shadow: 0 3px 12px rgba(43, 45, 90, 0.08);
}
.prize--1 {
  background: linear-gradient(165deg, #fff6da, #ffdc95);
  box-shadow: 0 6px 18px rgba(232, 98, 13, 0.22);
}
.prize__medal {
  font-size: 2rem;
  line-height: 1;
}
.prize__label {
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
}
.prize__amount {
  font-size: 2.1rem;
  font-weight: 900;
  color: #e8620d;
  line-height: 1;
}
.prize--1 .prize__amount {
  font-size: 2.6rem;
}
.prize__kind {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink-soft);
  line-height: 1.3;
}

.dot__total {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0 0 24px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  background: #eef4fd;
  font-weight: 600;
  color: var(--ink);
}
.dot__coffre {
  width: 44px;
  height: auto;
  flex-shrink: 0;
}

.dot__how h2 {
  font-size: 1.2rem;
  margin: 0 0 12px;
}
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
  font-size: 0.88rem;
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
.note :deep(a) {
  color: var(--sky);
  font-weight: 800;
}

/* Sur mobile le podium s'empile : trois cartes côte à côte deviennent
   illisibles sous ~440px. */
@media (max-width: 440px) {
  .podium {
    grid-template-columns: 1fr;
  }
  .prize--1 .prize__amount {
    font-size: 2.2rem;
  }
}
</style>
