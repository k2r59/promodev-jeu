<script setup>
// Mentions légales + politique de confidentialité, sur une seule page (pattern
// courant en France). Le texte RGPD du formulaire d'inscription pointe vers la
// section #confidentialite ci-dessous.
//
// Données société fournies par l'organisateur (PROMODEV) et renseignées ici :
// capital 321 000 €, SIRET 890 559 883 00024, TVA FR28 890 559 883, directeur
// de la publication. Cohérentes avec l'article 1 du règlement (même SIREN/RCS).
import { onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ScrollText } from 'lucide-vue-next'

const route = useRoute()

// Le scrollBehavior du routeur vise la fenêtre. Or sur grand écran c'est
// .page__card qui défile en interne (cf. styles.css), pas la fenêtre : l'ancre
// #confidentialite venue du lien RGPD n'atteindrait jamais sa section.
// scrollIntoView, lui, remonte tout seul jusqu'au bon conteneur scrollable,
// que ce soit la carte (desktop) ou la page (mobile).
onMounted(async () => {
  if (route.hash) {
    await nextTick()
    document.querySelector(route.hash)?.scrollIntoView({ block: 'start' })
  }
})
</script>

<template>
  <div class="legal page">
    <div class="card page__card">
      <div class="legal__head">
        <span class="legal__badge" aria-hidden="true"><ScrollText :size="26" /></span>
        <h1>Mentions légales</h1>
      </div>

      <section class="legal__sec">
        <h2>Éditeur du site</h2>
        <p>
          Le présent site est édité par la société <b>PROMODEV</b>, société par actions simplifiée
          immatriculée au Registre du commerce et des sociétés de Marseille sous le numéro
          <b>890&nbsp;559&nbsp;883</b>, dont le siège social est situé
          <b>276&nbsp;avenue du Douard, 13400&nbsp;Aubagne</b>.
        </p>
        <dl class="legal__dl">
          <div><dt>Capital social</dt><dd>321&nbsp;000&nbsp;€</dd></div>
          <div><dt>SIRET (siège)</dt><dd>890&nbsp;559&nbsp;883&nbsp;00024</dd></div>
          <div><dt>N° de TVA intracommunautaire</dt><dd>FR28&nbsp;890&nbsp;559&nbsp;883</dd></div>
          <div>
            <dt>Directeur de la publication</dt>
            <dd>Mathieu&nbsp;Margot, en qualité de représentant légal de la société PROMOGEST, Présidente de PROMODEV</dd>
          </div>
          <div><dt>Contact</dt><dd><a href="mailto:hello@promo.dev">hello@promo.dev</a></dd></div>
        </dl>
      </section>

      <section class="legal__sec">
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par <b>Heroku</b>, plateforme de <b>Salesforce, Inc.</b>,
          Salesforce Tower, 415 Mission Street, 3rd Floor, San Francisco, CA 94105, États-Unis —
          infrastructure opérée en région européenne.
        </p>
      </section>

      <section class="legal__sec">
        <h2>Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments du site (logiciels, graphismes, illustrations, animations, textes,
          marques et logos) est protégé par les droits de propriété intellectuelle applicables et reste
          la propriété de PROMODEV ou de ses partenaires. Toute reproduction, extraction ou utilisation
          non autorisée est interdite.
        </p>
      </section>

      <section class="legal__sec">
        <h2>Le Jeu de l'Été</h2>
        <p>
          Le Jeu de l'Été PromoDev est un jeu promotionnel gratuit et sans obligation d'achat, régi par
          son <a href="/reglement-jeu-de-l-ete-promodev-2026.pdf" target="_blank" rel="noopener">règlement</a>. Il n'est ni organisé, ni parrainé, ni
          administré par LinkedIn.
        </p>
      </section>

      <!-- Cible du lien « Politique de confidentialité » du formulaire
           d'inscription. Contenu dérivé de l'article 12 du règlement, qui fait
           foi ; en cas de divergence, c'est le règlement qui prime. -->
      <section id="confidentialite" class="legal__sec">
        <h2>Politique de confidentialité</h2>
        <p>
          <b>PROMODEV</b> agit en qualité de responsable du traitement des données collectées dans le
          cadre du Jeu.
        </p>

        <h3>Données collectées</h3>
        <ul>
          <li>les données d'identité et de contact renseignées à l'inscription (pseudo, e-mail, raison sociale, et téléphone si vous le renseignez) ;</li>
          <li>vos scores, badges, dates et heures de participation ;</li>
          <li>les informations techniques nécessaires à la sécurité du Jeu ;</li>
          <li>pour les seuls gagnants, les données nécessaires à la vérification d'identité et à la livraison du lot.</li>
        </ul>

        <h3>Finalités</h3>
        <p>
          Ces données servent à créer et gérer votre compte, enregistrer vos parties et vos scores,
          établir et afficher le classement, attribuer les badges, prévenir et détecter les fraudes,
          réaliser le tirage au sort, vérifier l'éligibilité des gagnants, les contacter et leur remettre
          leur lot, ainsi qu'à gérer les demandes et réclamations. Les champs signalés par un astérisque
          sont obligatoires pour participer.
        </p>
        <p>
          Les données collectées pour le Jeu ne sont pas utilisées à des fins de prospection commerciale
          sans le recueil préalable d'un consentement distinct, facultatif et spécifique.
        </p>

        <h3>Bases légales</h3>
        <p>
          Les traitements nécessaires à l'inscription, à la participation et à l'attribution des lots
          reposent sur l'exécution du règlement du Jeu. Ceux nécessaires à la sécurité et à la prévention
          de la fraude reposent sur l'intérêt légitime de l'Organisateur à garantir l'intégrité de
          l'opération et l'égalité entre les participants.
        </p>

        <h3>Durée de conservation</h3>
        <p>
          Les données des participants non gagnants sont conservées pendant la durée du Jeu et pendant
          trois mois au maximum après l'attribution définitive des lots, sauf nécessité de traiter une
          réclamation. Les données des gagnants sont conservées le temps nécessaire à la remise du lot et
          au respect des obligations légales, comptables et probatoires applicables.
        </p>

        <h3>Vos droits</h3>
        <p>
          Vous disposez de droits d'accès, de rectification, d'effacement, de limitation, d'opposition et
          de portabilité de vos données. Vous pouvez les exercer en écrivant à
          <a href="mailto:dpo@promo.dev">dpo@promo.dev</a>, en précisant l'objet de votre demande.
          Vous pouvez également adresser une réclamation à la Commission nationale de l'informatique et
          des libertés (CNIL).
        </p>
        <p class="legal__note">
          À noter : demander la suppression des données indispensables à votre participation avant la fin
          du Jeu entraîne votre retrait du Jeu, votre compte et votre score ne pouvant alors plus être
          maintenus.
        </p>
      </section>

      <p class="legal__foot">
        Pour les règles complètes de l'opération, consultez le
        <a href="/reglement-jeu-de-l-ete-promodev-2026.pdf" target="_blank" rel="noopener">règlement du Jeu</a>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.legal__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.legal__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(57, 182, 255, 0.14);
  color: var(--sky);
  flex-shrink: 0;
}
.legal h1 {
  margin: 0;
}
.legal__sec {
  margin-top: 26px;
}
.legal__sec h2 {
  font-size: 1.15rem;
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(57, 182, 255, 0.2);
}
.legal__sec h3 {
  font-size: 0.95rem;
  margin: 16px 0 6px;
  color: var(--ink);
}
.legal__sec p,
.legal__sec li {
  line-height: 1.55;
  color: var(--ink-soft);
}
.legal__sec ul {
  margin: 0 0 10px;
  padding-left: 20px;
}
.legal__sec li {
  margin-bottom: 4px;
}
/* Les marqueurs à compléter doivent SAUTER aux yeux : jaune franc, pour qu'on
   ne les publie pas par distraction. */
mark {
  background: #ffe58a;
  color: #6b4e00;
  padding: 1px 6px;
  border-radius: 5px;
  font-weight: 700;
  font-size: 0.9em;
}
.legal__dl {
  margin: 12px 0 0;
}
.legal__dl > div {
  display: flex;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(43, 45, 90, 0.08);
}
.legal__dl dt {
  flex: 0 0 210px;
  font-weight: 800;
  color: var(--ink);
}
.legal__dl dd {
  margin: 0;
  color: var(--ink-soft);
}
.legal__note {
  font-size: 0.86rem;
  font-style: italic;
}
.legal__foot {
  margin-top: 26px;
  padding-top: 14px;
  border-top: 2px solid rgba(57, 182, 255, 0.2);
  font-weight: 600;
}
@media (max-width: 560px) {
  .legal__dl > div {
    flex-direction: column;
    gap: 2px;
  }
  .legal__dl dt {
    flex-basis: auto;
  }
}
</style>
