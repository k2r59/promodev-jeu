<script setup>
import { computed } from 'vue'
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import { LogOut, UserRound, Gem } from 'lucide-vue-next'
import Avatar from './components/Avatar.vue'
import { useAuthStore } from './stores/auth.js'
import { useUiStore } from './stores/ui.js'
import FeaturesBar from './components/FeaturesBar.vue'
import SoundButton from './components/SoundButton.vue'
import PlayerSheet from './components/PlayerSheet.vue'
import InstallBanner from './components/InstallBanner.vue'
import logoUrl from './assets/brand/logo.png'
import icoAccueil from './assets/nav/accueil.png'
import icoClassement from './assets/nav/classement.png'
import icoDefis from './assets/nav/defis.png'
import icoRecompenses from './assets/nav/recompenses.png'
import icoAide from './assets/nav/aide.png'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

// En portrait, l'accueil n'est pas une page qui contient un jeu : c'est le jeu.
// La barre du site s'efface donc (le HUD reprend profil, gemmes et son), et le
// bandeau d'arguments avec elle — c'est du décor de vitrine, pas de jeu.
//
// La nav du bas, elle, reste : la retirer pendant la partie ne rendait rien au
// plateau (il est borné par la largeur, pas par la hauteur — mesuré : 374x641
// dans les deux cas) et enfermait le joueur deux minutes sans porte de sortie.
//
// `isAuth` est essentiel : déconnecté, l'accueil n'est pas un jeu mais un
// formulaire. Il lui faut la barre du site (logo, son) et une page qui défile —
// enfermé dans une hauteur fixe, ses derniers champs devenaient inatteignables.
const isGameScreen = computed(() => ui.portrait && route.path === '/' && auth.isAuth)
// Le hub écarte ses colonnes jusqu'aux bords de la fenêtre : tout ce qu'elles
// ne prennent pas revient au plateau, qui est collé entre elles.
const isHub = computed(() => route.path === '/')

const nav = [
  { to: '/', label: 'Accueil', icon: icoAccueil },
  { to: '/classement', label: 'Classement', icon: icoClassement },
  { to: '/defis', label: 'Défis', icon: icoDefis },
  { to: '/recompenses', label: 'Récompenses', icon: icoRecompenses },
  { to: '/aide', label: 'Aide', icon: icoAide }
]

// 500 XP par niveau : doit rester d'accord avec recomputeLevel() côté serveur
// (models/User.js), qui fait level = floor(xp / 500) + 1.
const xpInLevel = computed(() => {
  if (!auth.user) return 0
  return auth.user.xp % 500
})
const xpPct = computed(() => Math.round((xpInLevel.value / 500) * 100))
const xpToNext = computed(() => 500 - xpInLevel.value)

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--game': isGameScreen, 'app-shell--hub': isHub }">
    <header v-if="!isGameScreen" class="topbar">
      <div class="topbar__inner container">
        <RouterLink to="/" class="brand">
          <img class="brand__logo" :src="logoUrl" alt="promodev — Le Jeu de l'Été" />
        </RouterLink>

        <!-- title/aria-label : entre 861 et 1080px le libellé est masqué en CSS
             (donc retiré aussi de l'arbre d'accessibilité), il ne reste que
             l'icône. Le nom doit rester lisible autrement. -->
        <nav class="mainnav">
          <RouterLink
            v-for="n in nav"
            :key="n.to"
            :to="n.to"
            class="mainnav__link"
            active-class="is-active"
            :title="n.label"
            :aria-label="n.label"
          >
            <img class="mainnav__ico" :src="n.icon" alt="" aria-hidden="true" />
            <span class="mainnav__lbl">{{ n.label }}</span>
          </RouterLink>
        </nav>

        <div class="topbar__right">
          <SoundButton />
          <template v-if="auth.isAuth">
            <!-- Deux formes du même profil, choisies en CSS. Sur mobile la puce
                 complète ne rentre pas (mesuré : 31px de trop sur un écran de
                 320), et son niveau/XP y étaient de toute façon masqués. La
                 fiche, elle, tient dans un avatar et rend tout au tap. -->
            <PlayerSheet class="topbar__player" />
            <div class="userchip">
              <div class="userchip__avatar"><Avatar :value="auth.user.avatar" /></div>
              <div class="userchip__info">
                <div class="userchip__name">{{ auth.user.pseudo }}</div>
                <!-- Le niveau porte le reste à parcourir : la barre seule ne
                     dit qu'une proportion, jamais un nombre. Le header n'a pas
                     la place d'une ligne de plus, d'où la parenthèse. -->
                <div class="userchip__level">
                  Niveau {{ auth.user.level }} <span class="userchip__next">· plus que {{ xpToNext }} XP</span>
                </div>
                <div class="xpbar" :title="`${xpInLevel} / 500 XP — plus que ${xpToNext} avant le niveau ${auth.user.level + 1}`">
                  <div class="xpbar__fill" :style="{ width: xpPct + '%' }"></div>
                </div>
              </div>
              <button class="userchip__logout" title="Se déconnecter" aria-label="Se déconnecter" @click="logout">
                <LogOut :size="15" aria-hidden="true" />
              </button>
            </div>
            <div class="gems">
              <Gem :size="17" aria-hidden="true" />
              <span class="gems__val">{{ auth.user.gems }}</span>
            </div>
          </template>
          <template v-else>
            <!-- Le formulaire est déjà au centre : ce bouton l'ouvre sur l'onglet
                 Connexion plutôt que de naviguer vers une page qui n'existe plus. -->
            <RouterLink :to="{ path: '/', query: { mode: 'connexion' } }" class="btn btn--sun topbar__login">
              <UserRound :size="15" aria-hidden="true" /> Se connecter
            </RouterLink>
          </template>
        </div>
      </div>
    </header>

    <main class="app-main container">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <FeaturesBar v-if="!isGameScreen" />

    <!-- Liens légaux, permanents : l'art. 15 du règlement impose qu'il reste
         consultable pendant toute l'opération. Discrets, mais toujours là.
         Masqués sur l'écran de jeu, cadré au pixel. -->
    <footer v-if="!isGameScreen" class="legalbar">
      <RouterLink to="/mentions-legales">Mentions légales</RouterLink>
      <span aria-hidden="true">·</span>
      <RouterLink to="/reglement">Règlement</RouterLink>
      <span aria-hidden="true">·</span>
      <RouterLink to="/confidentialite">Confidentialité</RouterLink>
    </footer>

    <!-- Barre de navigation mobile -->
    <nav class="bottomnav">
      <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="bottomnav__link" active-class="is-active">
        <img class="bottomnav__ico" :src="n.icon" alt="" aria-hidden="true" />
        <span class="bottomnav__lbl">{{ n.label }}</span>
      </RouterLink>
    </nav>

    <!-- Invite d'installation. Elle se tait d'elle-même hors mobile/tablette,
         une fois installée, ou si on l'a refusée.
         Jamais sur l'écran de jeu : il est cadré au pixel sur la fenêtre, et le
         bandeau viendrait recouvrir le dock des boosters. Les autres écrans
         défilent, il y a la place. -->
    <InstallBanner v-if="!isGameScreen" />

    <!-- Un plateau dans 390px de haut n'a aucun sens : sur l'accueil (donc le
         jeu), on demande la rotation plutôt que de livrer un écran inutilisable.
         Les autres pages, elles, se lisent très bien en paysage. -->
    <div v-if="route.path === '/'" class="rotate">
      <div class="rotate__card">
        <img class="rotate__ico" :src="icoAccueil" alt="" aria-hidden="true" />
        <b>Tournez votre téléphone</b>
        <span>Le Jeu de l'Été se joue à la verticale.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legalbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px 4px;
  font-size: 0.76rem;
  color: var(--ink-soft);
}
.legalbar a {
  color: var(--ink-soft);
  font-weight: 600;
  text-decoration: none;
}
.legalbar a:hover {
  color: var(--sky);
  text-decoration: underline;
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  /* La nav du bas est `fixed` : elle ne pousse rien et recouvre le bas de
     l'écran. La réserve se pose donc ici, sur le shell — et surtout pas sur
     `main` : le bandeau d'arguments vient APRÈS main, il passait donc sous la
     nav (« DE SUPER RÉCOMPENSES » coupé), pendant que les 82px réservés à
     l'intérieur de main creusaient un vide sous le dernier bloc. */
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom));
}

/* Écran de jeu portrait : le shell est cadré sur la fenêtre au pixel près, et
   `main` prend tout ce que le HUD et la nav laissent. Rien ne défile — un
   plateau qui glisse sous le doigt pendant qu'on vise une tuile est le pire
   bug tactile qui soit (d'où aussi le touch-action:none du plateau). */
@media (orientation: portrait) and (max-width: 1100px) {
  .app-shell--game {
    height: 100dvh;
    overflow: hidden;
  }
  .app-shell--game .app-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Le HUD est le tout premier élément de l'écran de jeu : rien au-dessus de
       lui ne le protège. Sous iOS, une page qu'on ne peut pas défiler (c'est le
       cas ici : html est en overflow:hidden) voit Safari escamoter sa barre du
       haut et le contenu remonte sous l'heure et la batterie. D'où l'encoche.
       Le `max(..., 10px)` n'est pas une ceinture de plus : sans encoche l'écart
       vaudrait zéro et le HUD collerait au bord. Le bas est déjà réservé par le
       padding du shell. */
    padding: max(var(--safe-top), 10px) 0 0;
  }
}

/* Desktop : l'app tient dans l'écran, sans scroll de page. Le header et le
   bandeau du bas gardent leur taille, `main` absorbe le reste (min-height:0 est
   indispensable pour qu'un enfant flex puisse rétrécir sous son contenu).
   Sous 620px de haut on repasse en page défilable : plus rien ne tiendrait.

   `orientation: landscape` sépare ce cas de l'écran de jeu ci-dessus : une
   tablette 12,9" en portrait fait 1024px de large et matcherait les deux.

   1100px et pas 861 : les trois colonnes réclament 340+340+280 plus les
   gouttières, soit ~1020px. En dessous, `justify-content: center` les faisait
   déborder des DEUX côtés — mesuré à 900px : le jeu commençait à -46px. */
@media (orientation: landscape) and (min-width: 1100px) and (min-height: 620px) {
  .app-shell {
    height: 100dvh;
    overflow: hidden;
  }
  .topbar {
    flex-shrink: 0;
  }
  /* overflow-y:auto est indispensable : sans lui, une page plus haute que la
     zone disponible (récompenses, aide…) déborderait sous le bandeau du bas au
     lieu d'y défiler. Le hub, lui, tient pile et ne défile pas. */
  .app-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  /* Sélecteur volontairement lourd (0,3,1). La réserve pour la nav du bas est
     posée par `main.container` (0,2,1), plus bas dans ce fichier : un simple
     `.app-main` (0,2,0) perdait, et le hub héritait de 60px de padding au lieu
     de 14. Autant de hauteur prise au plateau — 46px, mesurés. */
  main.app-main.container {
    padding-bottom: 14px;
  }
  /* Le hub n'est pas une page de lecture : il n'a aucune raison de s'arrêter à
     1240px. Les colonnes filent vers les bords et tout ce qu'elles ne prennent
     pas revient au plateau, qui reste collé entre elles. */
  .app-shell--hub main.app-main.container {
    max-width: none;
  }
  /* Le header se cale sur la largeur réelle du hub, que HomeView publie dans
     --hub-w : elle dépend du plateau, donc de la hauteur de la fenêtre, et
     aucune règle CSS ne saurait la deviner. Repli sur 1240 (le temps de la
     première mesure, et sur les autres pages). */
  .app-shell--hub .topbar__inner {
    max-width: var(--hub-w, 1240px);
  }
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(43, 45, 90, 0.08);
}
/* Compact par défaut : sur un écran de 390px, logo + son + profil + gemmes ne
   tiennent pas aux tailles du desktop — mesuré, ça débordait de 6px sur toutes
   les pages hors accueil. Les tailles confortables sont rétablies plus bas,
   quand la fenêtre les permet. */
.topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
  padding-bottom: 8px;
}
.brand {
  display: flex;
  align-items: center;
  line-height: 0;
  flex-shrink: 0;
}
/* La hauteur du logo est fixée plus bas, avec le reste du mobile-first. */
.brand__logo {
  width: auto;
}
/* Mobile d'abord, et c'est délibéré : la nav du haut n'apparaît QUE quand on a
   la place, la nav du bas sert partout ailleurs. L'inverse (masquer sous 860px)
   laissait une tablette 12,9" en portrait — 1024px de large — sans aucune nav :
   trop large pour la barre du bas, trop étroite pour le hub. */
.mainnav {
  display: none;
  gap: 4px;
  margin-left: auto;
}
.mainnav__link {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border-radius: 999px;
  font-weight: 800;
  color: var(--ink-soft);
  transition: background 0.15s, color 0.15s;
}
.mainnav__link:hover {
  background: rgba(57, 182, 255, 0.12);
  color: var(--ink);
}
.mainnav__link.is-active {
  background: #fff;
  color: var(--coral);
  box-shadow: var(--shadow);
}
.mainnav__ico {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex-shrink: 0;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.topbar__right :deep(.snd__btn) {
  width: 36px;
  height: 36px;
}
/* Jaune, mais fin et plat comme les autres CTA — pas le relief épais du .btn. */
.topbar__login {
  padding: 10px 22px;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 3px 10px rgba(224, 162, 0, 0.35);
}
.topbar__login:active {
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(224, 162, 0, 0.35);
}
/* Profil : la fiche sur mobile, la puce complète quand il y a la place. */
.topbar__player {
  display: block;
}
.userchip {
  display: none;
  align-items: center;
  gap: 10px;
  background: #fff;
  padding: 6px 8px 6px 6px;
  border-radius: 999px;
  box-shadow: var(--shadow);
}
.userchip__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--sky-2), var(--sky));
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  flex-shrink: 0;
}
.userchip__info {
  min-width: 92px;
}
.userchip__name {
  font-weight: 900;
  font-size: 0.95rem;
  line-height: 1.1;
}
.userchip__level {
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-weight: 700;
}
.xpbar {
  height: 6px;
  border-radius: 999px;
  background: #e7ecf5;
  overflow: hidden;
  margin-top: 3px;
}
.xpbar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sun), #ffe08a);
  transition: width 0.5s;
}
.userchip__logout {
  display: grid;
  place-items: center;
  background: #f1f3fa;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.userchip__logout:hover {
  background: #ffe1e6;
  color: var(--coral);
}
.gems {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  padding: 7px 11px;
  border-radius: 999px;
  box-shadow: var(--shadow);
  font-weight: 900;
  font-size: 0.88rem;
  color: var(--sea);
  flex-shrink: 0;
}
.gems__val {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

/* --- Nav du bas (défaut) --- */
.bottomnav {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 60;
  height: var(--nav-h);
  align-items: center;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 20px rgba(43, 45, 90, 0.12);
  padding: 0 4px var(--safe-bottom);
  justify-content: space-around;
}
.bottomnav__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 14px;
  color: var(--ink-soft);
  font-weight: 800;
  font-size: 0.68rem;
}
.bottomnav__link.is-active {
  color: var(--coral);
}
.bottomnav__ico {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.brand__logo {
  height: 34px;
}
/* Simple respiration en fin de page : la réserve pour la nav est sur le shell. */
main.container {
  padding-bottom: 24px;
}

/* Écrans étroits (iPhone SE 1re gén. 320px, Galaxy Fold fermé 344px). Le
   logo fait 138px à lui seul : à côté du bouton « SE CONNECTER », ça débordait
   de 50px. Rien n'est retiré, tout est resserré. */
@media (max-width: 399px) {
  .brand__logo {
    height: 28px;
  }
  .topbar__login {
    padding: 9px 13px;
    font-size: 0.75rem;
  }
  .topbar__inner {
    padding-left: 10px;
    padding-right: 10px;
  }
}

/* --- Nav du haut, et tailles confortables : quand la fenêtre le permet ---
   Les deux seuils sortent d'une mesure, pas d'une intuition. Barre connectée :
   logo 173 + nav 642 + profil 320 + gouttières 60.
     · avec les libellés  → 1195px
     · en icônes seules   → 885px
   D'où 900 pour la nav, et 1240 pour les libellés (soit la largeur max du
   .container : au-delà la barre ne grandit plus, donc rien ne bougera). */
@media (min-width: 900px) and (orientation: landscape) {
  .mainnav {
    display: flex;
  }
  .mainnav__lbl {
    display: none;
  }
  .bottomnav {
    display: none;
  }
  /* Nav centrée sur la barre, pas seulement dans l'espace qui reste : logo et
     bloc de droite prennent `flex: 1 1 0`, donc ils se partagent le vide à
     parts égales de chaque côté et la nav tombe au milieu exact — quelles que
     soient leurs largeurs (le logo est plus large que le profil). D'où
     l'annulation du `margin-left: auto` de .mainnav, qui la collait à droite.
     Le `min-width: auto` par défaut des éléments flex protège le logo : il ne
     sera jamais écrasé sous son contenu, la nav se décentrera avant. */
  .brand,
  .topbar__right {
    flex: 1 1 0;
  }
  .topbar__right {
    justify-content: flex-end;
  }
  .mainnav {
    margin-left: 0;
  }
  /* La nav du bas disparaît ici : plus rien à lui réserver. */
  .app-shell {
    padding-bottom: 0;
  }
  .topbar__inner {
    justify-content: flex-start;
    gap: 16px;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  .topbar__right {
    gap: 10px;
  }
  .topbar__right :deep(.snd__btn) {
    width: 42px;
    height: 42px;
  }
  .brand__logo {
    height: 46px;
  }
  .topbar__player {
    display: none;
  }
  .userchip {
    display: flex;
  }
  .userchip__info {
    display: block;
  }
  .gems {
    gap: 6px;
    padding: 9px 14px;
    font-size: 1rem;
  }
  main.container {
    padding-bottom: 60px;
  }
}

/* Assez large pour la barre complète (1195px mesurés) : les libellés reviennent. */
@media (min-width: 1240px) and (orientation: landscape) {
  .mainnav__lbl {
    display: inline;
  }
}

/* --- Rotation demandée : téléphone en paysage sur l'écran de jeu --- */
.rotate {
  display: none;
}
/* Seuil en hauteur, pas en largeur : c'est la hauteur qui manque. Une tablette
   en paysage (768px de haut) joue très bien et ne doit pas voir ce message. */
@media (orientation: landscape) and (max-height: 560px) {
  .rotate {
    display: grid;
    place-items: center;
    position: fixed;
    inset: 0;
    z-index: 100;
    background: linear-gradient(180deg, #bdeaff, #8fd8ff 60%, #ffe6b0);
    padding: 20px;
  }
  .rotate__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    background: #fff;
    border-radius: var(--radius);
    padding: 22px 28px;
    box-shadow: var(--shadow-lg);
  }
  .rotate__ico {
    width: 54px;
    height: 54px;
    object-fit: contain;
    animation: rotate-hint 2.4s ease-in-out infinite;
  }
  .rotate__card b {
    font-size: 1.15rem;
  }
  .rotate__card span {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-soft);
  }
}
@keyframes rotate-hint {
  0%,
  45%,
  100% {
    transform: rotate(0);
  }
  70%,
  90% {
    transform: rotate(-90deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rotate__ico {
    animation: none;
  }
}
</style>
