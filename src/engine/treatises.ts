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
 * établir un **lien** entre deux colonnes, le titre servant de pivot (titre ↔
 * numérotation, titre ↔ thèse), et chaque bonne ou mauvaise association est
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

export const LINKS: readonly TreatiseLink[] = ['title-number', 'title-thesis']

const LINK_COLUMNS: Record<TreatiseLink, [TreatiseColumn, TreatiseColumn]> = {
  'title-number': ['title', 'number'],
  'title-thesis': ['title', 'thesis'],
}

/** Ce qu'on retient d'un lien : ses associations justes (du premier coup) et fausses. */
export interface LinkRecord {
  right: number
  wrong: number
}

/**
 * Ce qu'on retient de chaque traité, lien par lien. `right` et `thesis` sont
 * les comptes d'avant les liens : réussites sur la numérotation, puis sur les
 * thèses (titre ↔ thèse). Des liens `number-thesis`, abandonnés, peuvent traîner
 * dans une sauvegarde : ils sont ignorés.
 */
export interface TreatiseRecord {
  right?: number
  wrong?: number
  thesis?: number
  links?: Partial<Record<TreatiseLink, LinkRecord>>
  /** Chaque thèse a son propre compte, par rang (0, 1, 2) : en connaître une ne vaut pas connaître les autres. */
  theses?: Record<number, LinkRecord>
  /** Dernière séance où ce traité a été réussi, et nombre de séances différentes où il l'a été. */
  session?: string
  sessions?: number
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

/** Ce que dit un traité dans une colonne ; `thesis` est le rang de la thèse (« ou » : jamais deux dans un même exercice). */
function valueIn(entry: TreatiseEntry, column: TreatiseColumn, thesis = 0): string {
  if (column === 'title') return entry.title
  if (column === 'number') return numberingOf(entry)
  return entry.theses![thesis]!
}

function thesisRecord(record: TreatiseRecord | undefined, index: number): LinkRecord | undefined {
  return record?.theses?.[index]
}

/** Ce qui reste à réussir pour une thèse : jamais réussie d'abord, puis celles où l'on s'est trompé. */
function thesisNeed(record: TreatiseRecord | undefined, index: number): number {
  const known = thesisRecord(record, index)
  return ((known?.right ?? 0) === 0 ? 3 : 0) + Math.min(known?.wrong ?? 0, 3)
}

/** La thèse à faire travailler : une seule par traité, tirée selon ce qui reste à réussir. */
function pickThesis(entry: TreatiseEntry, record: TreatiseRecord | undefined, rng: Rng): number {
  const ranks = (entry.theses ?? []).map((_, index) => index)
  return weightedPick(ranks, (index) => thesisNeed(record, index), rng)
}

/** Les liens que ce traité permet d'établir : sa numérotation, et ses thèses s'il en a. */
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

/** Associations justes d'un traité sur un lien (les comptes d'avant les liens y sont repris). Pour les thèses, voir `isLinkDone`. */
export function rightsOn(record: TreatiseRecord | undefined, link: TreatiseLink): number {
  const legacy = link === 'title-number' ? (record?.right ?? 0) : (record?.thesis ?? 0)
  return Math.max(record?.links?.[link]?.right ?? 0, legacy)
}

function wrongsOn(record: TreatiseRecord | undefined, link: TreatiseLink): number {
  return record?.links?.[link]?.wrong ?? 0
}

/** Un lien est fait quand il a eu une bonne association du premier coup ; pour les thèses, chacune des siennes. */
export function isLinkDone(entry: TreatiseEntry, record: TreatiseRecord | undefined, link: TreatiseLink): boolean {
  if (link === 'title-number') return rightsOn(record, link) >= 1
  return (entry.theses ?? []).every((_, index) => (thesisRecord(record, index)?.right ?? 0) >= 1)
}

/**
 * Un traité est « ponctuellement maîtrisé » quand chacun des liens qui le
 * concernent est fait, toutes ses thèses comprises. C'est la porte d'entrée
 * d'un nouveau traité ; il lui reste à être consolidé (`isAcquired`).
 */
export function isValidated(entry: TreatiseEntry, record: TreatiseRecord | undefined): boolean {
  return linksOf(entry).every((link) => isLinkDone(entry, record, link))
}

/** Séances différentes où un traité doit avoir été réussi pour être « acquis ». */
export const ACQUIRED_SESSIONS = 2

/** Un traité est acquis quand, maîtrisé, il a encore été réussi dans une autre séance. */
export function isAcquired(entry: TreatiseEntry, record: TreatiseRecord | undefined): boolean {
  return isValidated(entry, record) && (record?.sessions ?? 0) >= ACQUIRED_SESSIONS
}

/** Les traités maîtrisés qui attendent leur consolidation, hors ceux réussis dans la séance en cours. */
export function reviewTreatises(
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  session?: string,
): TreatiseEntry[] {
  return entries.filter(
    (entry) =>
      isValidated(entry, progress[entry.id]) &&
      !isAcquired(entry, progress[entry.id]) &&
      progress[entry.id]?.session !== session,
  )
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

export function acquiredCount(entries: readonly TreatiseEntry[], progress: TreatiseProgress): number {
  return entries.filter((entry) => isAcquired(entry, progress[entry.id])).length
}

// --- hasard réglé -------------------------------------------------------------

/** Ce qui reste à réussir sur un lien, et les erreurs passées : le poids de cette association dans le tirage. */
function need(entry: TreatiseEntry, link: TreatiseLink, record: TreatiseRecord | undefined): number {
  if (link === 'title-thesis') {
    return (entry.theses ?? []).reduce((sum, _, index) => sum + thesisNeed(record, index), 0)
  }
  return (rightsOn(record, link) === 0 ? 3 : 0) + Math.min(wrongsOn(record, link), 3)
}

/** Un traité maîtrisé revient pour être consolidé : un poids léger, mais jamais nul. */
const REVIEW_WEIGHT = 1

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

/**
 * Les traités qu'une séance fait travailler maintenant : ceux en cours, plus
 * ceux maîtrisés lors d'une séance précédente qui attendent d'être consolidés.
 * Remise à niveau (rien n'est noté) quand tous sont acquis.
 */
function targetsOf(entries: readonly TreatiseEntry[], progress: TreatiseProgress, session: string, rng: Rng) {
  const active = activeTreatises(entries, progress)
  const review = reviewTreatises(entries, progress, session)
  if (active.length + review.length > 0) return { targets: [...active, ...review], practice: false }
  return { targets: sample(entries, Math.min(ACTIVE_COUNT, entries.length), rng), practice: true }
}

/** Poids d'un traité dans le tirage : ce qui lui reste à réussir, ou le poids léger de la consolidation. */
function weightOf(entry: TreatiseEntry, link: TreatiseLink, progress: TreatiseProgress): number {
  const record = progress[entry.id]
  return isValidated(entry, record) ? REVIEW_WEIGHT : need(entry, link, record)
}

function formMatch(
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  id: string,
  session: string,
  rng: Rng,
): TreatiseMatchExercise | null {
  const { targets, practice } = targetsOf(entries, progress, session, rng)
  const candidates = LINKS.map((link) => ({ link, pool: targets.filter((entry) => linksOf(entry).includes(link)) })).filter(
    ({ pool }) => pool.length >= MIN_BOARD,
  )
  if (candidates.length === 0) return null

  // Le lien qui reste le plus à réussir sur ces traités passe le plus souvent.
  const { link, pool } = weightedPick(
    candidates,
    (candidate) => candidate.pool.reduce((sum, entry) => sum + weightOf(entry, candidate.link, progress), 0),
    rng,
  )
  // Les traités qui ont le plus à y gagner d'abord, au hasard à besoin égal.
  const group = shuffle(pool, rng)
    .sort((a, b) => weightOf(b, link, progress) - weightOf(a, link, progress))
    .slice(0, BOARD_SIZE)

  const flipped = rng() < 0.5
  const columns = (flipped ? [...LINK_COLUMNS[link]].reverse() : LINK_COLUMNS[link]) as [TreatiseColumn, TreatiseColumn]
  return {
    kind: 'treatise-match',
    id,
    link,
    columns,
    session,
    pairs: group.map((entry) => {
      const thesis = link === 'title-thesis' ? pickThesis(entry, progress[entry.id], rng) : undefined
      return {
        id: entry.id,
        left: valueIn(entry, columns[0], thesis),
        right: valueIn(entry, columns[1], thesis),
        ...(thesis !== undefined ? { thesis } : {}),
      }
    }),
    ...(practice ? { practice } : {}),
  }
}

function formChoice(
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  id: string,
  session: string,
  rng: Rng,
): TreatiseChoiceExercise {
  const { targets, practice } = targetsOf(entries, progress, session, rng)
  const target = weightedPick(
    targets,
    (entry) => linksOf(entry).reduce((sum, link) => sum + weightOf(entry, link, progress), 0),
    rng,
  )
  const links = linksOf(target)
  const unfinished = links.filter((link) => !isLinkDone(target, progress[target.id], link))
  const link = sample(unfinished.length > 0 ? unfinished : links, 1, rng)[0]!
  const [a, b] = LINK_COLUMNS[link]
  const [from, to] = rng() < 0.5 ? [a, b] : [b, a]
  const thesis = link === 'title-thesis' ? pickThesis(target, progress[target.id], rng) : undefined

  // Leurres : des traités qui ont la même colonne, plutôt voisins (les thèses, plutôt que des voisins, parmi celles qui existent).
  const pool = entries.filter((entry) => entry.id !== target.id && hasColumn(entry, to))
  const near =
    to === 'thesis' ? shuffle(pool, rng) : pool.sort((x, y) => distance(target, x) - distance(target, y)).slice(0, 8)
  const others = sample(near, Math.min(OPTIONS - 1, near.length), rng)
  const answer = valueIn(target, to, thesis)
  const anyThesis = (entry: TreatiseEntry) => Math.floor(rng() * (entry.theses?.length ?? 1))
  const options = shuffle([answer, ...others.map((entry) => valueIn(entry, to, anyThesis(entry)))], rng)
  return {
    kind: 'treatise-choice',
    id,
    link,
    from,
    to,
    entryId: target.id,
    prompt: valueIn(target, from, thesis),
    answer,
    options,
    session,
    ...(thesis !== undefined ? { thesis } : {}),
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
 * deux thèses d'un même traité dans un exercice, chaque thèse suivie à part, et
 * un traité maîtrisé remplacé aussitôt par le suivant (il reste, plus rarement,
 * jusqu'à être réussi dans une autre séance). Une manche qui manquerait de traités se
 * rabat sur un QCM.
 */
export function materializeTreatise(
  ghost: TreatiseGhostExercise,
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  seed: number,
): Exercise {
  const session = String(seed)
  const rng = createRng(seedFrom(seed, ghost.id, Object.keys(progress).length))
  if (ghost.shape === 'match') {
    const match = formMatch(entries, progress, ghost.id, session, rng)
    if (match) return match
  }
  return formChoice(entries, progress, ghost.id, session, rng)
}
