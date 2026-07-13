import { ofetch } from 'ofetch'

// Client HTTP basé sur ofetch. Le token est injecté dynamiquement.
let authToken = null

export function setToken(token) {
  authToken = token
}

export const api = ofetch.create({
  baseURL: '/api',
  retry: 0,
  onRequest({ options }) {
    if (authToken) {
      options.headers = { ...options.headers, Authorization: `Bearer ${authToken}` }
    }
  },
  onResponseError({ response }) {
    // Normalise le message d'erreur
    const msg = response?._data?.error || 'Une erreur est survenue.'
    throw new Error(msg)
  }
})
