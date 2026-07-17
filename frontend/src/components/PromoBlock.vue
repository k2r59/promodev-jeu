<script setup>
// La signature Promodev, partagée par la page d'aide et le formulaire
// d'inscription. Composant plutôt que copie : c'est du discours de marque, il
// changera, et il doit changer d'un seul endroit.
import { Mail, Globe } from 'lucide-vue-next'
import logoUrl from '../assets/brand/logo.png'

// Le sujet est pré-rempli : le prospect arrive du jeu, autant que ça se voie
// dans la boîte de réception plutôt que d'avoir un mail vide.
const MAILTO = 'mailto:contact@promo.dev?subject=' + encodeURIComponent("Le Jeu de l'Été — parlons de mon opération")
</script>

<template>
  <!-- Le conteneur doit être un ANCÊTRE : un élément ne peut pas interroger sa
       propre largeur pour se restyler, ce serait circulaire. D'où ce wrapper. -->
  <div class="promo-wrap">
  <section class="promo">
    <img class="promo__logo" :src="logoUrl" alt="Promodev" />
    <div class="promo__body">
      <h3>Ce jeu est une opération Promodev</h3>
      <p>
        Le Jeu de l'Été, c'est nous : conception, mécanique, lots, mise en ligne.
        Promodev imagine et opère des opérations promotionnelles — comme celle-ci,
        avec ses 500 € de cartes cadeaux à gagner.
      </p>
      <p class="promo__ask">Une question liée au Jeu de l'Été, une idée d'opération ? Parlons-en.</p>
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
</template>

<style scoped>
.promo-wrap {
  container-type: inline-size;
  container-name: promo;
}
/* Le bloc tranche avec ce qui l'entoure : c'est le seul endroit qui ne parle
   pas du jeu, il doit se lire comme une signature et non comme une section de
   plus. */
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
/* `wrap` : les deux boutons ne tiennent pas côte à côte dans une colonne
   étroite, ils passent alors l'un sous l'autre plutôt que de déborder. */
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
/* Le seuil ne vaut pas que pour le mobile : sous le formulaire, la colonne est
   étroite même sur grand écran. C'est la largeur du bloc qui décide, pas celle
   de l'écran — d'où un container query plutôt qu'un media query. */
@container promo (max-width: 460px) {
  .promo {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  .promo__actions {
    justify-content: center;
  }
}
</style>
