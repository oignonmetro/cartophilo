import { resolveTableExercises, tableIds, tableKey } from '@/content/course'
import { noteTables, plainInline, type NoteTableBlock } from '@/content/notes'
import type { LessonTableSettings, TableExerciseChoice } from '@/content/schema'
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

/**
 * Comment `tables:` désigne une colonne : par son en-tête, plus lisible et
 * insensible à un déplacement de colonne, sauf s'il est vide ou partagé ;
 * par son rang (1 : la première) sinon.
 */
export function columnRef(table: NoteTableBlock, column: number): string | number {
  const headers = [table.corner, ...table.columns].map((header) => plainInline(header).trim())
  const header = headers[column] ?? ''
  const shared = headers.filter((other) => other.toLowerCase() === header.toLowerCase()).length > 1
  return header && !shared ? header : column + 1
}

/**
 * Les exercices que l'application tire seule d'un tableau (voir
 * `tableExercises`), en exercices choisis : le point de départ quand on
 * passe un tableau en « Choisis ». Hors plan, la banque porte sur la
 * première colonne qui la permet, la case seule sur une autre.
 */
export function autoChoices(table: NoteTableBlock): TableExerciseChoice[] {
  const structure = tableStructure(table)
  if (structure) {
    return (['order', 'bank', 'cell'] as const).map((kind) => ({ kind, column: structure.column }))
  }
  const width = table.columns.length + 1
  const filled = (column: number) =>
    table.rows.filter((row) => plainInline((column === 0 ? row.label : row.cells[column - 1]) ?? '').trim()).length
  const columns = Array.from({ length: width }, (_, column) => column)
  const bank = columns.find((column) => column > 0 && filled(column) >= 2) ?? columns.find((column) => filled(column) >= 2)
  const cell = columns.find((column) => column !== bank && filled(column) >= 1) ?? bank
  return [
    ...(bank !== undefined ? [{ kind: 'bank' as const, column: bank }] : []),
    ...(cell !== undefined ? [{ kind: 'cell' as const, column: cell }] : []),
  ]
}

/** Les exercices de chaque tableau d'un rappel : `null` s'ils se tirent seuls, `[]` s'il n'en a aucun. */
export type TableChoices = (TableExerciseChoice[] | null)[]

/** Ce que `tables:` règle pour chacun des tableaux du rappel, et les réglages qui ne désignent plus aucun tableau. */
export function readSettings(
  lessonId: string,
  notes: string,
  settings: readonly LessonTableSettings[],
): { choices: TableChoices; orphans: LessonTableSettings[] } {
  const tables = tableSpans(notes).map((span) => gridTable(span.grid))
  const keys = tableIds(lessonId, tables).map((id) => (id ? tableKey(lessonId, id) : null))
  const choices = tables.map((table, index) => {
    const entry = keys[index] ? settings.find((each) => each.table === keys[index]) : undefined
    return entry ? resolveTableExercises(table, entry) : null
  })
  return { choices, orphans: settings.filter((entry) => !keys.includes(entry.table)) }
}

/** L'inverse : `tables:` à écrire pour ces exercices, réglages orphelins gardés à la suite. */
export function writeSettings(
  lessonId: string,
  notes: string,
  choices: TableChoices,
  orphans: readonly LessonTableSettings[],
): LessonTableSettings[] {
  const tables = tableSpans(notes).map((span) => gridTable(span.grid))
  const ids = tableIds(lessonId, tables)
  const out: LessonTableSettings[] = []
  tables.forEach((table, index) => {
    const id = ids[index]
    const chosen = choices[index]
    if (!id || !chosen) return
    out.push({
      table: tableKey(lessonId, id),
      exercises: chosen.map(({ kind, column }) => ({ kind, column: columnRef(table, column) })),
    })
  })
  return [...out, ...orphans.filter((orphan) => !out.some((entry) => entry.table === orphan.table))]
}
