// Le jeu ne s'installe que sur mobile et tablette. Sur desktop il reste un site
// classique : ni service worker, ni manifeste, donc aucune invite d'installation.
//
// Il faut couper les DEUX. Le manifeste seul suffit à rendre un site installable
// sur Chrome desktop, même sans service worker — c'est pour ça qu'il est injecté
// ici plutôt que déclaré en dur dans index.html.

export function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false

  // Chromium expose l'info directement, mais seulement pour les mobiles :
  // une tablette y répond false. On ne peut donc pas s'y fier seule.
  if (navigator.userAgentData?.mobile === true) return true

  // Depuis iPadOS 13, un iPad se présente comme un Mac de bureau. Le nombre de
  // points de contact est le seul indice qui le trahisse.
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|PlayBook/i.test(
    navigator.userAgent
  )
}

export function setupPwa() {
  // En dev, un service worker mettrait le hot-reload de Vite en cache : on le
  // laisse de côté.
  if (!import.meta.env.PROD || !isMobileOrTablet()) return

  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.webmanifest'
    document.head.appendChild(link)
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
