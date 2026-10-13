/**
 * Remplace `[start, end)` d'un champ de texte par `text`, de façon que Ctrl+Z
 * défasse l'insertion. `execCommand('insertText')` passe par la pile
 * d'annulation du navigateur, que ni `setRangeText` ni une nouvelle `value`
 * (React) n'alimentent : la mise en forme ajoutée par un bouton ou un
 * raccourci n'aurait sinon aucune étape à annuler. L'événement `input` que la
 * commande envoie suffit à faire suivre l'état de React ; le repli, pour un
 * navigateur qui la refuse, l'envoie lui-même.
 */
export function replaceRange(el: HTMLTextAreaElement | HTMLInputElement, start: number, end: number, text: string) {
  el.focus()
  el.setSelectionRange(start, end)
  if (document.execCommand('insertText', false, text)) return
  el.setRangeText(text, start, end, 'end')
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
