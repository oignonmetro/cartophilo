import { useEffect } from 'react'

const NBSP = ' '

/** Un guillemet s'ouvre en début de champ, après une espace ou une ouvrante ; sinon il se ferme. */
function opens(before: string): boolean {
  return before === '' || /[\s([{«‹⁠]$/.test(before)
}

/**
 * La touche `"` écrit des guillemets français, dans le bon sens et collés à
 * leur contenu d'une espace insécable (`« ` et ` »`) ; sur une
 * sélection, elle l'entoure. Un seul écouteur au niveau du document couvre
 * tous les champs de texte de l'éditeur, boîtes de dialogue comprises.
 *
 * `setRangeText` ne passe pas par le setter de `value` que React surveille :
 * l'événement `input` envoyé ensuite est donc bien vu comme un changement.
 */
export function useFrenchQuotes() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '"' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
      const el = event.target
      if (!(el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type === 'text'))) return
      const start = el.selectionStart
      const end = el.selectionEnd
      if (start === null || end === null) return
      event.preventDefault()

      const { value } = el
      const before = value.slice(0, start)
      let text: string
      let from = start
      if (start !== end) {
        text = `«${NBSP}${value.slice(start, end)}${NBSP}»`
      } else if (opens(before)) {
        text = `«${NBSP}`
      } else {
        // Une espace déjà tapée avant le guillemet fermant devient l'insécable.
        if (/[  ]$/.test(before)) from = start - 1
        text = `${NBSP}»`
      }
      el.setRangeText(text, from, end, 'end')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}
