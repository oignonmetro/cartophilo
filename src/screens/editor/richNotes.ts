import { isFinished, parseInline, SECTION_BREAK, type Inline } from '@/content/notes'
import type { NoteColor } from '@/content/schema'

/**
 * Modèle de l'éditeur visuel des rappels (voir `RichNotesEditor`) : le texte
 * brut d'un `notes:` découpé en blocs, chacun fait de segments de texte
 * portant leurs mises en forme, plutôt que de marqueurs à placer à la main.
 *
 * Le découpage suit pas à pas celui de `parseNotes` (prose, règles et leurs
 * exemples, pièges, tableaux), plus les lignes `===` des sections : ce que
 * l'éditeur montre est ce que l'écran de rappel affichera. Chaque bloc garde
 * en outre sa source exacte (`src`) et la forme qu'il avait à l'ouverture
 * (`orig`) : tant qu'on n'y touche pas, il se réécrit tel quel, si bien
 * qu'enregistrer après avoir corrigé un mot ne réécrit que le paragraphe qui
 * le contient, pas tout le rappel.
 */

export interface Marks {
  strong?: true
  em?: true
  underline?: true
  /** Mot étranger cité (`` `forme` ``). */
  form?: true
  color?: NoteColor
}

export type MarkKey = keyof Marks

export interface Run {
  text: string
  marks: Marks
}

export type BlockKind = 'paragraph' | 'warning' | 'rule' | 'example' | 'table' | 'section'

export interface Block {
  kind: BlockKind
  /** Le texte du bloc ; vide pour un tableau, qui n'est fait que de `src`. */
  runs: Run[]
  /** Source exacte du bloc à l'ouverture (lignes du fichier). */
  src?: string
  /** `serializeBlock` du bloc à l'ouverture : s'il n'a pas changé, on réécrit `src`. */
  orig?: string
  /** Ce qui séparait le bloc du précédent (retours à la ligne, lignes vides). */
  gap?: string
  /** Une règle en sous-puce (`  - …`) : n'a d'effet que sous une autre règle (voir `isSubRule`). */
  level?: 2
}

export interface NotesDoc {
  /** Lignes vides avant le premier bloc et après le dernier, gardées telles quelles. */
  head: string
  tail: string
  blocks: Block[]
}

/** Du plus extérieur au plus intérieur : le seul ordre que `parseInline` relise sans perte. */
export const MARK_ORDER = ['color', 'underline', 'strong', 'em', 'form'] as const

const RULE = /^-\s*/
const WARNING = /^!\s*/
const TABLE_ROW = /^\|/

export const runsText = (runs: Run[]): string => runs.map((run) => run.text).join('')
export const runsLength = (runs: Run[]): number => runs.reduce((sum, run) => sum + run.text.length, 0)
export const blockText = (block: Block): string => runsText(block.runs)

/** Le bloc compte-t-il à l'enregistrement ? Un paragraphe vide n'y laisse rien. */
export function isEmptyBlock(block: Block): boolean {
  return block.kind !== 'table' && blockText(block).trim() === ''
}

export function sameMarks(a: Marks, b: Marks): boolean {
  return MARK_ORDER.every((key) => a[key] === b[key])
}

/** Segments voisins de même mise en forme fusionnés, segments vides retirés. */
export function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = []
  for (const run of runs) {
    if (!run.text) continue
    const last = out[out.length - 1]
    if (last && sameMarks(last.marks, run.marks)) last.text += run.text
    else out.push({ text: run.text, marks: { ...run.marks } })
  }
  return out
}

/** `**gras** et *titre*` → segments marqués, espaces des guillemets laissées intactes. */
export function runsFromMarkup(text: string): Run[] {
  const out: Run[] = []
  const walk = (spans: Inline[], marks: Marks) => {
    for (const span of spans) {
      if (span.kind === 'text') out.push({ text: span.text, marks })
      else if (span.kind === 'form') out.push({ text: span.text, marks: { ...marks, form: true } })
      // Le renvoi reste écrit tel quel dans l'éditeur : il se réenregistre à l'identique.
      else if (span.kind === 'link') out.push({ text: `[[${span.target}|${span.text}]]`, marks })
      else if (span.kind === 'color') walk(span.children, { ...marks, color: span.color })
      else walk(span.children, { ...marks, [span.kind]: true })
    }
  }
  walk(parseInline(text, false), {})
  return mergeRuns(out)
}

const WRAP: Record<(typeof MARK_ORDER)[number], (inner: string, marks: Marks) => string> = {
  color: (inner, marks) => `{${marks.color}}${inner}{/${marks.color}}`,
  underline: (inner) => `__${inner}__`,
  strong: (inner) => `**${inner}**`,
  em: (inner) => `*${inner}*`,
  form: (inner) => `\`${inner}\``,
}

/** L'inverse de `runsFromMarkup`. Gras et italique ne se cumulent pas (le format ne sait pas l'écrire). */
export function markupFromRuns(runs: Run[]): string {
  const level = (group: Run[], depth: number): string => {
    if (depth === MARK_ORDER.length) return runsText(group)
    const key = MARK_ORDER[depth]!
    let out = ''
    let start = 0
    for (let i = 1; i <= group.length; i++) {
      if (i < group.length && group[i]!.marks[key] === group[start]!.marks[key]) continue
      const slice = group.slice(start, i)
      const inner = level(slice, depth + 1)
      out += slice[0]!.marks[key] ? WRAP[key](inner, slice[0]!.marks) : inner
      start = i
    }
    return out
  }
  return level(mergeRuns(runs), 0)
}

/** La règle est-elle une sous-puce ? Il lui faut une règle (ou un exemple) au-dessus. */
export function isSubRule(block: Block, prev: Block | undefined): boolean {
  return block.kind === 'rule' && block.level === 2 && Boolean(prev && RULE_FAMILY.has(prev.kind))
}

/** La ligne (ou les lignes) que le bloc écrit dans le fichier. */
export function serializeBlock(block: Block): string {
  if (block.kind === 'table') return block.src ?? ''
  const text = markupFromRuns(block.runs).trim()
  switch (block.kind) {
    case 'warning':
      return `! ${text}`
    case 'rule':
      return `${block.level === 2 ? '  ' : ''}- ${text}`
    case 'example':
      return `  ${text}`
    default:
      return text
  }
}

export const RULE_FAMILY = new Set<BlockKind>(['rule', 'example'])

/**
 * Le séparateur à écrire entre deux blocs : celui d'origine quand il convient
 * encore, sinon le plus court qui garde les deux blocs distincts à la
 * relecture (deux paragraphes collés n'en feraient qu'un, deux tableaux
 * collés non plus).
 */
function gapBetween(prev: Block, next: Block): string {
  const needsBlank =
    (['paragraph', 'warning'].includes(prev.kind) && ['paragraph', 'example'].includes(next.kind)) ||
    (prev.kind === 'table' && next.kind === 'table') ||
    (next.kind === 'example' && !RULE_FAMILY.has(prev.kind))
  if (next.gap !== undefined && (!needsBlank || /\n[ \t]*\n/.test(next.gap))) return next.gap
  if (needsBlank) return '\n\n'
  return RULE_FAMILY.has(prev.kind) && RULE_FAMILY.has(next.kind) ? '\n' : '\n\n'
}

export function serializeDoc(doc: NotesDoc): string {
  const blocks = doc.blocks.filter((block) => !isEmptyBlock(block))
  if (blocks.length === 0) return ''
  let out = doc.head
  blocks.forEach((block, i) => {
    if (i > 0) out += gapBetween(blocks[i - 1]!, block)
    const text = serializeBlock(isSubRule(block, blocks[i - 1]) ? block : { ...block, level: undefined })
    out += block.src !== undefined && text === block.orig ? block.src : text
  })
  return out + doc.tail
}

/** Analyse un `notes:` en blocs, sur les règles de `parseNotes`, sections en plus. */
export function parseDoc(notes: string): NotesDoc {
  const lines = notes.split('\n')
  interface Pending {
    kind: BlockKind
    text: string
    level?: 2
    start: number
    end: number
  }
  const found: Pending[] = []
  let pending: Pending | null = null
  let tableOpen = false

  const flush = () => {
    if (pending) found.push(pending)
    pending = null
  }

  lines.forEach((raw, index) => {
    const line = raw.trim()
    const last = found[found.length - 1]

    if (line === '') {
      flush()
      tableOpen = false
      return
    }
    if (SECTION_BREAK.test(line)) {
      flush()
      found.push({ kind: 'section', text: line, start: index, end: index })
      tableOpen = false
      return
    }
    if (RULE.test(line)) {
      flush()
      const above = found[found.length - 1]
      const level = /^\s+/.test(raw) && above && RULE_FAMILY.has(above.kind) ? 2 : undefined
      found.push({ kind: 'rule', text: line.replace(RULE, ''), level, start: index, end: index })
      return
    }
    if (WARNING.test(line)) {
      flush()
      pending = { kind: 'warning', text: line.replace(WARNING, ''), start: index, end: index }
      return
    }
    if (TABLE_ROW.test(line)) {
      flush()
      const table = found[found.length - 1]
      if (tableOpen && table?.kind === 'table') table.end = index
      else found.push({ kind: 'table', text: '', start: index, end: index })
      tableOpen = true
      return
    }
    // Ligne indentée sous une règle : sa suite si elle reste en suspens,
    // sinon son exemple (voir `parseNotes`).
    if (/^\s+/.test(raw) && !pending && last && RULE_FAMILY.has(last.kind)) {
      if (last.kind === 'example' || !isFinished(last.text)) {
        last.text = `${last.text} ${line}`
        last.end = index
      } else found.push({ kind: 'example', text: line, start: index, end: index })
      return
    }
    if (pending) {
      pending.text = `${pending.text} ${line}`
      pending.end = index
    } else pending = { kind: 'paragraph', text: line, start: index, end: index }
  })
  flush()

  if (found.length === 0) return { head: notes, tail: '', blocks: [] }

  const blocks = found.map((item, i): Block => {
    const src = lines.slice(item.start, item.end + 1).join('\n')
    const prevEnd = i === 0 ? -1 : found[i - 1]!.end
    const gap = i === 0 ? undefined : `\n${lines.slice(prevEnd + 1, item.start).map((line) => `${line}\n`).join('')}`
    const runs = item.kind === 'table' ? [] : item.kind === 'section' ? plainRuns(item.text) : runsFromMarkup(item.text)
    const block: Block = { kind: item.kind, runs, src, gap, level: item.level }
    block.orig = serializeBlock(block)
    return block
  })
  const first = found[0]!.start
  const lastEnd = found[found.length - 1]!.end
  return {
    head: lines.slice(0, first).map((line) => `${line}\n`).join(''),
    tail: lines.slice(lastEnd + 1).map((line) => `\n${line}`).join(''),
    blocks,
  }
}

const plainRuns = (text: string): Run[] => (text ? [{ text, marks: {} }] : [])

/**
 * Des marqueurs tapés tels quels (`**gras**`, `*titre*`…) se reliraient comme
 * une mise en forme une fois le fichier rouvert : on les y convertit tout de
 * suite, pour que l'écran ne montre jamais des astérisques que le rappel
 * n'affichera pas. Rend `null` si le texte se relit déjà tel quel.
 */
export function reparseRuns(runs: Run[]): Run[] | null {
  const merged = mergeRuns(runs)
  const reread = runsFromMarkup(markupFromRuns(merged))
  const same =
    reread.length === merged.length &&
    reread.every((run, i) => run.text === merged[i]!.text && sameMarks(run.marks, merged[i]!.marks))
  return same ? null : reread
}

/* ——— Opérations sur les segments ——— */

export function sliceRuns(runs: Run[], from: number, to = Infinity): Run[] {
  const out: Run[] = []
  let at = 0
  for (const run of runs) {
    const end = at + run.text.length
    const a = Math.max(from, at)
    const b = Math.min(to, end)
    if (b > a) out.push({ text: run.text.slice(a - at, b - at), marks: run.marks })
    at = end
  }
  return out
}

export function insertRuns(runs: Run[], at: number, inserted: Run[]): Run[] {
  return mergeRuns([...sliceRuns(runs, 0, at), ...inserted, ...sliceRuns(runs, at)])
}

/**
 * La mise en forme que prendrait un caractère tapé à `offset` : celle du
 * caractère qui précède, comme dans un traitement de texte ; en début de bloc,
 * celle du premier caractère.
 */
export function marksAt(runs: Run[], offset: number): Marks {
  let at = 0
  for (const run of runs) {
    const end = at + run.text.length
    if (offset > at && offset <= end) return run.marks
    at = end
  }
  return offset === 0 && runs[0] ? runs[0].marks : {}
}

/** Applique `change` à la mise en forme de `[from, to)`. */
export function restyle(runs: Run[], from: number, to: number, change: (marks: Marks) => Marks): Run[] {
  return mergeRuns([
    ...sliceRuns(runs, 0, from),
    ...sliceRuns(runs, from, to).map((run) => ({ text: run.text, marks: change({ ...run.marks }) })),
    ...sliceRuns(runs, to),
  ])
}

/** Chaque caractère de `[from, to)` porte-t-il cette mise en forme ? Faux sur une plage vide. */
export function hasMark(runs: Run[], from: number, to: number, key: MarkKey, color?: NoteColor): boolean {
  const slice = sliceRuns(runs, from, to)
  return slice.length > 0 && slice.every((run) => (key === 'color' ? run.marks.color === color : run.marks[key]))
}

/** Pose ou retire une mise en forme ; gras et italique s'excluent, une couleur en remplace une autre. */
export function withMark(marks: Marks, key: MarkKey, on: boolean, color?: NoteColor): Marks {
  const next = { ...marks }
  if (!on) {
    delete next[key]
    return next
  }
  if (key === 'color') next.color = color
  else next[key] = true as never
  if (key === 'strong') delete next.em
  if (key === 'em') delete next.strong
  return next
}

/**
 * Le texte d'un bloc peut changer sa nature à la relecture : un paragraphe qui
 * commence par « - » est une règle, par « ! » un piège, par « | » un tableau,
 * par « === » une section. Plutôt que d'afficher un paragraphe que le fichier
 * relirait autrement, le bloc prend ici sa vraie nature, comme à la relecture.
 * `removed` dit combien de caractères ont disparu en tête (le « - » devenu
 * puce), pour que le curseur reste sur la même lettre.
 */
export function normalizeBlock(block: Block, prev: Block | undefined): { block: Block; removed: number } {
  if (block.kind === 'table') return { block, removed: 0 }
  const text = blockText(block)
  if (block.kind === 'section') {
    if (SECTION_BREAK.test(text.trim())) return { block, removed: 0 }
    return normalizeBlock({ ...block, kind: 'paragraph' }, prev)
  }
  const lead = text.length - text.trimStart().length
  const body = text.slice(lead)
  const strip = (kind: BlockKind, prefix: RegExp) => {
    const cut = lead + (prefix.exec(body)?.[0].length ?? 0)
    return { block: { ...block, kind, runs: sliceRuns(block.runs, cut) }, removed: cut }
  }
  if (block.kind === 'paragraph' || block.kind === 'example') {
    if (SECTION_BREAK.test(text.trim())) return { block: { ...block, kind: 'section', runs: plainRuns(text.trim()) }, removed: lead }
    if (/^\|.*\|\s*$/.test(body)) return { block: { kind: 'table', runs: [], src: body.trim() }, removed: 0 }
    if (RULE.test(body) && body.length > 0) return strip('rule', RULE)
    if (WARNING.test(body)) return strip('warning', WARNING)
  }
  if (block.kind === 'example' && !(prev && RULE_FAMILY.has(prev.kind))) {
    return { block: { ...block, kind: 'paragraph' }, removed: 0 }
  }
  return { block, removed: 0 }
}

/** Le texte copié : la même forme que dans le fichier, pour se recoller ici ou dans une carte. */
export function markupOf(blocks: Block[]): string {
  return serializeDoc({ head: '', tail: '', blocks: blocks.map(({ kind, runs, src, level }) => ({ kind, runs, level, src: kind === 'table' ? src : undefined })) })
}

/* ——— Repères dans le rappel : étiquette et commentaire d'une règle ——— */

/** Les mêmes coupes que `splitLabel` et `splitAside`, en positions dans le texte du bloc. */
export function ruleSplits(text: string): { labelEnd: number; asideStart: number | null } {
  const at = text.indexOf(' : ')
  const labelEnd = at === -1 || at > 48 ? 0 : at + 3
  const body = text.slice(labelEnd)
  const match = /^(.*\S)(\s*\([^()]*\)\s*)$/.exec(body)
  return { labelEnd, asideStart: match ? labelEnd + match[1]!.length : null }
}
