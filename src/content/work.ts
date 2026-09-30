import type { GrammarPoint, Work, WorkContext, WorkLink, WorkNode, WorkRelation } from './schema'

/**
 * Parcours du plan d'une unité-œuvre (voir `workSchema`) : de quoi dériver ses
 * leçons, retrouver où se trouve une thèse, et dessiner les relations.
 */

/**
 * Les schémas de l'unité-œuvre, archivés le 2026-09-29 : le plan dessiné (lu
 * en tête de leçon, `work-map`, et ouvert par « Voir la carte »), et le plan
 * à trous qui s'y joue (`work-plan`). Tout leur code reste en place
 * (`WorkTree`, `WorkMapNote`, `WorkPlan`, `WorkSheet`, `workPlansFor`) :
 * repasser ce drapeau à `true` les réactive partout. Sans eux, l'unité-œuvre
 * fait restituer, localiser, associer et remettre dans l'ordre.
 */
export const WORK_DIAGRAMS = false

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

const plainText = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
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
const TITLE_STOPWORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'a', 'et', 'd', 'sur'])

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
}

/**
 * Une référence d'œuvre (« Métaphysique, Θ, 6 », « Poétique, 4 »,
 * « Éthique à Nicomaque, I, 2-3 ») : un titre, puis livre et chapitre.
 * `null` pour un emplacement d'une autre forme (« II, 4 », « §16 »).
 */
export function workReferenceOf(label: string): WorkReference | null {
  const comma = label.indexOf(',')
  if (comma <= 0 || label.trim().startsWith('§')) return null
  const title = plainText(label.slice(0, comma))
  const allWords = title.split(/[^a-z]+/).filter(Boolean)
  if (!allWords.some((word) => word.length >= 3 && fromRoman(word) === null)) return null
  const words = allWords.filter((word) => !TITLE_STOPWORDS.has(word))
  const initials = [...new Set([words, allWords.filter((word) => word.length > 1)].map((list) => list.map((w) => w[0]).join('')))]
  const numbers: number[] = []
  let greek = false
  for (const token of label.slice(comma + 1).split(/[\s,.;-]+/).filter(Boolean)) {
    if (/^\d+$/.test(token)) numbers.push(Number(token))
    else if (GREEK_BOOKS[token] !== undefined) {
      numbers.push(GREEK_BOOKS[token]!)
      greek = true
    } else {
      const roman = fromRoman(token.toLowerCase())
      if (roman === null) return null
      numbers.push(roman)
    }
  }
  if (numbers.length === 0) return null
  return { words, initials, numbers, range: /\d\s*-\s*\d+\s*$/.test(label), greek }
}

/**
 * Une référence d'œuvre se saisit avec son titre, en entier, abrégé
 * (« Métaph. », « Pol. ») ou en sigle (« EN », « GM »), puis livre et
 * chapitre sous toutes leurs formes : chiffres romains ou arabes, lettre ou
 * nom grec (« Θ », « theta », « 9 », « IX »). Le titre est exigé : sans lui,
 * « I, 1 » désignerait aussi bien les *Topiques* que l'*Éthique*. Un
 * intervalle de chapitres (« I, 2-3 ») se désigne aussi par son début.
 */
function matchesWorkReference(reference: WorkReference, value: string): boolean {
  const tokens = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s,.;:()'’-]+/)
    .filter(Boolean)
  const numbers: number[][] = []
  const titleWords: string[] = []
  for (const token of tokens) {
    const lower = token.toLowerCase()
    const candidates = new Set<number>()
    if (/^\d+$/.test(lower)) candidates.add(Number(lower))
    const roman = fromRoman(lower)
    if (roman !== null) candidates.add(roman)
    if (GREEK_BOOKS[token] !== undefined) candidates.add(GREEK_BOOKS[token]!)
    if (GREEK_BOOKS[token.toUpperCase()] !== undefined) candidates.add(GREEK_BOOKS[token.toUpperCase()]!)
    if (GREEK_NAMES[lower] !== undefined) candidates.add(GREEK_NAMES[lower]!)
    if (reference.greek && GREEK_LOOKALIKES[lower] !== undefined) candidates.add(GREEK_LOOKALIKES[lower]!)
    if (candidates.size > 0 && (numbers.length > 0 || titleWords.length > 0)) numbers.push([...candidates])
    else if (/^[a-z]+$/.test(lower) && !TITLE_STOPWORDS.has(lower)) titleWords.push(lower)
    else if (!TITLE_STOPWORDS.has(lower)) return false
  }
  if (titleWords.length === 0) return false
  const titled = titleWords.every(
    (word) => reference.initials.includes(word) || reference.words.some((each) => each.startsWith(word)),
  )
  if (!titled) return false
  const wanted = [reference.numbers, ...(reference.range ? [reference.numbers.slice(0, -1)] : [])]
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

/** Chapitres par manche de plan à trous : au-delà, une suite de chapitres se coupe en manches égales. */
const PLAN_ROUND_MAX = 4

/**
 * Les manches du plan à trous d'une partie : chacune porte sur un même niveau
 * du schéma, là où les chapitres se ressemblent assez pour qu'on les
 * confonde. Des chapitres de même plan forment une manche (chapitres 1 à 3,
 * 8 à 10 du livre II) ; les chapitres qui s'enchaînent entre deux tels
 * groupes en forment une autre (4 à 7, puis 11 et 12), coupée en manches
 * égales au-delà de quatre. Un chapitre qui resterait seul rejoint la manche
 * voisine : seul, il n'aurait rien à différencier.
 */
export function planRoundsOf(root: WorkNode): WorkNode[][] {
  const rounds: WorkNode[][] = []
  let run: WorkNode[] = []
  const flush = () => {
    const count = Math.ceil(run.length / PLAN_ROUND_MAX)
    const size = Math.ceil(run.length / Math.max(count, 1))
    for (let start = 0; start < run.length; start += size) rounds.push(run.slice(start, start + size))
    run = []
  }
  const visit = (node: WorkNode) => {
    if (isLeaf(node)) {
      if (node.points.length > 0) run.push(node)
      return
    }
    const parallel = node.parts.length > 1 && node.parts.slice(1).every((part) => part.rel === 'declinaison')
    if (parallel && node.parts.every(isLeaf)) {
      flush()
      rounds.push(node.parts.filter((part) => part.points.length > 0))
      return
    }
    node.parts.forEach(visit)
  }
  visit(root)
  flush()

  // Une manche d'un seul chapitre rejoint la précédente (la suivante, en tête).
  const merged: WorkNode[][] = []
  for (const round of rounds) {
    if (round.length === 0) continue
    const last = merged[merged.length - 1]
    if (round.length === 1 && last) last.push(...round)
    else merged.push([...round])
  }
  if (merged.length > 1 && merged[0]!.length === 1) merged[1]!.unshift(...merged.shift()!)
  return merged
}

/** Ce que le plan à trous fait replacer dans la case d'un chapitre : son argument, à défaut son affirmation. */
export function planTextOf(node: WorkNode): string {
  return node.reason ? `car ${node.reason}` : headlineOf(node)
}

/** Ce que la carte affirme d'un chapitre : son affirmation, à défaut le titre de l'auteur. */
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

/** Les parties qui mènent de la racine jusqu'à `id`, elle comprise. */
function pathTo(nodes: readonly WorkNode[], id: string): WorkNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node]
    const rest = pathTo(node.parts, id)
    if (rest) return [node, ...rest]
  }
  return null
}

/**
 * Un lien que le plan dessine déjà : la partie d'arrivée, ou l'un des blocs
 * qui la contiennent, suit immédiatement une partie qui contient celle de
 * départ, avec la même relation. Le lien 6 → 7 du *Contrat social* n'a pas
 * besoin d'être signalé à part quand la flèche du chapitre 6 vers le bloc
 * des chapitres 7 à 12 le montre déjà : il n'existe que pour porter sa carte.
 */
export function isDrawn(work: Work, link: WorkLink): boolean {
  const path = pathTo(work.parts, link.to)
  if (!path) return false
  return path.some((node, depth) => {
    const siblings = depth === 0 ? work.parts : path[depth - 1]!.parts
    const previous = siblings[siblings.indexOf(node) - 1]
    return node.rel === link.rel && previous !== undefined && nodesOf(previous).some((each) => each.id === link.from)
  })
}

/** Les liens éloignés qui partent de ou arrivent à une partie, sauf ceux que le plan dessine déjà. */
export function linksOf(work: Work, nodeId: string): { link: WorkLink; other: WorkNode | null; outgoing: boolean }[] {
  return work.links
    .filter((link) => (link.from === nodeId || link.to === nodeId) && !isDrawn(work, link))
    .map((link) => {
      const outgoing = link.from === nodeId
      return { link, outgoing, other: findNode(work, outgoing ? link.to : link.from) }
    })
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
