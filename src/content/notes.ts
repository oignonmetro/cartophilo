import { unitColorSchema, type UnitColor } from './schema'

/**
 * Mise en forme des rappels de cours.
 *
 * Les `notes:` d'une leçon sont du texte brut, écrit à la main dans le YAML et
 * replié à ~80 colonnes pour rester lisible dans le fichier. Ce repli est une
 * commodité d'édition, pas une intention typographique : la première version
 * de l'écran coupait naïvement sur chaque retour à la ligne, si bien qu'une
 * phrase repliée s'affichait en deux paragraphes séparés par un blanc. D'où le
 * texte haché que voyait l'apprenant.
 *
 * Ce module reconstitue l'intention de l'auteur :
 *
 *   - les lignes de prose qui se suivent forment un seul paragraphe ;
 *   - une ligne vide sépare deux paragraphes ;
 *   - une ligne ouverte par « - » est une règle, mise en valeur ;
 *   - une ligne indentée sous une règle en est l'exemple ;
 *   - une ligne ouverte par « ! » est un piège, signalé comme tel ;
 *   - une ligne ouverte par « | » est une rangée de tableau, ligne suivante
 *     comprise ; contrairement au reste, elle ne se replie pas : chaque
 *     rangée tient sur une seule ligne du fichier, même longue.
 *
 * Le format reste du texte : pas de moteur Markdown à embarquer, et un auteur
 * qui ne connaît aucune de ces conventions obtient malgré tout des paragraphes
 * corrects.
 */

/** Les dix teintes déjà utilisées ailleurs dans l'app (pistes, unités). */
const COLOR_NAMES = unitColorSchema.options

/**
 * Fragment de texte enrichi.
 *
 * `form` marque un mot étranger cité au milieu d'une explication française
 * (allemand, latin…) — voir `RuleNote.tsx`, qui l'affiche en italique.
 * `color` teinte un passage dans l'une des dix couleurs déjà en usage dans
 * l'app, pour distinguer deux notions qui reviennent tout au long d'un
 * rappel (une thèse et l'objection qu'on lui oppose, par exemple).
 */
export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'em'; children: Inline[] }
  | { kind: 'underline'; children: Inline[] }
  /** Mot étranger cité : littéral, rien ne s'y imbrique. */
  | { kind: 'form'; text: string }
  | { kind: 'color'; color: UnitColor; children: Inline[] }

const INLINE = new RegExp(
  `\\*\\*([^*]+)\\*\\*|__([^_]+)__|\\*([^*]+)\\*|\`([^\`]+)\`|\\{(${COLOR_NAMES.join('|')})\\}([\\s\\S]*?)\\{/\\5\\}`,
  'g',
)

/**
 * `**gras**`, `*italique*`, `__souligné__`, `` `mot étranger` ``,
 * `{couleur}teinté{/couleur}`.
 *
 * Les quatre premiers s'imbriquent — « **pas de `to`** » met bien la forme en
 * valeur à l'intérieur du gras, et une couleur peut elle aussi contenir du
 * gras. Le quatrième (la forme citée) est littéral, comme du code. Un texte
 * sans aucun marqueur ressort en un seul fragment, ce qui rend la fonction
 * sûre à appliquer partout.
 */
export function parseInline(text: string): Inline[] {
  const spans: Inline[] = []
  let last = 0

  for (const match of text.matchAll(INLINE)) {
    const at = match.index
    if (at > last) spans.push({ kind: 'text', text: text.slice(last, at) })

    const [, strong, underline, em, form, color, colorText] = match
    if (strong !== undefined) spans.push({ kind: 'strong', children: parseInline(strong) })
    else if (underline !== undefined) spans.push({ kind: 'underline', children: parseInline(underline) })
    else if (em !== undefined) spans.push({ kind: 'em', children: parseInline(em) })
    else if (form !== undefined) spans.push({ kind: 'form', text: form })
    else if (color !== undefined) {
      spans.push({ kind: 'color', color: color as UnitColor, children: parseInline(colorText ?? '') })
    }

    last = at + match[0].length
  }

  if (last < text.length) spans.push({ kind: 'text', text: text.slice(last) })
  return spans
}

/** Une règle, avec son étiquette éventuelle et son exemple éventuel. */
export interface NoteRule {
  /** Ce qui précède le « : » — le cas couvert par la règle. */
  label: string | null
  /** Le corps de la règle. */
  body: string
  /** Exemple donné sur la ligne indentée qui suit. */
  example: string | null
}

/** Une ligne d'un tableau : son étiquette de rangée, et une cellule par colonne. */
export interface NoteTableRow {
  label: string
  cells: string[]
}

export type NoteBlock =
  | { kind: 'paragraph'; text: string }
  /** Suite de règles consécutives : elles s'affichent comme une seule liste. */
  | { kind: 'rules'; rules: NoteRule[] }
  | { kind: 'warning'; text: string }
  /** Croise deux classifications ; voir la ligne d'en-tête dans `parseNotes`. */
  | { kind: 'table'; columns: string[]; rows: NoteTableRow[] }

const RULE = /^-\s*/
const WARNING = /^!\s*/
const TABLE_ROW = /^\|/

/**
 * Une ligne `| a | b | c |` en cellules nettoyées : les barres verticales de
 * bord sont facultatives à l'écriture, ignorées si présentes.
 */
function parseTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

/**
 * Sépare « étiquette : corps » quand la ligne s'y prête.
 *
 * On ne coupe que sur le premier « : » entouré d'espaces, et seulement si
 * l'étiquette reste courte : « If + présent simple, … will + base verbale. »
 * ne doit pas être charcuté, alors que « Une syllabe : -er + than » gagne à
 * l'être.
 */
function splitLabel(text: string): { label: string | null; body: string } {
  const at = text.indexOf(' : ')
  if (at === -1 || at > 48) return { label: null, body: text }
  return { label: text.slice(0, at), body: text.slice(at + 3) }
}

/**
 * Une règle est-elle achevée ?
 *
 * On juge sur la ponctuation finale. Les marques de mise en forme sont
 * retirées d'abord : une règle qui se termine par une forme citée
 * (« …`Children learn fast.` ») est bien achevée, l'accent grave ne la laisse
 * pas en suspens.
 */
function isFinished(body: string): boolean {
  return /[.!?:;…]$/.test(body.replace(/[`*_\s]+$/, ''))
}

export function parseNotes(notes: string): NoteBlock[] {
  const blocks: NoteBlock[] = []
  // Bloc de texte en cours de constitution — prose ou piège. Les lignes s'y
  // accumulent jusqu'à ce qu'une ligne vide ou un marqueur vienne le clore,
  // ce qui recolle les phrases repliées quel que soit leur type.
  let pending: { kind: 'paragraph' | 'warning'; lines: string[] } | null = null

  function flush() {
    if (!pending) return
    blocks.push({ kind: pending.kind, text: pending.lines.join(' ') })
    pending = null
  }

  /** La liste de règles ouverte, s'il y en a une juste au-dessus. */
  function openRules(): NoteRule[] | null {
    const last = blocks[blocks.length - 1]
    return last?.kind === 'rules' ? last.rules : null
  }

  for (const raw of notes.split('\n')) {
    const line = raw.trim()

    if (line === '') {
      flush()
      continue
    }

    if (RULE.test(line)) {
      flush()
      const { label, body } = splitLabel(line.replace(RULE, ''))
      const rule: NoteRule = { label, body, example: null }
      const current = openRules()
      if (current) current.push(rule)
      else blocks.push({ kind: 'rules', rules: [rule] })
      continue
    }

    if (WARNING.test(line)) {
      flush()
      pending = { kind: 'warning', lines: [line.replace(WARNING, '')] }
      continue
    }

    if (TABLE_ROW.test(line)) {
      flush()
      const cells = parseTableRow(line)
      const last = blocks[blocks.length - 1]
      // La première ligne `|...|` rencontrée pose les colonnes (sa première
      // cellule, le coin, ne sert qu'à aligner l'écriture et n'est pas
      // affichée) ; chaque ligne suivante ajoute une rangée, tant qu'aucun
      // autre bloc ne s'intercale.
      if (last?.kind === 'table') last.rows.push({ label: cells[0], cells: cells.slice(1) })
      else blocks.push({ kind: 'table', columns: cells.slice(1), rows: [] })
      continue
    }

    // Ligne indentée sous une règle : sa suite, ou son exemple. On regarde
    // l'indentation de la ligne brute, la seule trace qu'il en reste.
    const rules = openRules()
    if (/^\s+/.test(raw) && !pending && rules) {
      const last = rules[rules.length - 1]
      // Une règle dont la dernière ligne reste en suspens se poursuit : le
      // repli à 80 colonnes du YAML ne doit pas transformer la fin d'une règle
      // en exemple, ce qui l'afficherait en italique et amputerait la règle.
      if (last.example === null && !isFinished(last.body)) last.body = `${last.body} ${line}`
      else last.example = last.example ? `${last.example} ${line}` : line
      continue
    }

    if (pending) pending.lines.push(line)
    else pending = { kind: 'paragraph', lines: [line] }
  }

  flush()
  return blocks
}

/**
 * Découpe le commentaire final entre parenthèses, pour l'afficher en retrait.
 * « I will call you as soon as I arrive. (jamais « as soon as I will arrive ») »
 */
export function splitAside(text: string): { main: string; aside: string | null } {
  const match = /^(.*\S)\s*\(([^()]*)\)\s*$/.exec(text)
  if (!match) return { main: text, aside: null }
  return { main: match[1], aside: match[2] }
}

const SECTION_BREAK = /^={3,}$/

/**
 * Sépare des `notes:` en plusieurs rappels distincts, sur une ligne ne
 * portant que `===`.
 *
 * Un rappel trop long à avaler d'un coup gagne à se répartir sur la session
 * plutôt qu'à tout dire avant le premier exercice (voir `buildVocabSession`,
 * qui présente le rappel `i` avant le bloc de mots `i`). Sans marqueur, tout
 * le texte reste un seul rappel : le comportement d'origine, celui de tout
 * le contenu déjà écrit.
 */
export function splitNoteSections(notes: string): string[] {
  const sections: string[] = []
  let current: string[] = []
  for (const raw of notes.split('\n')) {
    if (SECTION_BREAK.test(raw.trim())) {
      sections.push(current.join('\n'))
      current = []
      continue
    }
    current.push(raw)
  }
  sections.push(current.join('\n'))
  return sections.map((section) => section.trim()).filter((section) => section.length > 0)
}
