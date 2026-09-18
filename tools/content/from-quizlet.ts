/**
 * Conversion mécanique d'un export Quizlet vers un bassin de points bruts.
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
 * faire ensuite sur le bassin de points produit ici (voir
 * `content/philosophie.md`).
 *
 * Usage :
 *   tsx tools/content/from-quizlet.ts <export.txt> <bassin.yaml> \
 *     [--term-sep TAB] [--row-sep '\n']
 *
 * Le format attendu par défaut est celui de l'export standard Quizlet :
 * une carte par ligne, terme et définition séparés par une tabulation.
 * Quizlet permet de choisir d'autres séparateurs à l'export ; --term-sep
 * et --row-sep suivent ce même choix (accepte un caractère littéral, ou
 * les échappements \t \n).
 */
import { readFileSync, writeFileSync } from 'node:fs'

function unescapeSep(raw: string): string {
  return raw.replace(/\\t/g, '\t').replace(/\\n/g, '\n')
}

function parseArgs(argv: string[]) {
  const positional: string[] = []
  let termSep = '\t'
  let rowSep = '\n'
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--term-sep') {
      termSep = unescapeSep(argv[++i])
    } else if (arg === '--row-sep') {
      rowSep = unescapeSep(argv[++i])
    } else {
      positional.push(arg)
    }
  }
  const [inputPath, outputPath] = positional
  if (!inputPath || !outputPath) {
    console.error('Usage: tsx tools/content/from-quizlet.ts <export.txt> <bassin.yaml> [--term-sep TAB] [--row-sep \\n]')
    process.exit(1)
  }
  return { inputPath, outputPath, termSep, rowSep }
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
 * Décline une carte à N trous (`___` répétés, réponse jointe par `;`, la
 * convention déjà en usage dans le contenu existant pour une énumération)
 * en N points à un seul trou chacun, les autres blancs étant remplis par
 * leur vraie valeur.
 */
function splitMultiBlank(
  front: string,
  answerJoined: string,
): Array<{ sentence: string; answer: string }> | null {
  const answers = answerJoined.split(';').map((a) => a.trim())
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

function yq(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

type PoolPoint = { sentence: string; answer: string; needsReview: boolean; sourceLine: number }

function main() {
  const { inputPath, outputPath, termSep, rowSep } = parseArgs(process.argv.slice(2))
  const raw = readFileSync(inputPath, 'utf-8')

  const rows = raw.split(rowSep).map((r) => r.trim()).filter((r) => r.length > 0)

  const points: PoolPoint[] = []
  const skipped: Array<{ line: number; reason: string; row: string }> = []

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
        reason: "aucun ___ dans le terme : carte non-cloze, doublon sans trou, ou anomalie — à traiter à la main",
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

  const lines: string[] = []
  lines.push(`# Bassin de points bruts, converti automatiquement depuis ${inputPath}.`)
  lines.push('#')
  lines.push("# Étape suivante, manuelle : regrouper ces points en leçons cohérentes, écrire")
  lines.push('# le rappel (`notes`) de chacune, vérifier les points marqués « guillemets à')
  lines.push('# vérifier » (citation imbriquée probable), assigner les ids définitifs, puis')
  lines.push('# recopier le résultat dans un vrai fichier `content/courses/<cours>/units/*.yaml`.')
  lines.push('# Ce fichier-ci ne doit jamais être déposé tel quel dans `units/` : il ne respecte')
  lines.push('# ni le découpage en leçons ni `content/philosophie.md`.')
  lines.push('points:')
  for (const p of points) {
    lines.push(`  - sentence: ${yq(p.sentence)}`)
    lines.push(`    answer: ${yq(p.answer)}`)
    lines.push('    alt: []')
    lines.push(`    sourceLine: ${p.sourceLine}${p.needsReview ? '  # guillemets à vérifier' : ''}`)
  }

  writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8')

  const reviewCount = points.filter((p) => p.needsReview).length
  console.error(`${rows.length} carte(s) lues, ${points.length} point(s) écrits dans ${outputPath}.`)
  if (reviewCount > 0) {
    console.error(`${reviewCount} point(s) marqué(s) « guillemets à vérifier » (citation imbriquée probable).`)
  }
  if (skipped.length > 0) {
    console.error(`${skipped.length} ligne(s) ignorée(s) :`)
    for (const s of skipped) {
      console.error(`  ligne ${s.line} : ${s.reason}`)
      console.error(`    ${s.row.slice(0, 120)}${s.row.length > 120 ? '…' : ''}`)
    }
  }
}

main()
