<script setup>
// Formulaire inscription/connexion tel qu'il s'affiche à la place du plateau,
// dans la colonne centrale du hub. Occupe la même hauteur, sans scroll de page.
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()

const mode = ref('register') // register | login
const loading = ref(false)
const error = ref('')

const AVATARS = ['😎', '🏄', '🦩', '🐢', '🐬', '🦀', '🌴', '🍹', '⛱️', '🐙']
const form = reactive({ pseudo: '', email: '', password: '', avatar: '😎' })

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'register') {
      await auth.register({ pseudo: form.pseudo, email: form.email, password: form.password, avatar: form.avatar })
    } else {
      await auth.login({ email: form.email, password: form.password })
    }
    // Pas de navigation : le hub bascule tout seul sur le plateau.
  } catch (e) {
    error.value = e.message || 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="apanel card">
    <div class="apanel__scroll">
      <div class="apanel__head">
        <div class="apanel__emoji float">⛱️</div>
        <h1>{{ mode === 'register' ? 'Rejoindre le jeu' : 'Bon retour !' }}</h1>
        <p class="muted">
          {{
            mode === 'register'
              ? 'Créez votre compte pour jouer, gagner des badges et tenter les 1 000 €.'
              : 'Connectez-vous pour reprendre votre progression.'
          }}
        </p>
      </div>

      <div class="switch">
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Inscription</button>
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Connexion</button>
      </div>

      <form @submit.prevent="submit">
        <div v-if="error" class="error-msg">{{ error }}</div>

        <template v-if="mode === 'register'">
          <div class="field">
            <label>Pseudo</label>
            <input v-model="form.pseudo" class="input" type="text" placeholder="Ex : SurferHervé" maxlength="20" required />
          </div>
          <div class="field">
            <label>Avatar</label>
            <div class="avatars">
              <button
                v-for="a in AVATARS"
                :key="a"
                type="button"
                class="avatar-opt"
                :class="{ active: form.avatar === a }"
                @click="form.avatar = a"
              >
                {{ a }}
              </button>
            </div>
          </div>
        </template>

        <div class="field">
          <label>E-mail</label>
          <input v-model="form.email" class="input" type="email" placeholder="vous@exemple.fr" required />
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input v-model="form.password" class="input" type="password" placeholder="6 caractères minimum" minlength="6" required />
        </div>

        <button class="btn btn--lg btn--block" type="submit" :disabled="loading">
          {{ loading ? 'Un instant…' : mode === 'register' ? '🚀 Créer mon compte' : '▶ Se connecter' }}
        </button>
      </form>

      <p class="apanel__foot muted">
        {{ mode === 'register' ? 'Déjà un compte ?' : 'Pas encore de compte ?' }}
        <button class="link-btn" @click="mode = mode === 'register' ? 'login' : 'register'">
          {{ mode === 'register' ? 'Se connecter' : "S'inscrire" }}
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Occupe exactement la place du plateau. Si le formulaire dépasse (petite
   fenêtre, mode inscription), c'est lui qui défile — jamais la page. */
.apanel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}
.apanel__scroll {
  overflow-y: auto;
  padding: 22px 24px;
}
.apanel__head {
  text-align: center;
  margin-bottom: 14px;
}
.apanel__emoji {
  font-size: 2.6rem;
}
.apanel__head h1 {
  font-size: 1.6rem;
  margin: 6px 0;
}
.apanel__head p {
  margin: 0;
  font-size: 0.92rem;
}
.switch {
  display: flex;
  background: #eef1f8;
  border-radius: 999px;
  padding: 4px;
  margin-bottom: 16px;
}
.switch button {
  flex: 1;
  padding: 10px;
  border-radius: 999px;
  font-weight: 800;
  background: transparent;
  color: var(--ink-soft);
}
.switch button.active {
  background: #fff;
  color: var(--coral);
  box-shadow: var(--shadow);
}
.avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.avatar-opt {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #f3f6fc;
  font-size: 1.4rem;
  transition: transform 0.1s;
}
.avatar-opt.active {
  background: #fff;
  box-shadow: 0 0 0 3px var(--sky);
  transform: scale(1.05);
}
.apanel__foot {
  text-align: center;
  margin-top: 14px;
  margin-bottom: 0;
  font-size: 0.9rem;
}
.link-btn {
  background: none;
  color: var(--sky);
  font-weight: 800;
}
</style>
