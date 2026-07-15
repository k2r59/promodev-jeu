<script setup>
import imgSimple from '../assets/features/simple.png'
import imgNiveaux from '../assets/features/niveaux.png'
import imgPourTous from '../assets/features/pourtous.png'
import imgRecompenses from '../assets/features/recompenses.png'
import imgPlanteGauche from '../assets/features/plante-gauche.png'
import imgPlanteDroite from '../assets/features/plante-droite.png'

const features = [
  { img: imgSimple, title: 'Simple & fun', desc: 'Facile à jouer, difficile à lâcher !' },
  { img: imgNiveaux, title: 'Des niveaux', desc: 'Toujours plus de défis et de surprises !' },
  { img: imgPourTous, title: 'Pour tous', desc: 'Jouez quand vous voulez, où vous voulez !' },
  { img: imgRecompenses, title: 'De super récompenses', desc: 'Des points, des badges et peut-être 1 000 € de remise à la clé !' }
]
</script>

<template>
  <aside class="fbar">
    <!-- Décor : déborde au-dessus du bandeau, ne doit jamais capter le clic. -->
    <img class="fbar__plant fbar__plant--left" :src="imgPlanteGauche" alt="" aria-hidden="true" />
    <img class="fbar__plant fbar__plant--right" :src="imgPlanteDroite" alt="" aria-hidden="true" />
    <div class="fbar__inner container">
      <div v-for="f in features" :key="f.title" class="fitem">
        <img class="fitem__img" :src="f.img" alt="" aria-hidden="true" />
        <div class="fitem__body">
          <b class="fitem__title">{{ f.title }}</b>
          <span class="fitem__desc">{{ f.desc }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Bandeau collé en bas du viewport : le contenu défile dessous et reste
   atteignable quand la fenêtre est trop courte (il rejoint sa place en fin de page). */
.fbar {
  position: sticky;
  bottom: 0;
  z-index: 40;
  margin-top: auto;
  flex-shrink: 0;
  /* Même sable qu'avant, juste un voile de transparence — assorti aux cartes.
     Le `backdrop-filter` va avec : sans lui, le contenu qui défile dessous
     resterait lisible par transparence et brouillerait les libellés. */
  background: linear-gradient(180deg, rgba(251, 238, 208, 0.88), rgba(242, 220, 172, 0.88));
  backdrop-filter: blur(6px);
  border-top: 1px solid rgba(190, 150, 90, 0.35);
  box-shadow: 0 -6px 22px rgba(43, 45, 90, 0.13);
}
/* Les plantes débordent au-dessus du bandeau, aux deux extrémités. Elles passent
   au-dessus du fond sable mais sous les textes, qui restent lisibles. */
.fbar__plant {
  position: absolute;
  bottom: 0;
  z-index: 1;
  height: 132px;
  width: auto;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 4px 6px rgba(120, 90, 40, 0.25));
}
.fbar__plant--left {
  left: 0;
}
.fbar__plant--right {
  right: 0;
}
.fbar__inner {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  padding-top: 4px;
  padding-bottom: 4px;
}
.fitem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 18px;
  min-width: 0;
}
.fitem + .fitem {
  border-left: 1px solid rgba(190, 150, 90, 0.4);
}
.fitem__img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 3px 4px rgba(120, 90, 40, 0.28));
}
.fitem__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.fitem__title {
  font-size: 0.95rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--ink);
}
.fitem__desc {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
  color: #4a4f7d;
}

/* Partout où la nav du bas est affichée, elle occupe déjà le bas de l'écran : le
   bandeau redevient un bloc normal en fin de page, sur 2 colonnes. S'il restait
   collant, il se glisserait SOUS la nav (`sticky bottom: 0` se cale sur le bas
   du viewport, pas sur le padding du shell). Le seuil doit donc rester identique
   à celui de la nav dans App.vue. */
@media (max-width: 899px), (orientation: portrait) and (max-width: 1100px) {
  .fbar {
    position: static;
    box-shadow: none;
  }
  .fbar__plant {
    display: none;
  }
  .fbar__inner {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }
  .fitem {
    padding: 8px 10px;
  }
  .fitem:nth-child(odd) {
    border-left: none;
  }
  .fitem__img {
    width: 48px;
    height: 48px;
  }
}
@media (max-width: 460px) {
  .fbar__inner {
    grid-template-columns: 1fr;
  }
  .fitem {
    border-left: none !important;
  }
}
</style>
