import type { GrammarPoint, Work, WorkContext, WorkLink, WorkNode, WorkRelation } from './schema'

/**
 * Parcours du plan d'une unité-œuvre (voir `workSchema`) : de quoi dériver ses
 * leçons, retrouver où se trouve une thèse, et dessiner les relations.
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
    .replace(/\b(livre|chapitres?|chap|ch)\b\.?/g, ' ')
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
  const expected = numbersOf(label)
  const given = numbersOf(value)
  if (expected.length === 2 && given.length > 0) {
    if (given.length === 1) return given[0] === expected[1]
    return given.length === 2 && given[0] === expected[0] && given[1] === expected[1]
  }
  const plain = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
  return plain(value).length > 0 && plain(value) === plain(label)
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
