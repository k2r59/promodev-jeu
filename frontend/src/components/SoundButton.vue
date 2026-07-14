<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
// Lucide : importées une par une, seules celles-ci entrent dans le bundle.
import { Volume2, Volume1, VolumeX, Music, Bell, Vibrate } from 'lucide-vue-next'
import { useAudioStore } from '../stores/audio.js'

const audio = useAudioStore()

// L'icône reflète le volume réel : barré si coupé, une onde si bas, deux sinon.
const icon = computed(() => {
  if (audio.muted) return VolumeX
  return audio.musicVol < 0.35 ? Volume1 : Volume2
})
const open = ref(false)
const wrap = ref(null)

function onDocClick(e) {
  if (open.value && wrap.value && !wrap.value.contains(e.target)) open.value = false
}
function onKeydown(e) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="wrap" class="snd">
    <button
      class="snd__btn"
      :class="{ 'snd__btn--off': audio.muted }"
      :title="audio.muted ? 'Activer le son' : 'Réglages du son'"
      :aria-label="audio.muted ? 'Activer le son' : 'Réglages du son'"
      aria-haspopup="true"
      :aria-expanded="open"
      @click="open = !open"
    >
      <component :is="icon" :size="21" :stroke-width="2.4" aria-hidden="true" />
    </button>

    <!-- Le panneau s'ouvre même son coupé : les vibrations ne suivent pas le
         mute, elles doivent rester réglables sans devoir remettre le son. -->
    <div v-if="open" class="snd__pop">
      <template v-if="audio.muted">
        <button class="snd__unmute" @click="audio.toggleMute()">
          <Volume2 :size="15" aria-hidden="true" /> Activer le son
        </button>
      </template>
      <template v-else>
        <label class="snd__row">
          <span class="snd__lbl"><Music :size="14" aria-hidden="true" /> Musique</span>
          <input v-model.number="audio.musicVol" class="snd__range" type="range" min="0" max="1" step="0.05" />
        </label>
        <label class="snd__row">
          <span class="snd__lbl"><Bell :size="14" aria-hidden="true" /> Effets</span>
          <input v-model.number="audio.sfxVol" class="snd__range" type="range" min="0" max="1" step="0.05" />
        </label>
      </template>

      <label v-if="audio.hapticsSupported" class="snd__switch">
        <span class="snd__lbl"><Vibrate :size="14" aria-hidden="true" /> Vibrations</span>
        <input v-model="audio.haptics" type="checkbox" />
      </label>

      <button v-if="!audio.muted" class="snd__mute" @click="audio.toggleMute()">
        <VolumeX :size="14" aria-hidden="true" /> Couper le son
      </button>
    </div>
  </div>
</template>

<style scoped>
.snd {
  position: relative;
  flex-shrink: 0;
}
.snd__btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--coral);
  box-shadow: var(--shadow);
  transition: transform 0.1s, box-shadow 0.15s, color 0.15s;
}
.snd__btn:hover {
  transform: translateY(-1px);
}
/* Coupé : gris et discret, pour que « le son est actif » se voie d'un coup d'œil. */
.snd__btn--off {
  color: var(--ink-soft);
}
.snd__btn:focus-visible {
  outline: 3px solid var(--sky);
  outline-offset: 2px;
}
.snd__pop {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  width: 220px;
  padding: 14px;
  background: #fff;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  animation: pop-in 0.12s ease;
}
.snd__row {
  display: block;
  margin-bottom: 12px;
  cursor: pointer;
}
.snd__lbl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--ink-soft);
  margin-bottom: 5px;
}
.snd__range {
  width: 100%;
  accent-color: var(--coral);
  cursor: pointer;
}
.snd__mute,
.snd__unmute {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  border-radius: 999px;
  background: #f3f6fc;
  color: var(--ink-soft);
  font-weight: 800;
  font-size: 0.78rem;
}
.snd__mute:hover {
  background: #ffe1e6;
  color: var(--coral);
}
.snd__unmute {
  background: linear-gradient(180deg, #ffd45e, var(--sun));
  color: #7a4b00;
  padding: 10px;
  font-size: 0.82rem;
  margin-bottom: 12px;
}
/* Interrupteur : la piste est le label lui-même, la pastille est la coche. */
.snd__switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  margin-bottom: 12px;
}
.snd__switch .snd__lbl {
  margin-bottom: 0;
}
.snd__switch input {
  appearance: none;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #dfe5f0;
  position: relative;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.snd__switch input::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(43, 45, 90, 0.3);
  transition: transform 0.15s;
}
.snd__switch input:checked {
  background: var(--coral);
}
.snd__switch input:checked::after {
  transform: translateX(16px);
}
.snd__switch input:focus-visible {
  outline: 3px solid var(--sky);
  outline-offset: 2px;
}
</style>
