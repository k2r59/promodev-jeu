<script setup>
import { TILES, BOOSTERS } from '../game/gameData.js'
import { Mail, Info, Globe } from 'lucide-vue-next'
import imgPalmier from '../assets/nav/accueil.png'
import logoUrl from '../assets/brand/logo.png'

// Le sujet est pré-rempli : le prospect arrive de l'aide du jeu, autant que
// ça se voie dans la boîte de réception plutôt que d'avoir un mail vide.
const MAILTO = 'mailto:contact@promo.dev?subject=' + encodeURIComponent("Le Jeu de l'Été — parlons de mon opération")
</script>

<template>
  <div class="help page">
    <div class="card page__card">
    <div class="help__head">
      <h1>Comment jouer ?</h1>
      <!-- Les deux mots en couleur portent l'opposition de la phrase (facile
           d'accès / dur à maîtriser). Colorer plus les noierait. -->
      <p class="help__intro">
        Le Jeu de l'Été se joue en 2 minutes chrono.<br />
        Le principe est <b class="hl hl--sky">simple</b>, la maîtrise… c'est <b class="hl hl--coral">autre chose</b> !
      </p>
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
          <p>Quand des tuiles tombent et créent de nouveaux alignements en cascade, le multiplicateur grimpe :<br /><b class="hl hl--pink">x2, x3, x5…</b></p>
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
        <!-- Chaque booster porte sa teinte (classe sur la clé, pas sur l'index :
             l'ordre de BOOSTERS peut changer, pas les clés). -->
        <div v-for="b in Object.values(BOOSTERS)" :key="b.key" class="boost" :class="`boost--${b.key}`">
          <span class="boost__emoji">{{ b.emoji }}</span>
          <div>
            <b class="boost__label">{{ b.label }}</b>
            <p>{{ b.desc }}</p>
          </div>
        </div>
      </div>
      <p class="note">
        <Info :size="16" class="note__ico" aria-hidden="true" />
        <span>Sélectionnez un booster puis touchez une tuile du plateau pour l'activer.<br />Utilisez-les au bon moment !</span>
      </p>
    </section>

    <section class="block center cta">
      <h3>Prêt(e) ?</h3>
      <RouterLink to="/" class="btn btn--lg">Lancer une partie</RouterLink>
    </section>

    <!-- Placé APRÈS le CTA de jeu, volontairement : le visiteur est là pour
         jouer, on ne lui coupe pas l'élan avec un discours commercial. Mais
         c'est bien l'objet de l'opération (le champ Société à l'inscription
         qualifie le prospect), donc ça ne peut pas être absent non plus. -->
    <section class="block promo">
      <img class="promo__logo" :src="logoUrl" alt="Promodev" />
      <div class="promo__body">
        <h3>Ce jeu est une opération Promodev</h3>
        <p>
          Le Jeu de l'Été, c'est nous : conception, mécanique, lots, mise en ligne.
          Promodev imagine et opère des opérations promotionnelles — et le grand prix
          de celle-ci, ce sont 1 000 € de remise sur la vôtre.
        </p>
        <p class="promo__ask">Une idée d'opération ? Parlons-en.</p>
        <div class="promo__actions">
          <a class="btn btn--sea promo__cta" :href="MAILTO">
            <Mail :size="16" aria-hidden="true" /> contact@promo.dev
          </a>
          <!-- `noopener` : sans lui, la page ouverte garde une poignée sur la
               nôtre via window.opener. `noreferrer` va avec par habitude. -->
          <a class="btn btn--ghost promo__cta" href="https://promo.dev" target="_blank" rel="noopener noreferrer">
            <Globe :size="16" aria-hidden="true" /> Visiter le site
          </a>
        </div>
      </div>
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
/* Anciennes .card devenues des sections du bloc unique. Depuis que les cartes
   ont leur propre ombre, 18px les faisaient se toucher : il faut de quoi voir
   où une section finit. */
.block {
  margin-top: 34px;
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
.help__intro {
  max-width: 52ch;
  margin: 0 auto;
  color: var(--ink-soft);
  font-weight: 600;
  line-height: 1.5;
}
/* Les mots mis en avant dans les textes. `hl` seul ne colore rien : c'est la
   variante qui décide, pour qu'un highlight sans teinte se voie tout de suite. */
.hl--sky {
  color: var(--sky);
}
.hl--coral {
  color: var(--coral);
}
.hl--pink {
  color: var(--pink);
}
/* Titres de section : palmier, puis un trait blanc qui file jusqu'au bord. Le
   dégradé vers le transparent évite que le trait s'arrête net dans le vide. */
.card__title::after {
  content: '';
  flex: 1;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0));
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
/* Cartes blanches détachées du panneau, et non des aplats gris posés dessus :
   c'est l'ombre qui fait la carte, le panneau étant lui-même translucide. */
.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-sm);
  background: #fff;
  box-shadow: 0 6px 18px rgba(43, 45, 90, 0.09);
}
/* Une couleur par étape. Les teintes vivent sur .step et non sur .step__n :
   nth-child porte sur l'élément de liste, et la pastille n'est pas un enfant
   direct de <ol>. Chaque étape se distingue ainsi au premier coup d'œil. */
.step:nth-child(1) {
  --n1: var(--coral-2);
  --n2: var(--coral);
  --nsh: rgba(255, 94, 120, 0.45);
}
.step:nth-child(2) {
  --n1: #ffb057;
  --n2: #ff9022;
  --nsh: rgba(255, 144, 34, 0.45);
}
.step:nth-child(3) {
  --n1: #5ada8d;
  --n2: var(--leaf);
  --nsh: rgba(46, 204, 113, 0.45);
}
.step:nth-child(4) {
  --n1: #bb86e8;
  --n2: #a55eea;
  --nsh: rgba(165, 94, 234, 0.45);
}
.step__n {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--n1), var(--n2));
  color: #fff;
  font-weight: 900;
  font-size: 0.9rem;
  box-shadow: 0 2px 6px var(--nsh);
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
  justify-content: center;
  gap: 12px;
}
/* Pastilles blanches ombrées, et non les tuiles bleues du plateau : ici on
   montre le catalogue, pas le jeu. Le fond clair laisse lire l'illustration. */
.tile-demo {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #fff;
  box-shadow: 0 5px 14px rgba(43, 45, 90, 0.12);
}
.tile-demo__img {
  width: 78%;
  height: 78%;
  object-fit: contain;
}
/* min() : même raison que la grille des défis — un minimum rigide déborde dès
   que la colonne est plus étroite que lui. */
.boost-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 12px;
}
/* Chaque booster a sa teinte : fond très pâle + bordure franche + titre coloré.
   Les trois couleurs sont celles qu'ils ont déjà sur le plateau — le joueur les
   reconnaît d'ici. */
.boost {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 14px;
  padding: 14px;
  background: var(--b-bg);
  border: 1.5px solid var(--b-bd);
}
.boost--bombe {
  --b-bg: #fff1f5;
  --b-bd: #ffc2d2;
  --b-ink: #e8365c;
}
.boost--eclair {
  --b-bg: #fff9e8;
  --b-bd: #ffe08a;
  --b-ink: #d18f00;
}
.boost--vague {
  --b-bg: #eff7ff;
  --b-bd: #b6dffb;
  --b-ink: #1a8fd0;
}
.boost__label {
  color: var(--b-ink);
  font-size: 1.05rem;
}
.boost__emoji {
  font-size: 2rem;
  flex-shrink: 0;
}
.boost p {
  margin: 2px 0 0;
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.82rem;
  line-height: 1.35;
}
/* Note d'aide, pas d'alerte : la pastille bleue reprend le ton du site. */
.note {
  display: flex;
  align-items: start;
  justify-content: center;
  gap: 8px;
  margin: 14px 0 0;
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.82rem;
  line-height: 1.4;
  text-align: center;
}
.note__ico {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--sky);
}
/* Pas de padding propre : il s'ajoutait au margin-top de .block et creusait un
   trou de ~58px au-dessus de « Prêt(e) ? ». L'écart entre les sections est déjà
   porté par .block, une seule source suffit. */
.cta {
  padding: 0;
}
.cta h3 {
  margin-bottom: 10px;
  font-size: 1.3rem;
}
/* Le bloc de la marque tranche avec les sections grises du dessus : c'est le
   seul endroit de la page qui ne parle pas du jeu, il doit se lire comme une
   signature et non comme une étape de plus. */
.promo {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #eaf6ff, #fff6e3);
  border: 1px solid rgba(57, 182, 255, 0.22);
}
.promo__logo {
  width: 96px;
  height: auto;
  flex-shrink: 0;
}
.promo__body {
  min-width: 0;
}
.promo h3 {
  margin: 0 0 6px;
  font-size: 1.05rem;
}
.promo p {
  margin: 0;
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1.45;
}
.promo__ask {
  margin-top: 8px !important;
  color: var(--ink) !important;
  font-weight: 800 !important;
}
/* `wrap` : les deux boutons ne tiennent pas côte à côte dans la colonne étroite
   d'un mobile, ils passent alors l'un sous l'autre plutôt que de déborder. */
.promo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.promo__cta {
  padding: 10px 18px;
  font-size: 0.9rem;
}
@media (max-width: 620px) {
  .steps {
    grid-template-columns: 1fr;
  }
  /* Le logo passe au-dessus : à 96px de large il ne laissait plus qu'une
     colonne de texte trop étroite pour être lue confortablement. */
  .promo {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  /* Le bloc passe en centré : des boutons restés à gauche sous un texte centré
     se verraient comme un décrochage. */
  .promo__actions {
    justify-content: center;
  }
}
</style>
