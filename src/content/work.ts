import type { GrammarPoint, Work, WorkContext, WorkLink, WorkNode, WorkRelation } from './schema'

/**
 * Parcours du plan d'une unité-œuvre (voir `workSchema`) : de quoi dériver ses
 * leçons, et retrouver où se trouve une thèse.
 */

/** Libellé affiché de chaque relation, sans ponctuation expressive. */
export const RELATION_LABELS: Record<WorkRelation, string> = {
  declinaison: 'même plan',
  limite: 'limite',
  application: 'application',
  consequence: 'conséquence',
  'probleme-solution': 'problème → solution',
  'changement-de-question': 'changement de question',
  reprise: 'reprise',
  'objection-reponse': 'objection → réponse',
}

/**
 * L'emplacement tel que la carte d'un livre l'écrit : « chap. 3 » plutôt que
 * « II, 3 », le livre allant de soi à l'intérieur de son propre plan. Une
 * carte de révision, qui revient seule, garde l'emplacement complet.
 */
export function shortLabel(label: string): string {
  const match = /^[IVXLCDM]+, (.+)$/.exec(label)
  return match ? `chap. ${match[1]}` : label
}

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }

/** « iv » → 4 ; `null` si ce ne sont pas des chiffres romains. */
function fromRoman(text: string): number | null {
  if (!/^[ivxlcdm]+$/.test(text)) return null
  let total = 0
  for (let i = 0; i < text.length; i++) {
    const value = ROMAN[text[i]!]!
    const next = ROMAN[text[i + 1] ?? ''] ?? 0
    total += value < next ? -value : value
  }
  return total
}

/** Les nombres d'un emplacement, dans l'ordre : « II, 4 » → [2, 4], « chap. 4 » → [4]. */
function numbersOf(text: string): number[] {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(livre|chapitres?|chap|ch|paragraphes?)\b\.?/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  const numbers = words.map((word) => (/^\d+$/.test(word) ? Number(word) : fromRoman(word)))
  return numbers.every((n) => n !== null) ? (numbers as number[]) : []
}

/**
 * Un emplacement saisi au clavier désigne-t-il `label` ? Pour « II, 4 », on
 * accepte « II, 4 », « II 4 », « 2, 4 », « 2.4 », « livre II chap. 4 », mais
 * aussi le chapitre seul (« 4 », « chap. 4 », « chapitre 4 ») : le livre va
 * de soi, puisque la question porte sur un livre donné. S'il est précisé, il
 * doit être le bon. Un emplacement d'une autre forme se compare tel quel, à
 * la casse et aux accents près.
 */
export function matchesLocation(label: string, value: string): boolean {
  const stephanus = stephanusStart(label)
  if (stephanus) return matchesStephanus(label, stephanus, value)
  const reference = workReferenceOf(label)
  if (reference) return matchesWorkReference(reference, value)
  const expected = numbersOf(label)
  const given = numbersOf(value)
  // Un paragraphe (« §16 », « §10-12 », œuvres découpées en paragraphes
  // numérotés, comme la troisième Critique) : ses seuls numéros suffisent
  // (« 16 », « § 16 », « paragraphe 16 »), sans quoi « §10-12 » passerait
  // pour le livre 10, chapitre 12.
  if (/^§+\s*\d+(\s*-\s*\d+)?$/.test(label.trim())) {
    return given.length === expected.length && given.every((n, i) => n === expected[i])
  }
  if (expected.length === 2 && given.length > 0) {
    if (given.length === 1) return given[0] === expected[1]
    return given.length === 2 && given[0] === expected[0] && given[1] === expected[1]
  }
  const plain = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
  return plain(value).length > 0 && plain(value) === plain(label)
}

const plainText = (text: string) =>
  text.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '')
const STEPHANUS = /(\d+)\s*([a-e])(?![a-z])/

/**
 * Le début d'une pagination Stephanus (ou Bekker) : « Banquet, 203c-204a »
 * → 203, c. `null` pour un emplacement d'une autre forme (« II, 4 », « §16 »).
 */
export function stephanusStart(label: string): { page: number; letter: string } | null {
  const match = STEPHANUS.exec(plainText(label))
  return match ? { page: Number(match[1]), letter: match[2]! } : null
}

/**
 * Un texte repéré par sa pagination (« Banquet, 203c-204a ») se désigne par
 * sa page de départ, lettre facultative (« 203 », « 203c », « 203c-204a »),
 * l'œuvre en plus si l'on veut (« Banquet 203c », « Rép. VII 514a ») : ses
 * mots doivent alors être ceux du repère, ou leur début.
 */
function matchesStephanus(label: string, start: { page: number; letter: string }, value: string): boolean {
  const typed = plainText(value)
  const first = /(\d+)\s*([a-e])?(?![a-z])/.exec(typed)
  if (!first || Number(first[1]) !== start.page) return false
  if (first[2] && first[2] !== start.letter) return false
  const known = plainText(label).split(/[^a-z]+/).filter(Boolean)
  const words = typed
    .replace(/\d+\s*[a-e]?(?![a-z])/g, ' ')
    .split(/[^a-z]+/)
    .filter((word) => word.length > 1)
  return words.every((word) => known.some((each) => each.startsWith(word)))
}

/** Livres de la *Métaphysique*, désignés par une lettre grecque (Α, α, Β, Γ…). */
const GREEK_BOOKS: Record<string, number> = {
  Α: 1, α: 2, Β: 3, Γ: 4, Δ: 5, Ε: 6, Ζ: 7, Η: 8, Θ: 9, Ι: 10, Κ: 11, Λ: 12, Μ: 13, Ν: 14,
}
const GREEK_NAMES: Record<string, number> = {
  alpha: 1, beta: 3, gamma: 4, delta: 5, epsilon: 6, zeta: 7, eta: 8, theta: 9, iota: 10, kappa: 11, lambda: 12, mu: 13, nu: 14,
}
/** Lettres latines qu'on tape pour la majuscule grecque qui leur ressemble. */
const GREEK_LOOKALIKES: Record<string, number> = { a: 1, b: 3, e: 6, z: 7, h: 8, k: 11, n: 14 }
const TITLE_STOPWORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'a', 'au', 'aux', 'et', 'd', 'sur', 'pour', 'qu', 'que', 'ce', 'est', 'une', 'un',
])
/** Mots qui annoncent une division (« art. 4 », « déf. I », « objection VII ») : ils ne comptent pas. */
const DIVISION_WORDS = new Set([
  'art', 'article', 'articles', 'def', 'definition', 'definitions', 'partie', 'part',
  'objection', 'obj', 'rep', 'reponse', 'lettre', 'preface', 'chap', 'chapitre', 'ch', 'livre', 'liv', 'proposition',
  'prop', 'section', 'sect', 'promenade',
])
const MONTHS = new Set([
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
])
/** « 7 », « VII », « 7e », « 7eme » → 7 ; `null` sinon. */
function divisionNumber(token: string): number | null {
  const ordinal = /^(\d+)(e|eme|er|ere)?$/.exec(token)
  if (ordinal) return Number(ordinal[1])
  return fromRoman(token)
}

interface WorkReference {
  /** Mots du titre qui comptent (« ethique », « nicomaque »), sans accents. */
  words: string[]
  /** Sigles admis : « en » pour *Éthique à Nicomaque*, « gm » pour *Grande Morale*. */
  initials: string[]
  /** Livre et chapitre(s) : « Θ, 6 » → [9, 6] ; « I, 2-3 » → [1, 2, 3]. */
  numbers: number[]
  /** La référence finit par un intervalle (« 2-3 ») : son début seul suffit. */
  range: boolean
  /** Le livre est une lettre grecque : une lettre latine semblable est admise. */
  greek: boolean
  /** Une date (« 9 février 1645 ») : l'année seule, ou rien, suffit. */
  dated: boolean
  /**
   * Mots qui nomment la division (« Dialectique », « Introduction ») : ils
   * distinguent deux endroits d'une même œuvre, et se tapent donc tous,
   * abrégés si l'on veut.
   */
  keywords: string[]
}

/**
 * Une référence d'œuvre (« Métaphysique, Θ, 6 », « Poétique, 4 »,
 * « Éthique à Nicomaque, I, 2-3 ») : un titre, puis livre et chapitre.
 * `null` pour un emplacement d'une autre forme (« II, 4 », « §16 »).
 */
export function workReferenceOf(label: string): WorkReference | null {
  if (label.trim().startsWith('§')) return null
  const comma = label.indexOf(',')
  const titlePart = comma > 0 ? label.slice(0, comma) : label
  const allWords = plainText(titlePart).split(/[^a-z]+/).filter(Boolean)
  if (!allWords.some((word) => word.length >= 3 && fromRoman(word) === null)) return null
  const words = allWords.filter((word) => !TITLE_STOPWORDS.has(word))
  // « Préface », « Remarque » seuls : un emplacement nommé, non une œuvre.
  if (comma <= 0 && words.every((word) => DIVISION_WORDS.has(word))) return null
  const initials = [...new Set([words, allWords.filter((word) => word.length > 1)].map((list) => list.map((w) => w[0]).join('')))]
  const numbers: number[] = []
  const keywords: string[] = []
  let greek = false
  let dated = false
  const rest = comma > 0 ? label.slice(comma + 1) : ''
  for (const token of rest.split(/[\s,.;:'’§?!()-]+/).filter(Boolean)) {
    const plain = plainText(token)
    if (GREEK_BOOKS[token] !== undefined) {
      numbers.push(GREEK_BOOKS[token]!)
      greek = true
    } else if (MONTHS.has(plain)) dated = true
    else if (DIVISION_WORDS.has(plain) || TITLE_STOPWORDS.has(plain)) continue
    else {
      const number = divisionNumber(plain)
      if (number !== null) numbers.push(number)
      else if (/^[a-z]+$/.test(plain)) keywords.push(plain)
      else return null
    }
  }
  return { words, initials, numbers, range: /\d\s*-\s*\d+\s*$/.test(label), greek, dated, keywords }
}

/**
 * Une référence d'œuvre se saisit avec son titre, en entier, abrégé
 * (« Métaph. », « Pol. ») ou en sigle (« EN », « GM », « CRP »), puis livre,
 * chapitre ou paragraphe sous toutes leurs formes : chiffres romains ou
 * arabes, ordinaux (« 4e »), lettre ou nom grec (« Θ », « theta », « IX »).
 * Le titre est exigé : sans lui, « I, 1 » désignerait aussi bien les
 * *Topiques* que l'*Éthique*. Les mots qui nomment la division
 * (« Dialectique », « Introduction ») sont exigés aussi, abrégés si l'on
 * veut ; les mots qui l'annoncent seulement (« partie », « art. »,
 * « préface ») sont facultatifs. Un intervalle de chapitres (« I, 2-3 ») se
 * désigne aussi par son début ; une lettre, par son destinataire.
 */
function matchesWorkReference(reference: WorkReference, value: string): boolean {
  const tokens = value.split(/[\s,.;:()'’§?!-]+/).filter(Boolean)
  const numbers: number[][] = []
  const words: string[] = []
  for (const token of tokens) {
    const lower = plainText(token)
    if (MONTHS.has(lower) || DIVISION_WORDS.has(lower)) continue
    // Les petits mots du titre (« l' », « d' ») ne sont pas des chiffres romains,
    // sauf la lettre latine qu'on tape pour un livre grec (« Métaphysique A »).
    if (TITLE_STOPWORDS.has(lower) && !(reference.greek && GREEK_LOOKALIKES[lower] !== undefined)) continue
    const candidates = new Set<number>()
    const division = divisionNumber(lower)
    if (division !== null) candidates.add(division)
    if (GREEK_BOOKS[token] !== undefined) candidates.add(GREEK_BOOKS[token]!)
    if (GREEK_BOOKS[token.toUpperCase()] !== undefined) candidates.add(GREEK_BOOKS[token.toUpperCase()]!)
    if (GREEK_NAMES[lower] !== undefined) candidates.add(GREEK_NAMES[lower]!)
    if (reference.greek && GREEK_LOOKALIKES[lower] !== undefined) candidates.add(GREEK_LOOKALIKES[lower]!)
    if (candidates.size > 0 && words.length > 0) numbers.push([...candidates])
    else if (/^[a-z]+$/.test(lower)) words.push(lower)
    else return false
  }
  const inTitle = (word: string) => reference.initials.includes(word) || reference.words.some((each) => each.startsWith(word))
  const inKeywords = (word: string) => reference.keywords.some((each) => each.startsWith(word))
  if (!words.some(inTitle)) return false
  if (!words.every((word) => inTitle(word) || inKeywords(word))) return false
  if (!reference.keywords.every((keyword) => words.some((word) => keyword.startsWith(word) && !inTitle(word)) || words.includes(keyword)))
    return false
  const wanted = [
    reference.numbers,
    ...(reference.range ? [reference.numbers.slice(0, -1)] : []),
    // Une lettre se désigne par son destinataire, l'année en plus si l'on veut.
    ...(reference.dated ? [reference.numbers.slice(-1), []] : []),
  ]
  return wanted.some(
    (expected) => expected.length === numbers.length && expected.every((n, i) => numbers[i]!.includes(n)),
  )
}

/** Toutes les parties d'un sous-arbre, la racine comprise, dans l'ordre du plan. */
export function nodesOf(node: WorkNode): WorkNode[] {
  return [node, ...node.parts.flatMap(nodesOf)]
}

export function allNodes(work: Work): WorkNode[] {
  return work.parts.flatMap(nodesOf)
}

export function findNode(work: Work, id: string): WorkNode | null {
  return allNodes(work).find((node) => node.id === id) ?? null
}

/** Les thèses d'un sous-arbre, dans l'ordre du plan. */
export function pointsOf(node: WorkNode): GrammarPoint[] {
  return nodesOf(node).flatMap((each) => each.points)
}

/**
 * Le fil du raisonnement d'une partie : ses étapes dans l'ordre, chacune
 * étant un chapitre, ou plusieurs chapitres de même plan réunis (leur ordre
 * entre eux est sans portée : on ne demande pas de le retrouver). Pour le
 * livre II du *Contrat social* : chapitres 1 à 3, 4, 5, 6, 7, 8 à 10, 11, 12.
 */
export function threadOf(node: WorkNode): WorkNode[][] {
  if (isLeaf(node)) return [[node]]
  if (node.parts.length > 1 && node.parts.slice(1).every((part) => part.rel === 'declinaison')) {
    return [nodesOf(node).filter((each) => isLeaf(each) && each.points.length > 0)]
  }
  return node.parts.flatMap(threadOf)
}

/** Ce qu'un chapitre affirme : son affirmation, à défaut le titre de l'auteur. */
export function headlineOf(node: WorkNode): string {
  return node.summary ?? node.title ?? node.label
}

/** Une partie qui porte des thèses sans sous-partie : un chapitre, en général. */
export function isLeaf(node: WorkNode): boolean {
  return node.parts.length === 0
}

/**
 * Les liens qui aboutissent dans un sous-arbre : leurs cartes appartiennent à
 * la leçon de la partie où le lien arrive, là où la question se pose.
 */
export function linksInto(work: Work, node: WorkNode): WorkLink[] {
  const ids = new Set(nodesOf(node).map((each) => each.id))
  return work.links.filter((link) => ids.has(link.to))
}

/** Identifiant d'une leçon d'unité-œuvre : l'unité, puis la partie qu'elle couvre. */
export function workLessonId(unitId: string, partId: string): string {
  return `${unitId}-${partId}`
}

/**
 * Les leçons d'une unité-œuvre, une par partie de premier niveau (un livre).
 * Rendues sous forme brute, pour que le compilateur les valide comme des
 * leçons écrites à la main.
 */
export function lessonsFromWork(unitId: string, work: Work) {
  return work.parts.map((part) => ({
    id: workLessonId(unitId, part.id),
    title: part.title ? `${part.label} : ${part.title}` : part.label,
    kind: 'grammar' as const,
    work: part.id,
    points: [...pointsOf(part), ...linksInto(work, part).flatMap((link) => link.points)],
  }))
}

function contextOf(node: WorkNode): WorkContext {
  return { label: node.label, title: node.title, nodeId: node.id }
}

/**
 * Les emplacements entre lesquels localiser une thèse de `nodeId` : les
 * parties à thèses (des chapitres, en général) de la même partie de premier
 * niveau, dans l'ordre du plan. Localiser, c'est situer dans un livre, pas
 * choisir entre deux livres.
 */
export function placesAround(work: Work, nodeId: string): WorkNode[] {
  const top = work.parts.find((part) => nodesOf(part).some((node) => node.id === nodeId))
  return top ? nodesOf(top).filter((node) => node.points.length > 0) : []
}

/** Où se trouve la thèse `pointId` : sa partie, ou le lien dont elle est la carte. */
export function workContextOf(work: Work, pointId: string): WorkContext | undefined {
  for (const node of allNodes(work)) {
    if (node.points.some((point) => point.id === pointId)) return contextOf(node)
  }
  for (const link of work.links) {
    if (!link.points.some((point) => point.id === pointId)) continue
    const from = findNode(work, link.from)
    const to = findNode(work, link.to)
    return { label: `${from?.label ?? link.from} → ${to?.label ?? link.to}`, title: RELATION_LABELS[link.rel] }
  }
  return undefined
}

/**
 * Ce qui remplit chaque trou d'une thèse, dans l'ordre : même répartition que
 * `splitGaps` (exercises.ts), qu'on ne peut importer d'ici sans faire dépendre
 * le contenu du moteur.
 */
export function thesisFills(point: GrammarPoint, gap = '___'): string[] {
  const gaps = point.sentence.split(gap).length - 1
  const pieces = point.answer.split(';').map((piece) => piece.trim())
  return gaps > 1 && pieces.length === gaps ? pieces : Array.from({ length: gaps }, (_, i) => (i === 0 ? point.answer : ''))
}
