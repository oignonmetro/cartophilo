/**
 * Mêmes marqueurs que `handleFormattingShortcut` (le rappel), réutilisables
 * sur n'importe quel champ contrôlé : une phrase d'exercice n'a pas de
 * `textareaRef` dédié comme le rappel, seulement sa prop `onChange` — tout
 * ce qu'il faut est déjà sur l'événement (`currentTarget`, la sélection en
 * cours), pas besoin d'un ref par carte.
 */
export function formattingShortcut(onChange: (value: string) => void) {
  return (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return
    const key = event.key.toLowerCase()
    const marker = key === 'b' ? '**' : key === 'u' ? '__' : key === 'i' ? (event.shiftKey ? '`' : '*') : null
    if (!marker) return
    event.preventDefault()
    const el = event.currentTarget
    // `selectionStart`/`selectionEnd` ne sont nuls que pour les types d'`input`
    // qui n'ont pas de sélection (`number`, `email`…) — jamais le cas ici,
    // un champ de texte brut en a toujours une, repliée sur le curseur à
    // défaut de texte sélectionné.
    const { value } = el
    const selectionStart = el.selectionStart ?? value.length
    const selectionEnd = el.selectionEnd ?? value.length
    const selected = value.slice(selectionStart, selectionEnd)
    const next = value.slice(0, selectionStart) + marker + selected + marker + value.slice(selectionEnd)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = selectionStart + marker.length
      el.selectionEnd = selectionStart + marker.length + selected.length
    })
  }
}
