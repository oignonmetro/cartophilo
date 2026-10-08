import type { TreatiseEntry } from '@/content/schema'
import type {
  Exercise,
  TreatiseChoiceExercise,
  TreatiseColumn,
  TreatiseGhostExercise,
  TreatiseLink,
  TreatiseMatchExercise,
} from './exercises'
import { createRng, sample, seedFrom, shuffle, type Rng } from './rng'

/**
 * Repérage général dans les traités d'un auteur (Plotin : 54 traités).
 *
 * Un traité se dit de trois façons, comme les colonnes d'un tableau : son
 * titre, sa numérotation (« 53 [I, 1] ») et, pour ceux qui en ont, ses thèses
 * principales. Un exercice ne teste jamais « un traité » en bloc : il fait
 * établir un **lien** entre deux colonnes (titre ↔ numérotation, titre ↔
 * thèse, numérotation ↔ thèse), et chaque bonne ou mauvaise association est
 * retenue pour *ce* traité et *ce* lien.
 *
 * Les exercices n'existent pas d'avance : une séance réserve des places
 * (`treatiseGhosts`), et chaque exercice se forme au moment de l'ouvrir
 * (`materializeTreatise`), par un hasard réglé sur ce que l'apprenant sait
 * alors : les liens pas encore réussis passent d'abord, et un traité qui vient
 * d'être maîtrisé laisse aussitôt sa place à un nouveau.
 *
 * Trois choses restent séparées, pour que d'autres types d'exercices puissent
 * venir sans toucher à l'ordre d'apprentissage :
 *   1. l'ordre d'arrivée des traités (`learningOrder`) ;
 *   2. ce qui valide un traité (`isValidated`) ;
 *   3. la façon de former les exercices.
 */

/** Nombre de traités en cours d'apprentissage : ni plus, ni moins (tant qu'il en reste à apprendre). */
export const ACTIVE_COUNT = 6

export const LINKS: readonly TreatiseLink[] = ['title-number', 'title-thesis', 'number-thesis']

const LINK_COLUMNS: Record<TreatiseLink, [TreatiseColumn, TreatiseColumn]> = {
  'title-number': ['title', 'number'],
  'title-thesis': ['title', 'thesis'],
  'number-thesis': ['number', 'thesis'],
}

/** Ce qu'on retient d'un lien : ses associations justes (du premier coup) et fausses. */
export interface LinkRecord {
  right: number
  wrong: number
}

/**
 * Ce qu'on retient de chaque traité, lien par lien. `right` et `thesis` sont
 * les comptes d'avant les liens : réussites sur la numérotation, puis sur les
 * thèses (titre ↔ thèse).
 */
export interface TreatiseRecord {
  right?: number
  wrong?: number
  thesis?: number
  links?: Partial<Record<TreatiseLink, LinkRecord>>
}

export type TreatiseProgress = Record<string, TreatiseRecord>

export const ENNEAD_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

/** « 53 [I, 1] » : rang chronologique, puis place chez Porphyre. */
export function numberingOf(entry: TreatiseEntry): string {
  return `${entry.chrono} [${ENNEAD_NUMERALS[entry.ennead - 1]}, ${entry.numberInEnnead}]`
}

function hasColumn(entry: TreatiseEntry, column: TreatiseColumn): boolean {
  return column !== 'thesis' || Boolean(entry.theses && entry.theses.length > 0)
}

/** Ce que dit un traité dans une colonne ; une thèse est tirée parmi les siennes (« ou » : jamais deux dans un même exercice). */
function valueIn(entry: TreatiseEntry, column: TreatiseColumn, rng: Rng): string {
  if (column === 'title') return entry.title
  if (column === 'number') return numberingOf(entry)
  return entry.theses![Math.floor(rng() * entry.theses!.length)]!
}

/** Les liens que ce traité permet d'établir : tous, s'il a des thèses ; sa numérotation seule sinon. */
export function linksOf(entry: TreatiseEntry): TreatiseLink[] {
  return LINKS.filter((link) => LINK_COLUMNS[link].every((column) => hasColumn(entry, column)))
}

/**
 * Ordre d'arrivée des traités : d'abord ceux qui ont un rang (`priority`, dans
 * l'ordre de ce rang), puis les autres traités en gras (`highlight`), puis le
 * reste ; chaque groupe, hors rang, dans l'ordre de Porphyre.
 */
export function learningOrder(entries: readonly TreatiseEntry[]): TreatiseEntry[] {
  const byPorphyry = (a: TreatiseEntry, b: TreatiseEntry) =>
    a.ennead - b.ennead || a.numberInEnnead - b.numberInEnnead
  const sorted = entries.slice().sort(byPorphyry)
  const ranked = sorted.filter((entry) => entry.priority !== undefined).sort((a, b) => a.priority! - b.priority!)
  const rest = sorted.filter((entry) => entry.priority === undefined)
  return [...ranked, ...rest.filter((entry) => entry.highlight), ...rest.filter((entry) => !entry.highlight)]
}

/** Associations justes d'un traité sur un lien (les comptes d'avant les liens y sont repris). */
export function rightsOn(record: TreatiseRecord | undefined, link: TreatiseLink): number {
  const legacy = link === 'title-number' ? (record?.right ?? 0) : link === 'title-thesis' ? (record?.thesis ?? 0) : 0
  return Math.max(record?.links?.[link]?.right ?? 0, legacy)
}

function wrongsOn(record: TreatiseRecord | undefined, link: TreatiseLink): number {
  return record?.links?.[link]?.wrong ?? 0
}

/**
 * Un traité est « ponctuellement maîtrisé » quand chacun des liens qui le
 * concernent a eu une bonne association du premier coup. La seule définition de
 * la connaissance d'un traité : voir l'en-tête du fichier.
 */
export function isValidated(entry: TreatiseEntry, record: TreatiseRecord | undefined): boolean {
  return linksOf(entry).every((link) => rightsOn(record, link) >= 1)
}

/** Les traités en cours d'apprentissage : les `ACTIVE_COUNT` premiers non maîtrisés, dans l'ordre d'arrivée. */
export function activeTreatises(entries: readonly TreatiseEntry[], progress: TreatiseProgress): TreatiseEntry[] {
  return learningOrder(entries)
    .filter((entry) => !isValidated(entry, progress[entry.id]))
    .slice(0, ACTIVE_COUNT)
}

export function validatedCount(entries: readonly TreatiseEntry[], progress: TreatiseProgress): number {
  return entries.filter((entry) => isValidated(entry, progress[entry.id])).length
}

// --- hasard réglé -------------------------------------------------------------

/** Ce qui reste à réussir sur un lien, et les erreurs passées : le poids de cette association dans le tirage. */
function need(link: TreatiseLink, record: TreatiseRecord | undefined): number {
  return (rightsOn(record, link) === 0 ? 3 : 0) + Math.min(wrongsOn(record, link), 3)
}

function weightedPick<T>(items: readonly T[], weight: (item: T) => number, rng: Rng): T {
  const weights = items.map((item) => Math.max(0.1, weight(item)))
  let roll = rng() * weights.reduce((sum, w) => sum + w, 0)
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return items[i]!
  }
  return items[items.length - 1]!
}

/** Distance entre deux traités : les confusions se font entre voisins (même Ennéade, rangs proches). */
function distance(a: TreatiseEntry, b: TreatiseEntry): number {
  return Math.abs(a.chrono - b.chrono) + (a.ennead === b.ennead ? 0 : 6) + Math.abs(a.numberInEnnead - b.numberInEnnead)
}

const OPTIONS = 4
const BOARD_SIZE = 4
const MIN_BOARD = 3

/** Les traités qu'une séance fait travailler maintenant, et si c'est de la remise à niveau (tous maîtrisés). */
function targetsOf(entries: readonly TreatiseEntry[], progress: TreatiseProgress, rng: Rng) {
  const active = activeTreatises(entries, progress)
  if (active.length > 0) return { targets: active, practice: false }
  return { targets: sample(entries, Math.min(ACTIVE_COUNT, entries.length), rng), practice: true }
}

function formMatch(
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  id: string,
  rng: Rng,
): TreatiseMatchExercise | null {
  const { targets, practice } = targetsOf(entries, progress, rng)
  const candidates = LINKS.map((link) => ({ link, pool: targets.filter((entry) => linksOf(entry).includes(link)) })).filter(
    ({ pool }) => pool.length >= MIN_BOARD,
  )
  if (candidates.length === 0) return null

  // Le lien qui reste le plus à réussir sur ces traités passe le plus souvent.
  const { link, pool } = weightedPick(
    candidates,
    (candidate) => candidate.pool.reduce((sum, entry) => sum + need(candidate.link, progress[entry.id]), 0),
    rng,
  )
  // Les traités qui ont le plus à y gagner d'abord, au hasard à besoin égal.
  const group = shuffle(pool, rng)
    .sort((a, b) => need(link, progress[b.id]) - need(link, progress[a.id]))
    .slice(0, BOARD_SIZE)

  const flipped = rng() < 0.5
  const columns = (flipped ? [...LINK_COLUMNS[link]].reverse() : LINK_COLUMNS[link]) as [TreatiseColumn, TreatiseColumn]
  return {
    kind: 'treatise-match',
    id,
    link,
    columns,
    pairs: group.map((entry) => ({
      id: entry.id,
      left: valueIn(entry, columns[0], rng),
      right: valueIn(entry, columns[1], rng),
    })),
    ...(practice ? { practice } : {}),
  }
}

function formChoice(
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  id: string,
  rng: Rng,
): TreatiseChoiceExercise {
  const { targets, practice } = targetsOf(entries, progress, rng)
  const target = weightedPick(
    targets,
    (entry) => linksOf(entry).reduce((sum, link) => sum + need(link, progress[entry.id]), 0),
    rng,
  )
  const links = linksOf(target)
  const unfinished = links.filter((link) => rightsOn(progress[target.id], link) === 0)
  const link = sample(unfinished.length > 0 ? unfinished : links, 1, rng)[0]!
  const [a, b] = LINK_COLUMNS[link]
  const [from, to] = rng() < 0.5 ? [a, b] : [b, a]

  // Leurres : des traités qui ont la même colonne, plutôt voisins (les thèses, plutôt que des voisins, parmi celles qui existent).
  const pool = entries.filter((entry) => entry.id !== target.id && hasColumn(entry, to))
  const near =
    to === 'thesis' ? shuffle(pool, rng) : pool.sort((x, y) => distance(target, x) - distance(target, y)).slice(0, 8)
  const others = sample(near, Math.min(OPTIONS - 1, near.length), rng)
  const answer = valueIn(target, to, rng)
  const options = shuffle([answer, ...others.map((entry) => valueIn(entry, to, rng))], rng)
  return {
    kind: 'treatise-choice',
    id,
    link,
    from,
    to,
    entryId: target.id,
    prompt: valueIn(target, from, rng),
    answer,
    options,
    ...(practice ? { practice } : {}),
  }
}

/** Rythme d'une séance : une manche d'association, puis deux QCM. */
const SHAPES = ['match', 'choice', 'choice'] as const

/** Nombre d'exercices d'une séance. */
export const SESSION_LENGTH = 12

/** Les places d'une séance : rien n'est formé encore, voir `materializeTreatise`. */
export function treatiseGhosts(count = SESSION_LENGTH): TreatiseGhostExercise[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: 'treatise-ghost',
    id: `treatise-ghost:${index}`,
    shape: SHAPES[index % SHAPES.length]!,
  }))
}

/**
 * Forme l'exercice d'une place réservée, d'après ce que l'apprenant sait des
 * traités à cet instant : un tirage pondéré par ce qui reste à réussir, jamais
 * deux thèses d'un même traité dans un exercice, et un traité maîtrisé
 * remplacé aussitôt par le suivant. Une manche qui manquerait de traités se
 * rabat sur un QCM.
 */
export function materializeTreatise(
  ghost: TreatiseGhostExercise,
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  seed: number,
): Exercise {
  const rng = createRng(seedFrom(seed, ghost.id, Object.keys(progress).length))
  if (ghost.shape === 'match') {
    const match = formMatch(entries, progress, ghost.id, rng)
    if (match) return match
  }
  return formChoice(entries, progress, ghost.id, rng)
}
