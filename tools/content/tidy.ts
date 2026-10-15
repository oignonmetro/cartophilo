/**
 * Mise en forme automatique du contenu écrit à la main (rappels, cartes),
 * appliquée par l'éditeur visuel à chaque enregistrement (voir
 * `tools/content-editor/api-plugin.ts`) et, sur des fichiers entiers, par
 * `npm run content:tidy` (`tools/content/tidy-cli.ts`).
 *
 * Ne corrige que ce qui se corrige sans jugement : les défauts relevés en
 * relisant les cours des traités 1 et 7 de Plotin, que l'œil ne voit pas dans
 * l'éditeur mais qui se voient à l'écran (une marque fermée après une espace
 * colle le mot suivant, un souligné collé à un trou fait « _____ »). Ce qui
 * demande un choix (une carte sans trou, une réponse vide) n'est que signalé,
 * par `pointProblems`.
 *
 * Chaque fonction est idempotente : la passer deux fois ne change rien de plus.
 */

/** Trou d'une phrase à trou (voir `GAP` dans `src/content/schema.ts`). */
const GAP = '___'
/** Remplace le trou le temps du traitement : ses tirets bas ne sont pas un souligné. */
const GAP_TOKEN = '\u0001'

/**
 * Déplace hors de chaque paire de marques `mark` les espaces collées à
 * l'intérieur : `**hapax **chez` devient `**hapax** chez`. Les marques sont
 * appariées dans l'ordre (la première ouvre, la deuxième ferme…) sur tout un
 * paragraphe, parce qu'un rappel coupé à la main peut ouvrir une marque sur
 * une ligne et la fermer sur la suivante ; un paragraphe où elles sont en
 * nombre impair est laissé tel quel, faute de savoir laquelle est orpheline.
 * Seules les espaces bougent, jamais un retour à la ligne.
 */
function tidyPairs(text: string, mark: string): string {
  const parts = text.split(mark)
  if (parts.length < 3 || parts.length % 2 === 0) return text
  for (let i = 1; i < parts.length; i += 2) {
    if (!parts[i]!.trim()) continue
    if (/ +$/.test(parts[i]!)) {
      parts[i] = parts[i]!.replace(/ +$/, '')
      parts[i + 1] = ' ' + parts[i + 1]!.replace(/^ +/, '')
    }
    if (/^ +/.test(parts[i]!)) {
      parts[i] = parts[i]!.replace(/^ +/, '')
      parts[i - 1] = parts[i - 1]!.replace(/ +$/, '') + ' '
    }
    // Un souligné qui s'ouvre ou se ferme sur le trou : `__… ___ __` donne
    // « _____ » à l'écran. Le trou sort du souligné.
    if (mark === '__' && parts[i] !== GAP_TOKEN) {
      if (parts[i]!.endsWith(GAP_TOKEN)) {
        parts[i] = parts[i]!.slice(0, -GAP_TOKEN.length).replace(/ +$/, '')
        parts[i + 1] = ' ' + GAP_TOKEN + parts[i + 1]!
      }
      if (parts[i]!.startsWith(GAP_TOKEN)) {
        parts[i] = parts[i]!.slice(GAP_TOKEN.length).replace(/^ +/, '')
        parts[i - 1] = parts[i - 1]! + GAP_TOKEN + ' '
      }
    }
  }
  return parts.join(mark)
}

/** Même chose pour l'italique `*…*`, une fois le gras `**` mis de côté. */
function tidyItalic(text: string): string {
  const BOLD = '\u0002'
  return tidyPairs(text.split('**').join(BOLD), '*').split(BOLD).join('**')
}

/** `{red}intermédiaires {/red}ne` devient `{red}intermédiaires{/red} ne`. */
function tidyColors(text: string): string {
  return text
    .replace(/\{(\w+)\}([^{}]*?) +\{\/\1\}/g, '{$1}$2{/$1} ')
    .replace(/\{(\w+)\} +([^{}]*?)\{\/\1\}/g, ' {$1}$2{/$1}')
}

/** Une ligne de tableau (`| … | … |`) garde l'alignement qu'on lui a donné. */
const TABLE_LINE = /^\s*\|/

/** Les retouches qui ne valent que ligne à ligne : espaces en trop, espace avant `,` ou `.`. */
function tidySpaces(line: string): string {
  let out = line
  if (!TABLE_LINE.test(out)) {
    out = out.replace(/(\S) {2,}(?=\S)/g, '$1 ')
    // Une espace avant une ponctuation simple n'a pas lieu d'être ; celles
    // du français (avant `;`, `:`, `?`, `»`) restent.
    out = out.replace(/(\S) +([,.])(?=\s|$)/g, '$1$2')
  }
  return out.replace(/ +$/, '')
}

/** Met en forme un paragraphe (des lignes consécutives non vides). */
function tidyParagraph(paragraph: string): string {
  let out = paragraph.split(GAP).join(GAP_TOKEN)
  out = out.replace(/’/g, "'")
  out = tidyPairs(out, '**')
  out = tidyPairs(out, '__')
  out = tidyItalic(out)
  out = tidyColors(out)
  out = out
    .split('\n')
    .map((line) => tidySpaces(line))
    .join('\n')
  return out.split(GAP_TOKEN).join(GAP)
}

/**
 * Met en forme un texte riche (rappel, phrase de carte, explication),
 * paragraphe par paragraphe : les lignes vides séparent les paragraphes, et
 * aucune marque ne s'apparie par-dessus.
 */
export function tidyText(text: string): string {
  const out: string[] = []
  let block: string[] = []
  const flush = () => {
    if (block.length > 0) out.push(tidyParagraph(block.join('\n')))
    block = []
  }
  for (const line of text.split('\n')) {
    if (line.trim()) block.push(line)
    else {
      flush()
      out.push(line.replace(/ +$/, ''))
    }
  }
  flush()
  return out.join('\n')
}

/** Une seule ligne : un titre, ou une ligne prise isolément. */
export function tidyLine(line: string): string {
  return tidyText(line)
}

/**
 * Une phrase de carte : mise en forme ligne par ligne, puis débarrassée des
 * espaces de bord. Un `\ ` de fin de ligne (échappement YAML laissé par un
 * copier-coller) disparaît aussi : il n'ajoutait qu'une espace invisible.
 */
export function tidySentence(sentence: string): string {
  return tidyText(sentence.replace(/\\ ?(?=\n)/g, '')).trim()
}

/** Réponse ou variante : sans espace de bord ni double espace. */
export function tidyAnswer(answer: string): string {
  return answer.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim()
}

/** Variantes : mises en forme, sans doublon, sans vide, sans répéter la réponse. */
export function tidyAlt(alt: readonly string[], answer: string): string[] {
  const seen = new Set<string>([tidyAnswer(answer)])
  const out: string[] = []
  for (const value of alt) {
    const tidy = tidyAnswer(value)
    if (!tidy || seen.has(tidy)) continue
    seen.add(tidy)
    out.push(tidy)
  }
  return out
}

export interface TidyPoint {
  sentence: string
  answer: string
  alt?: string[]
  explanation?: string
}

/** Met en forme les champs d'une carte, sans rien changer d'autre. */
export function tidyPoint<T extends TidyPoint>(point: T): T {
  const answer = tidyAnswer(point.answer)
  const next: T = { ...point, sentence: tidySentence(point.sentence), answer }
  if (point.alt) next.alt = tidyAlt(point.alt, answer)
  if (point.explanation !== undefined) next.explanation = tidySentence(point.explanation)
  return next
}

/**
 * Les défauts d'une carte qui demandent un choix, donc qu'on signale sans
 * les corriger : pas de trou, réponse vide, nombre de réponses différent du
 * nombre de trous (voir `splitGaps` dans `src/engine/exercises.ts`).
 */
export function pointProblems(point: TidyPoint): string[] {
  const problems: string[] = []
  const gaps = point.sentence.split(GAP).length - 1
  if (gaps === 0) problems.push('la phrase n\'a pas de trou (___)')
  if (!point.answer.trim()) problems.push('la réponse est vide')
  if (gaps > 1) {
    const answers = point.answer.split(';').length
    if (answers !== gaps) problems.push(`${gaps} trous mais ${answers} réponse(s) séparée(s) par « ; »`)
  }
  return problems
}
