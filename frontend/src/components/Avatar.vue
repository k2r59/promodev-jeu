<script setup>
// Seul endroit du front qui sait qu'un avatar est tantôt une image, tantôt un
// emoji (cf. avatars.js). Les six emplacements d'affichage passent par ici pour
// que le repli existe partout plutôt qu'à cinq endroits sur six.
import { computed } from 'vue'
import { avatarImg } from '../avatars.js'

const props = defineProps({
  value: { type: String, default: '' },
  // Décoratif par défaut : à côté d'un avatar il y a presque toujours le pseudo,
  // qui porte déjà l'information. Les rares appelants sans pseuda passent un alt.
  alt: { type: String, default: '' }
})

const src = computed(() => avatarImg(props.value))
</script>

<template>
  <img v-if="src" class="av" :src="src" :alt="alt" :aria-hidden="alt ? undefined : 'true'" />
  <span v-else class="av av--emo">{{ value || '😎' }}</span>
</template>

<style scoped>
/* La taille appartient à l'appelant : chaque emplacement a la sienne (puce du
   header 42px, fiche 38/60px, ligne de classement…). On remplit ce qu'on nous
   donne, d'où le 100% et le `border-radius: inherit` qui reprend l'arrondi du
   conteneur au lieu de le redéclarer. */
.av {
  width: 100%;
  height: 100%;
  border-radius: inherit;
}
img.av {
  display: block;
  object-fit: cover;
}
/* L'emoji, lui, hérite du font-size du conteneur : il ne se "remplit" pas, il se
   centre. */
.av--emo {
  display: grid;
  place-items: center;
  line-height: 1;
}
</style>
