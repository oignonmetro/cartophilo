/**
 * Cœur, sans I/O, de la conversion mécanique d'un export Quizlet vers des
 * points de grammaire bruts — partagé entre le script en ligne de commande
 * (`tools/content/from-quizlet.ts`) et l'option d'import de l'éditeur visuel
 * (`tools/content-editor/api-plugin.ts`, route `/api/import-points`), pour
 * ne jamais avoir deux implémentations de la même règle à maintenir.
 *
 * Fait, sans appel à Claude : découpe terme/définition, déclinaison des
 * cartes à plusieurs trous en un point par trou (le moteur `GrammarGap` ne
 * lit que le premier `___` d'une phrase, voir `content/philosophie.md`
 * « Un seul ___ par sentence »), guillemets français en façade pour une
 * citation simple, purge des tirets cadratins.
 *
 * Ne fait PAS, et ne doit pas essayer de faire : regrouper les points en
 * leçons, rédiger les rappels (`notes`), juger de l'autonomie d'une carte.
 * Ces trois choses restent un travail de lecture et de compréhension, à
 * faire ensuite sur les points produits ici (voir `content/philosophie.md`).
 */

export interface ImportedPoint {
  sentence: string
  answer: string
  /** Guillemets droits en nombre impair ou supérieur à deux : citation imbriquée probable, à relire. */
  needsReview: boolean
  /** Rang (1-indexé) de la ligne source, pour retrouver une carte suspecte dans l'export d'origine. */
  sourceLine: number
}

export interface SkippedRow {
  line: number
  reason: string
  row: string
}

export interface ImportResult {
  points: ImportedPoint[]
  skipped: SkippedRow[]
  /** Nombre de lignes non vides lues, avant filtrage — pour le message de synthèse. */
  rowCount: number
}

export function unescapeSep(raw: string): string {
  return raw.replace(/\\t/g, '\t').replace(/\\n/g, '\n')
}

/** Tiret cadratin (—) : jamais toléré en contenu, voir `content/philosophie.md`. */
function stripEmDash(s: string): string {
  return s.replace(/\s*—\s*/g, ', ')
}

/**
 * Guillemets français en façade pour une citation simple (une seule paire
 * de guillemets droits, sans citation imbriquée). Toute autre situation
 * (guillemets droits en nombre impair ou supérieur à deux, signe probable
 * d'une citation dans la citation) est laissée telle quelle et signalée :
 * la désambiguïser demande de lire la phrase, pas une règle mécanique.
 */
function frenchifyQuotes(s: string): { text: string; needsReview: boolean } {
  const count = (s.match(/"/g) ?? []).length
  if (count === 0) return { text: s, needsReview: false }
  if (count !== 2) return { text: s, needsReview: true }
  const first = s.indexOf('"')
  const last = s.lastIndexOf('"')
  const chars = [...s]
  chars[first] = '«'
  chars[last] = '»'
  return { text: chars.join(''), needsReview: false }
}

function normalize(s: string): { text: string; needsReview: boolean } {
  const { text, needsReview } = frenchifyQuotes(s.trim())
  return { text: stripEmDash(text), needsReview }
}

/**
 * Décline une carte à N trous (`___` répétés, réponses jointes par `//`,
 * dans le même ordre que les trous) en N points à un seul trou chacun, les
 * autres blancs étant remplis par leur vraie valeur.
 */
function splitMultiBlank(front: string, answerJoined: string): Array<{ sentence: string; answer: string }> | null {
  const answers = answerJoined.split('//').map((a) => a.trim())
  const parts = front.split('___')
  if (parts.length !== answers.length + 1) return null
  const out: Array<{ sentence: string; answer: string }> = []
  for (let i = 0; i < answers.length; i++) {
    const pieces: string[] = []
    for (let j = 0; j < parts.length; j++) {
      pieces.push(parts[j])
      if (j < answers.length) pieces.push(j === i ? '___' : answers[j])
    }
    out.push({ sentence: pieces.join(''), answer: answers[i] })
  }
  return out
}

/**
 * Convertit un export brut (une carte par ligne, terme et définition
 * séparés par `::` par défaut) en points de grammaire bruts. `termSep`/
 * `rowSep` suivent le choix de séparateurs fait à l'export, au besoin
 * (Quizlet, entre autres, en propose plusieurs).
 */
export function importQuizletRows(raw: string, opts: { termSep?: string; rowSep?: string } = {}): ImportResult {
  const termSep = opts.termSep ?? '::'
  const rowSep = opts.rowSep ?? '\n'

  const rows = raw
    .split(rowSep)
    .map((r) => r.trim())
    .filter((r) => r.length > 0)

  const points: ImportedPoint[] = []
  const skipped: SkippedRow[] = []

  rows.forEach((row, i) => {
    const sepAt = row.indexOf(termSep)
    if (sepAt === -1) {
      skipped.push({ line: i + 1, reason: 'pas de séparateur terme/définition trouvé', row })
      return
    }
    const term = row.slice(0, sepAt)
    const definition = row.slice(sepAt + termSep.length)

    const blankCount = (term.match(/___/g) ?? []).length
    if (blankCount === 0) {
      skipped.push({
        line: i + 1,
        reason: 'aucun ___ dans le terme : carte non-cloze, doublon sans trou, ou anomalie — à traiter à la main',
        row,
      })
      return
    }

    if (blankCount === 1) {
      const front = normalize(term)
      const answer = normalize(definition)
      points.push({
        sentence: front.text,
        answer: answer.text,
        needsReview: front.needsReview || answer.needsReview,
        sourceLine: i + 1,
      })
      return
    }

    const split = splitMultiBlank(term, definition)
    if (!split) {
      skipped.push({
        line: i + 1,
        reason: `${blankCount} trou(s) dans le terme mais la définition ne se découpe pas en autant de réponses séparées par ";" — à traiter à la main`,
        row,
      })
      return
    }
    for (const { sentence, answer } of split) {
      const front = normalize(sentence)
      const back = normalize(answer)
      points.push({
        sentence: front.text,
        answer: back.text,
        needsReview: front.needsReview || back.needsReview,
        sourceLine: i + 1,
      })
    }
  })

  return { points, skipped, rowCount: rows.length }
}
