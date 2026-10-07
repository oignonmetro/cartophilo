import { noteTables, plainInline, type NoteTableBlock } from '@/content/notes'
import { compareKeys, locationKey, tableStructure } from '@/engine/exercises'

/**
 * Les tableaux d'un rappel, vus en grille pour l'onglet Tableaux de
 * l'éditeur : chacun garde sa place dans le texte brut du `notes:` (ses
 * lignes), pour qu'une retouche de case ne réécrive que lui. Un tableau est
 * une suite de lignes consécutives ouvertes par « | », exactement comme
 * `parseNotes` les lit : une ligne vide, de prose ou `===` le referme.
 */

export interface TableSpan {
  /** Première ligne du tableau dans le rappel, et la ligne qui suit la dernière. */
  start: number
  end: number
  /** Indentation de sa première ligne, reprise à la réécriture. */
  indent: string
  /** L'en-tête puis les rangées, la première colonne étant celle des étiquettes. */
  grid: string[][]
}

function rowCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

/** Toutes les rangées à la même largeur, la plus grande. */
function squared(grid: string[][]): string[][] {
  const width = Math.max(1, ...grid.map((row) => row.length))
  return grid.map((row) => [...row, ...Array<string>(width - row.length).fill('')])
}

export function tableSpans(notes: string): TableSpan[] {
  const lines = notes.split('\n')
  const spans: TableSpan[] = []
  let i = 0
  while (i < lines.length) {
    if (!lines[i]!.trim().startsWith('|')) {
      i++
      continue
    }
    const start = i
    while (i < lines.length && lines[i]!.trim().startsWith('|')) i++
    spans.push({
      start,
      end: i,
      indent: /^\s*/.exec(lines[start]!)![0],
      grid: squared(lines.slice(start, i).map(rowCells)),
    })
  }
  return spans
}

/** Une case telle qu'elle peut s'écrire dans une rangée : ni barre, ni retour à la ligne. */
export function cleanCell(text: string): string {
  return text.replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ')
}

/** La grille en lignes `| a | b |`, au format des rappels déjà écrits (sans alignement). */
export function formatTable(grid: string[][], indent = ''): string[] {
  return squared(grid).map(
    (row) =>
      `${indent}|${row
        .map((cell) => cleanCell(cell).trim())
        .map((cell) => (cell ? ` ${cell} ` : ' '))
        .join('|')}|`,
  )
}

/** Le tableau tel que le lit l'application (voir `noteTables`). */
export function gridTable(grid: string[][]): NoteTableBlock {
  return noteTables(formatTable(grid).join('\n'))[0]!
}

export function replaceTable(notes: string, index: number, grid: string[][]): string {
  const span = tableSpans(notes)[index]
  if (!span) return notes
  const lines = notes.split('\n')
  lines.splice(span.start, span.end - span.start, ...formatTable(grid, span.indent))
  return lines.join('\n')
}

/** Retire un tableau et l'une des lignes vides qui l'isolaient. */
export function removeTable(notes: string, index: number): string {
  const span = tableSpans(notes)[index]
  if (!span) return notes
  const lines = notes.split('\n')
  let { start, end } = span
  if (end < lines.length && lines[end]!.trim() === '') end++
  else if (start > 0 && lines[start - 1]!.trim() === '') start--
  lines.splice(start, end - start)
  return lines.join('\n')
}

/** Ajoute un tableau à la fin du rappel, séparé de ce qui précède par une ligne vide. */
export function appendTable(notes: string, grid: string[][]): string {
  const table = formatTable(grid).join('\n')
  const body = notes.replace(/\s+$/, '')
  return body ? `${body}\n\n${table}` : table
}

/**
 * Pourquoi un tableau qui ressemble à un plan ne devient pas un repérage
 * (voir `tableStructure`) : la colonne qui porte le plus de repères, et ce
 * qui lui manque. `null` pour un repérage reconnu, ou un tableau qui n'a
 * presque aucun repère et n'en est visiblement pas un.
 */
export function structureHint(table: NoteTableBlock): string | null {
  if (tableStructure(table)) return null
  const width = table.columns.length + 1
  const cell = (row: number, column: number) =>
    (column === 0 ? table.rows[row]?.label : table.rows[row]?.cells[column - 1]) ?? ''
  let best: { column: number; keys: (number[] | null)[]; found: number } | null = null
  for (let column = 0; column < width; column++) {
    const keys = table.rows.map((_, row) => locationKey(cell(row, column)))
    const found = keys.filter(Boolean).length
    if (!best || found > best.found) best = { column, keys, found }
  }
  if (!best || best.found < 2) return null
  const title = plainInline((best.column === 0 ? table.corner : table.columns[best.column - 1]) ?? '').trim()
  const named = title ? `la colonne « ${title} »` : `la colonne ${best.column + 1}`
  if (table.rows.length < 3) return `Un plan a besoin d'au moins trois lignes pour devenir un repérage.`
  const missing = best.keys.findIndex((key) => key === null)
  if (missing !== -1) {
    const text = plainInline(cell(missing, best.column)).trim()
    return text
      ? `Ligne ${missing + 1} : « ${text} » n'est pas lu comme un repère dans ${named} (un seul repère par case, sans autre texte).`
      : `Ligne ${missing + 1} : ${named} est vide ; un repère est attendu sur chaque ligne.`
  }
  const back = best.keys.findIndex((key, row) => row > 0 && compareKeys(best!.keys[row - 1]!, key!) > 0)
  if (back !== -1) {
    return `Ligne ${back + 1} : « ${plainInline(cell(back, best.column)).trim()} » vient avant « ${plainInline(cell(back - 1, best.column)).trim()} » dans le texte ; les repères de ${named} doivent suivre l'ordre du texte.`
  }
  return null
}
