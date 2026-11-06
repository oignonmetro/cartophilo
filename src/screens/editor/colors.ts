import type { NoteColor } from '@/content/schema'

/** La palette de la barre du rappel, reprise telle quelle par les cases de tableau. */
export const COLORS = ['teal', 'violet', 'coral', 'amber', 'sky', 'yellow', 'green', 'red', 'pink', 'plum', 'blue'] as const

export const SWATCH: Record<NoteColor, string> = {
  teal: 'bg-teal',
  violet: 'bg-violet',
  coral: 'bg-coral',
  amber: 'bg-amber',
  sky: 'bg-sky',
  yellow: 'bg-yellow',
  green: 'bg-green',
  red: 'bg-red',
  pink: 'bg-pink',
  plum: 'bg-plum',
  blue: 'bg-blue',
}

const WRAPPED = /^\{(\w+)\}([\s\S]*)\{\/\1\}$/

/**
 * Colore un passage d'un texte brut (`{teal}…{/teal}`), comme le bouton de
 * couleur du rappel : sans sélection, toute la case ; un passage déjà de
 * cette couleur la perd, un passage d'une autre couleur en change. Les
 * marques qui entourent la sélection sans y être prises comptent aussi : on
 * peut sélectionner un mot coloré tel qu'il s'affiche.
 *
 * Rend la plage à remplacer, son remplacement et la sélection qui suit
 * (le passage, sans ses marques).
 */
export function toggleColor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  color: NoteColor,
): { start: number; end: number; text: string; selectStart: number; selectEnd: number } {
  let start = selectionStart
  let end = selectionEnd
  if (start === end) {
    start = value.length - value.trimStart().length
    end = value.trimEnd().length
  }
  const before = value.slice(0, start).match(/\{(\w+)\}$/)
  const after = value.slice(end).match(/^\{\/(\w+)\}/)
  if (before && after && before[1] === after[1]) {
    start -= before[0].length
    end += after[0].length
  }
  const selected = value.slice(start, end)
  const match = selected.match(WRAPPED)
  const inner = match ? match[2]! : selected
  if (match?.[1] === color) {
    return { start, end, text: inner, selectStart: start, selectEnd: start + inner.length }
  }
  const open = `{${color}}`
  return {
    start,
    end,
    text: `${open}${inner}{/${color}}`,
    selectStart: start + open.length,
    selectEnd: start + open.length + inner.length,
  }
}

/** La couleur que porte toute la case, s'il y en a une. */
export function cellColor(value: string): string | null {
  return value.trim().match(WRAPPED)?.[1] ?? null
}
