<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { Hourglass, Trophy, CalendarDays, TrendingUp, Calendar, Crown, Lightbulb, Users } from 'lucide-vue-next'
import Avatar from '../components/Avatar.vue'
import { api } from '../api/client.js'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const period = ref('week')
const board = ref([])
const me = ref(null)
const operationEnd = ref(null)
const loading = ref(true)

// L'icône fait partie de l'onglet : à quatre onglets serrés, elle se lit avant
// le mot et distingue « Jour » de « Mois » d'un coup d'œil.
const tabs = [
  { key: 'day', label: 'Jour', icon: CalendarDays },
  { key: 'week', label: 'Semaine', icon: TrendingUp },
  { key: 'month', label: 'Mois', icon: Calendar },
  { key: 'all', label: 'Général', icon: Crown }
]

async function load() {
  loading.value = true
  try {
    const res = await api('/leaderboard', { query: { period: period.value, limit: 100, me: auth.user?.id } })
    board.value = res.board
    me.value = res.me
    operationEnd.value = res.operationEnd
  } catch (e) {
    board.value = []
  } finally {
    loading.value = false
  }
}

const daysLeft = computed(() => {
  if (!operationEnd.value) return null
  const diff = new Date(operationEnd.value) - new Date()
  return Math.max(0, Math.ceil(diff / 86400000))
})

watch(period, load)
onMounted(load)
</script>

<template>
  <div class="lb page">
    <div class="card page__card">
      <div class="lb__head">
        <span class="lb__badge" aria-hidden="true"><Trophy :size="30" /></span>
        <div class="lb__intro">
          <h1>Classement</h1>
          <p>
            Seul votre <b>meilleur score</b> est conservé. En fin d'opération, les
            <b>100 meilleurs</b> deviennent finalistes pour le tirage au sort des 500 € de cartes cadeaux !
          </p>
        </div>
        <!-- Le décompte quitte le paragraphe : noyé dedans, il se lisait comme
             une incise alors que c'est l'information qui presse. -->
        <span v-if="daysLeft !== null" class="pill pill--days">
          <Hourglass :size="14" aria-hidden="true" /> {{ daysLeft }} jours restants
        </span>
      </div>

      <div class="tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="{ active: period === t.key }"
          role="tab"
          :aria-selected="period === t.key"
          @click="period = t.key"
        >
          <component :is="t.icon" :size="15" aria-hidden="true" />
          {{ t.label }}
        </button>
      </div>

      <div v-if="loading" class="muted center" style="padding: 30px">Chargement du classement…</div>
      <!-- Un classement vide est le premier écran de la plupart des visiteurs :
           il doit donner envie de jouer, pas constater une absence. -->
      <div v-else-if="!board.length" class="empty">
        <span class="empty__art" aria-hidden="true"><Trophy :size="52" /></span>
        <p class="empty__title">Aucun score pour cette période.<br />À vous de jouer ! 🎉</p>
        <p class="empty__hint">
          <span class="empty__ico" aria-hidden="true"><Lightbulb :size="18" /></span>
          <span>Jouez, améliorez votre score et grimpez dans le classement pour tenter de faire partie des <b>100 meilleurs</b> !</span>
        </p>
      </div>
      <div v-else class="lb-list">
        <div
          v-for="row in board"
          :key="row.userId"
          class="row"
          :class="{ 'row--me': String(row.userId) === String(auth.user?.id), 'row--finalist': row.finalist }"
        >
          <span class="row__rank" :data-rank="row.rank">
            <template v-if="row.rank <= 3">{{ ['🥇', '🥈', '🥉'][row.rank - 1] }}</template>
            <template v-else>{{ row.rank }}</template>
          </span>
          <span class="row__avatar"><Avatar :value="row.avatar" /></span>
          <span class="row__name">
            {{ row.pseudo }}
            <em v-if="String(row.userId) === String(auth.user?.id)">(vous)</em>
            <span v-if="row.finalist" class="finalist-tag">finaliste</span>
          </span>
          <span class="row__combo" v-if="row.maxCombo">🔥x{{ row.maxCombo }}</span>
          <span class="row__score">{{ row.score.toLocaleString('fr-FR') }} ⭐</span>
        </div>
      </div>

      <div v-if="me && !board.some((b) => String(b.userId) === String(auth.user?.id))" class="me-banner">
        <span class="row__rank">{{ me.rank }}</span>
        <span class="row__avatar"><Avatar :value="me.avatar" /></span>
        <span class="row__name">{{ me.pseudo }} <em>(vous)</em></span>
        <span class="row__score">{{ me.score.toLocaleString('fr-FR') }} ⭐</span>
      </div>
      <div v-else-if="!auth.isAuth" class="signin">
        <span class="signin__ico" aria-hidden="true"><Users :size="20" /></span>
        <p class="signin__txt">
          <RouterLink :to="{ path: '/', query: { mode: 'connexion' } }" class="link">Connectez-vous</RouterLink>
          pour apparaître dans le classement.
        </p>
        <RouterLink :to="{ path: '/', query: { mode: 'connexion' } }" class="btn signin__cta">Se connecter</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lb {
  max-width: 780px;
  margin: 0 auto;
  width: 100%;
}
/* Trois colonnes : la pastille, le texte qui prend la place restante, le
   décompte calé à droite. `align-items: start` — le décompte se pose en haut,
   à hauteur du titre, et non au milieu d'un paragraphe de deux lignes. */
.lb__head {
  display: flex;
  align-items: start;
  gap: 16px;
  margin-bottom: 18px;
}
.lb__badge {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: #fff;
  color: var(--sun);
  box-shadow: 0 6px 18px rgba(43, 45, 90, 0.12);
}
.lb__intro {
  flex: 1;
  min-width: 0;
}
.lb__head h1 {
  font-size: 1.8rem;
  margin-bottom: 6px;
}
.lb__intro p {
  margin: 0;
  color: var(--ink-soft);
  font-weight: 600;
  line-height: 1.5;
}
.pill--days {
  flex-shrink: 0;
  background: #fff;
  color: var(--sea);
  box-shadow: 0 3px 10px rgba(43, 45, 90, 0.1);
  white-space: nowrap;
}
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: #eef3fa;
  border-radius: 999px;
  padding: 5px;
}
.tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 8px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.9rem;
  background: transparent;
  color: var(--ink-soft);
  transition: background 0.15s, color 0.15s;
}
.tabs button:hover:not(.active) {
  color: var(--ink);
}
/* Bleu de marque, comme les onglets du hub : c'est le même objet, il ne doit
   pas changer de couleur d'un écran à l'autre. */
.tabs button.active {
  background: linear-gradient(180deg, var(--sky-2), var(--sky));
  color: #fff;
  box-shadow: 0 3px 10px rgba(57, 182, 255, 0.4);
}
/* --- Classement vide --- */
.empty {
  text-align: center;
  padding: 34px 18px;
  border-radius: var(--radius-sm);
  background: #fff;
  box-shadow: 0 6px 18px rgba(43, 45, 90, 0.08);
}
.empty__art {
  display: grid;
  place-items: center;
  width: 108px;
  height: 108px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: radial-gradient(circle, #eaf4ff 0%, #f7fbff 70%);
  color: var(--sun);
}
.empty__title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 900;
  line-height: 1.35;
}
/* La consigne est une aide, pas un titre : elle reste discrète et bornée en
   largeur, sinon la ligne file sur toute la carte et se lit mal. */
.empty__hint {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 46ch;
  margin: 18px auto 0;
  text-align: left;
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.88rem;
  line-height: 1.45;
}
.empty__ico {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eaf4ff;
  color: var(--sky);
}
.lb-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 14px;
}
.row:nth-child(odd) {
  background: #f7f9fd;
}
.row--me {
  background: linear-gradient(90deg, #fff0f6, #ffe6f0) !important;
  box-shadow: inset 0 0 0 2px var(--coral);
}
.row--finalist .row__name {
  color: var(--sea);
}
.row__rank {
  width: 34px;
  text-align: center;
  font-weight: 900;
  font-size: 1rem;
  flex-shrink: 0;
}
/* Dimensionné depuis que l'avatar peut être une image (cf. lb-avatar du hub).
   Le font-size reste le repli des avatars emoji d'avant. */
.row__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 1.5rem;
}
.row__name {
  flex: 1;
  font-weight: 800;
}
.row__name em {
  color: var(--coral);
  font-style: normal;
  margin-left: 4px;
}
.finalist-tag {
  display: inline-block;
  background: #eaf7ff;
  color: var(--sea);
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  margin-left: 6px;
}
.row__combo {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--coral);
}
.row__score {
  font-weight: 900;
  color: var(--sea);
  white-space: nowrap;
}
.me-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-top: 12px;
  border-radius: 14px;
  background: linear-gradient(90deg, #fff0f6, #ffe6f0);
  box-shadow: inset 0 0 0 2px var(--coral);
}
.link {
  color: var(--sky);
  font-weight: 800;
}
/* Invitation à se connecter : une carte à part, pas une ligne de texte perdue
   sous la liste. Le lien dans la phrase ET le bouton mènent au même endroit —
   le bouton porte l'action, le lien garde la phrase lisible. */
.signin {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  background: #f2f8ff;
  border: 1px solid #dceafd;
}
.signin__ico {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #dfeeff;
  color: var(--sky);
}
.signin__txt {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.92rem;
}
.signin__cta {
  flex-shrink: 0;
  padding: 11px 20px;
  font-size: 0.9rem;
  background: linear-gradient(180deg, var(--sky-2), var(--sky));
  box-shadow: 0 4px 0 #1f8fd0, var(--shadow);
}
.signin__cta:active {
  box-shadow: 0 1px 0 #1f8fd0, var(--shadow);
}
/* --- Colonnes étroites -----------------------------------------------------
   Trois choses cèdent, dans cet ordre : le décompte quitte la ligne du titre,
   les onglets perdent leur icône, puis tout se resserre. */
@media (max-width: 560px) {
  /* `flex: 1 1 220px` sur le texte, et non `flex: 1` : avec une base de 0 il
     se serait comprimé à l'infini pour garder le décompte sur la ligne, et
     c'est le titre qui aurait été haché. Là, sous 220px de place, c'est le
     décompte qui passe à la ligne — il garde sa largeur naturelle. */
  .lb__head {
    flex-wrap: wrap;
    gap: 12px;
  }
  .lb__intro {
    flex: 1 1 220px;
  }
  .lb__badge {
    width: 52px;
    height: 52px;
  }
  .lb__badge :deep(svg) {
    width: 24px;
    height: 24px;
  }
  .lb__head h1 {
    font-size: 1.5rem;
  }
  .lb__intro p {
    font-size: 0.9rem;
  }
  /* La carte n'a plus la largeur pour trois colonnes : le bouton passe dessous
     sur toute la largeur, plutôt que d'écraser le texte. */
  .signin {
    flex-wrap: wrap;
  }
  .signin__txt {
    flex: 1 1 160px;
  }
  .signin__cta {
    width: 100%;
  }
  .empty {
    padding: 26px 14px;
  }
  .empty__art {
    width: 88px;
    height: 88px;
    margin-bottom: 14px;
  }
  .empty__title {
    font-size: 1.1rem;
  }
}
/* Quatre onglets « icône + mot » demandent ~92px chacun ; sous 520px la carte
   n'en offre que ~80. C'est l'icône qui saute, pas le mot : elle n'était qu'un
   repère, le libellé porte le sens. */
@media (max-width: 520px) {
  .tabs button {
    gap: 0;
    padding: 10px 4px;
    font-size: 0.8rem;
  }
  .tabs button :deep(svg) {
    display: none;
  }
}
</style>
