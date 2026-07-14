<script setup>
import { TILES, BOOSTERS } from '../game/gameData.js'
import imgPalmier from '../assets/nav/accueil.png'
</script>

<template>
  <div class="help page">
    <div class="card page__card">
    <div class="help__head">
      <h1>Comment jouer ?</h1>
      <p class="muted">Le Jeu de l'Été se joue en 2 minutes chrono. Le principe est simple, la maîtrise… c'est autre chose !</p>
    </div>

    <!-- Les étapes sont numérotées parce qu'elles se suivent vraiment : on
         échange, on aligne, ça cascade, on marque. L'ordre porte du sens. -->
    <ol class="steps">
      <li class="step">
        <span class="step__n">1</span>
        <div class="step__body">
          <h3>Échangez deux tuiles</h3>
          <p>Touchez (ou glissez) une tuile vers une voisine pour les permuter. Un échange n'est valide que s'il crée un alignement.</p>
        </div>
      </li>
      <li class="step">
        <span class="step__n">2</span>
        <div class="step__body">
          <h3>Alignez-en 3 ou plus</h3>
          <p>Alignez au moins 3 tuiles identiques, horizontalement ou verticalement, pour les faire exploser et marquer des points.</p>
        </div>
      </li>
      <li class="step">
        <span class="step__n">3</span>
        <div class="step__body">
          <h3>Enchaînez les combos</h3>
          <p>Quand des tuiles tombent et créent de nouveaux alignements en cascade, le multiplicateur grimpe : <b>x2, x3, x5…</b></p>
        </div>
      </li>
      <li class="step">
        <span class="step__n">4</span>
        <div class="step__body">
          <!-- Le bonus se déclenche sur le nombre de tuiles détruites d'un coup
               (engine : matches.size >= 4), pas sur la longueur d'un alignement :
               deux alignements de 3 simultanés le déclenchent aussi. -->
          <h3>Maximisez votre score</h3>
          <p>Faire exploser 4 tuiles ou plus d'un seul coup rapporte un bonus. Visez le meilleur score avant la fin du chrono !</p>
        </div>
      </li>
    </ol>

    <section class="block">
      <div class="card__title"><img class="ico ico--img" :src="imgPalmier" alt="" aria-hidden="true" /> Les tuiles de l'été</div>
      <div class="tiles-row">
        <span v-for="t in TILES" :key="t.key" class="tile-demo" :title="t.label">
          <img class="tile-demo__img" :src="t.img" :alt="t.label" />
        </span>
      </div>
    </section>

    <section class="block">
      <div class="card__title"><img class="ico ico--img" :src="imgPalmier" alt="" aria-hidden="true" /> Les boosters</div>
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
    </section>

    <section class="block center cta">
      <h3>Prêt(e) ?</h3>
      <RouterLink to="/" class="btn btn--lg">Lancer une partie</RouterLink>
    </section>
    </div>
  </div>
</template>

<style scoped>
.help {
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
}
/* Anciennes .card devenues des sections du bloc unique. */
.block {
  margin-top: 18px;
}
/* La ligne de texte est bornée : centrée sur toute la largeur, elle donnait des
   lignes trop longues et une découpe hasardeuse. */
.help__head {
  text-align: center;
  margin-bottom: 18px;
}
.help__head h1 {
  font-size: 1.7rem;
  margin: 2px 0 8px;
}
.help__head p {
  max-width: 46ch;
  margin: 0 auto;
  font-weight: 600;
  line-height: 1.5;
}
/* Chaque étape est une carte, et la pastille se pose DANS la carte, à gauche du
   titre. Elle était en `position: absolute` par-dessus le bloc — ça tenait tant
   que chaque étape avait son propre fond blanc, mais depuis que la page est un
   bloc unique elle flottait par-dessus le titre. */
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: #f7f9fd;
}
.step__n {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--coral-2), var(--coral));
  color: #fff;
  font-weight: 900;
  font-size: 0.9rem;
  box-shadow: 0 2px 6px rgba(255, 94, 120, 0.4);
}
.step__body {
  min-width: 0;
}
.step h3 {
  margin-bottom: 4px;
  font-size: 1rem;
}
.step p {
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1.45;
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
/* min() : même raison que la grille des défis — un minimum rigide déborde dès
   que la colonne est plus étroite que lui. */
.boost-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
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
