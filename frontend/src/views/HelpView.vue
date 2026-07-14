<script setup>
import { TILES, BOOSTERS } from '../game/gameData.js'
</script>

<template>
  <div class="help">
    <div class="help__head card">
      <div class="float" style="font-size: 3rem">🏖️</div>
      <h1>Comment jouer ?</h1>
      <p class="muted">Le Jeu de l'Été se joue en 2 minutes chrono. Le principe est simple, la maîtrise… c'est autre chose !</p>
    </div>

    <div class="steps">
      <div class="step card">
        <span class="step__n">1</span>
        <h3>Échangez deux tuiles</h3>
        <p>Touchez (ou glissez) une tuile vers une voisine pour les permuter. Un échange n'est valide que s'il crée un alignement.</p>
      </div>
      <div class="step card">
        <span class="step__n">2</span>
        <h3>Alignez-en 3 ou plus</h3>
        <p>Alignez au moins 3 tuiles identiques, horizontalement ou verticalement, pour les faire exploser et marquer des points.</p>
      </div>
      <div class="step card">
        <span class="step__n">3</span>
        <h3>Enchaînez les combos</h3>
        <p>Quand des tuiles tombent et créent de nouveaux alignements en cascade, le multiplicateur grimpe : <b>x2, x3, x5…</b> 🔥</p>
      </div>
      <div class="step card">
        <span class="step__n">4</span>
        <h3>Maximisez votre score</h3>
        <p>Un alignement de 4+ tuiles rapporte un bonus. Visez le meilleur score avant la fin du chrono !</p>
      </div>
    </div>

    <div class="card">
      <div class="card__title"><span class="ico">🧩</span> Les tuiles de l'été</div>
      <div class="tiles-row">
        <span v-for="t in TILES" :key="t.key" class="tile-demo" :title="t.label">
          <img class="tile-demo__img" :src="t.img" :alt="t.label" />
        </span>
      </div>
    </div>

    <div class="card">
      <div class="card__title"><span class="ico">🚀</span> Les boosters</div>
      <div class="boost-list">
        <div v-for="b in Object.values(BOOSTERS)" :key="b.key" class="boost">
          <span class="boost__emoji">{{ b.emoji }}</span>
          <div>
            <b>{{ b.label }}</b>
            <p class="muted">{{ b.desc }}</p>
          </div>
        </div>
      </div>
      <p class="muted" style="margin-top: 10px">
        Sélectionnez un booster puis touchez une tuile du plateau pour l'activer. Utilisez-les au bon moment !
      </p>
    </div>

    <div class="card center cta">
      <h3>Prêt(e) ? 🌞</h3>
      <RouterLink to="/jouer" class="btn btn--lg">▶ Lancer une partie</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.help {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 18px;
  max-width: 820px;
  margin: 0 auto;
}
.help__head {
  text-align: center;
}
.help__head h1 {
  font-size: 1.9rem;
  margin: 6px 0;
}
.steps {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.step {
  position: relative;
  padding-top: 26px;
}
.step__n {
  position: absolute;
  top: -14px;
  left: 18px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--coral-2), var(--coral));
  color: #fff;
  font-weight: 900;
  box-shadow: var(--shadow);
}
.step h3 {
  margin-bottom: 6px;
}
.step p {
  color: var(--ink-soft);
  font-weight: 600;
  margin: 0;
}
.tiles-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tile-demo {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #2a9ee0, #1a72b4);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.12), inset 0 3px 0 rgba(255, 255, 255, 0.25), var(--shadow);
}
.tile-demo__img {
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
}
.boost-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.boost {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f7f9fd;
  border-radius: 14px;
  padding: 12px;
}
.boost__emoji {
  font-size: 2rem;
}
.boost p {
  margin: 2px 0 0;
  font-size: 0.82rem;
}
.cta {
  padding: 24px;
}
.cta h3 {
  margin-bottom: 12px;
  font-size: 1.3rem;
}
@media (max-width: 620px) {
  .steps {
    grid-template-columns: 1fr;
  }
}
</style>
