import { useEffect, useState } from 'react'

/**
 * Vrai quand le clavier virtuel réduit sensiblement la fenêtre visible.
 *
 * `visualViewport` suit le clavier grâce à `interactive-widget=resizes-content`
 * (voir `index.html`) : sa hauteur baisse quand il s'ouvre, remonte quand il
 * se ferme. On compare cette hauteur à celle mesurée au repos, avant tout
 * focus — un simple seuil fixe se serait trompé d'un appareil à l'autre
 * (barre d'adresse, encoche, clavier scindé…).
 *
 * Sert à alléger la mise en page d'un exercice à saisie (voir `GrammarGap`,
 * `ClozeSentence`) pendant que le clavier est ouvert : sur un clavier haut
 * (suggestions, rangée d'outils), l'espace qui reste pour la phrase peut
 * descendre sous la hauteur de quelques lignes, et chaque pixel rendu au
 * texte plutôt qu'au confort des contrôles compte.
 */
const KEYBOARD_RATIO_THRESHOLD = 0.85

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const restingHeight = viewport.height

    function onResize() {
      setOpen(viewport!.height < restingHeight * KEYBOARD_RATIO_THRESHOLD)
    }

    viewport.addEventListener('resize', onResize)
    return () => viewport.removeEventListener('resize', onResize)
  }, [])

  return open
}
