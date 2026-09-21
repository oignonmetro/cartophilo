import { useEffect } from 'react'

/**
 * Pose `--app-vh` sur `<html>` : la hauteur réelle de la fenêtre visible, en
 * pixels, tenue à jour à chaque redimensionnement (clavier virtuel compris).
 *
 * `100dvh` promet la même chose en théorie (voir `interactive-widget` dans
 * `index.html`), mais ce n'est pas garanti sur tous les navigateurs : sur
 * certains (WebView Android plus anciennes, notamment), le clavier réduit
 * la fenêtre visible (`visualViewport`) sans jamais réduire le viewport de
 * mise en page — `100dvh` reste alors figé à la hauteur pleine, alors même
 * que l'espace réellement visible a rétréci sous le clavier. Une mise en
 * page qui compte sur `100dvh` pour se redistribuer autour du clavier (voir
 * `SessionScreen`) se retrouve avec un conteneur trop grand, et le bas de
 * son contenu (le champ de saisie, les boutons) passe sous le clavier au
 * lieu de s'arrêter au-dessus.
 *
 * `visualViewport`, lui, suit toujours le clavier sur tout navigateur qui
 * l'expose : cette variable en tire une valeur de secours fiable, à
 * utiliser via `height: var(--app-vh, 100dvh)` plutôt que `h-dvh` seul, là
 * où une mise en page doit absolument tenir dans l'espace visible.
 */
export function ViewportHeightEffect() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    function apply() {
      document.documentElement.style.setProperty('--app-vh', `${viewport!.height}px`)
    }

    apply()
    viewport.addEventListener('resize', apply)
    return () => viewport.removeEventListener('resize', apply)
  }, [])

  return null
}
