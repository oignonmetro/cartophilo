import type { TreatiseEntry } from '@/content/schema'
import type {
  Exercise,
  TreatiseChoiceExercise,
  TreatiseColumn,
  TreatiseGhostExercise,
  TreatiseLink,
  TreatiseMatchExercise,
  TreatiseTypeExercise,
} from './exercises'
import { createRng, sample, seedFrom, shuffle, type Rng } from './rng'

/**
 * Repérage général dans les traités d'un auteur (Plotin : 54 traités).
 *
 * Un traité se dit de trois façons, comme les colonnes d'un tableau : son
 * titre, sa numérotation (« 53 [I, 1] ») et, pour ceux qui en ont, ses thèses
 * principales. Un exercice ne teste jamais « un traité » en bloc : il fait
 * établir un **lien** entre deux colonnes, le titre servant de pivot (titre ↔
 * numérotation, titre ↔ thèse), et chaque bonne ou mauvaise réponse est
 * retenue pour *ce* traité, *ce* lien et *cette* étape.
 *
 * Un traité s'apprend en trois **étapes**, de la plus aidée à la plus exigeante :
 *   1. l'association (une manche de paires à relier) ;
 *   2. le QCM (une réponse à choisir) ;
 *   3. l'écrit (une réponse à taper : la numérotation d'après le titre, le
 *      titre d'après une thèse et la numérotation).
 * Il n'est « ponctuellement maîtrisé » que lorsque les trois étapes sont
 * faites, chacune sur tous ses liens, toutes ses thèses comprises ; c'est alors
 * seulement qu'un nouveau traité prend sa place.
 *
 * Les exercices n'existent pas d'avance : une séance réserve des places
 * (`treatiseGhosts`), et chaque exercice se forme au moment de l'ouvrir
 * (`materializeTreatise`), par un hasard réglé sur ce que l'apprenant sait
 * alors : à chaque traité l'exercice de son étape, les liens pas encore
 * réussis passant d'abord.
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

/** Les étapes d'un traité, dans l'ordre : association, QCM, écrit. */
export type TreatiseStage = 'match' | 'choice' | 'type'
export const STAGES: readonly TreatiseStage[] = ['match', 'choice', 'type']

const LINK_COLUMNS: Record<TreatiseLink, [TreatiseColumn, TreatiseColumn]> = {
  'title-number': ['title', 'number'],
  'title-thesis': ['title', 'thesis'],
}

/** Ce qu'on retient d'un lien : ses réponses justes (du premier coup) et fausses. */
export interface LinkRecord {
  right: number
  wrong: number
}

/** Ce qu'on retient d'une étape : la numérotation, puis chaque thèse (par rang), à part. */
export interface StageRecord {
  number?: LinkRecord
  theses?: Record<number, LinkRecord>
}

/**
 * Ce qu'on retient de chaque traité, étape par étape. Les champs `right`,
 * `thesis`, `links` et `theses` sont ceux d'avant les étapes : une sauvegarde
 * ancienne les porte, et ils comptent pour l'étape d'association, la seule qui
 * existait alors. Des liens `number-thesis`, abandonnés, peuvent traîner : ils
 * sont ignorés.
 */
export interface TreatiseRecord {
  stages?: Partial<Record<TreatiseStage, StageRecord>>
  right?: number
  wrong?: number
  thesis?: number
  links?: Partial<Record<TreatiseLink, LinkRecord>>
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

/** Les liens que ce traité permet d'établir : sa numérotation, et ses thèses s'il en a. */
export function linksOf(entry: TreatiseEntry): TreatiseLink[] {
  return LINKS.filter((link) => LINK_COLUMNS[link].every((column) => hasColumn(entry, column)))
}

// --- ce que l'on sait, par étape ------------------------------------------------

/** Le compte de la numérotation à une étape ; pour l'association, les comptes d'avant les étapes y sont repris. */
function numberRecord(record: TreatiseRecord | undefined, stage: TreatiseStage): LinkRecord {
  const own = record?.stages?.[stage]?.number
  if (stage !== 'match') return own ?? { right: 0, wrong: 0 }
  const legacy = record?.links?.['title-number']
  return {
    right: Math.max(own?.right ?? 0, legacy?.right ?? 0, record?.right ?? 0),
    wrong: Math.max(own?.wrong ?? 0, legacy?.wrong ?? 0),
  }
}

/** Le compte d'une thèse (par rang) à une étape. */
function thesisRecord(record: TreatiseRecord | undefined, stage: TreatiseStage, index: number): LinkRecord {
  const own = record?.stages?.[stage]?.theses?.[index]
  if (stage !== 'match') return own ?? { right: 0, wrong: 0 }
  const legacy = record?.theses?.[index]
  return {
    right: Math.max(own?.right ?? 0, legacy?.right ?? 0),
    wrong: Math.max(own?.wrong ?? 0, legacy?.wrong ?? 0),
  }
}

/** Ce qui reste à réussir pour une thèse à une étape : jamais réussie d'abord, puis celles où l'on s'est trompé. */
function thesisNeed(record: TreatiseRecord | undefined, stage: TreatiseStage, index: number): number {
  const known = thesisRecord(record, stage, index)
  return (known.right === 0 ? 3 : 0) + Math.min(known.wrong, 3)
}

/** La thèse à faire travailler : une seule par traité, tirée selon ce qui reste à réussir à cette étape. */
function pickThesis(entry: TreatiseEntry, record: TreatiseRecord | undefined, stage: TreatiseStage, rng: Rng): number {
  const ranks = (entry.theses ?? []).map((_, index) => index)
  return weightedPick(ranks, (index) => thesisNeed(record, stage, index), rng)
}

/**
 * Un lien est fait, à une étape, quand il a eu une bonne réponse du premier
 * coup ; pour les thèses, chacune des siennes.
 */
export function isLinkDone(
  entry: TreatiseEntry,
  record: TreatiseRecord | undefined,
  stage: TreatiseStage,
  link: TreatiseLink,
): boolean {
  if (link === 'title-number') return numberRecord(record, stage).right >= 1
  return (entry.theses ?? []).every((_, index) => thesisRecord(record, stage, index).right >= 1)
}

/** Une étape est faite quand chacun des liens du traité y est fait. */
export function isStageDone(entry: TreatiseEntry, record: TreatiseRecord | undefined, stage: TreatiseStage): boolean {
  return linksOf(entry).every((link) => isLinkDone(entry, record, stage, link))
}

/** L'étape à faire maintenant : la première pas encore faite, ou `null` quand le traité est maîtrisé. */
export function stageOf(entry: TreatiseEntry, record: TreatiseRecord | undefined): TreatiseStage | null {
  return STAGES.find((stage) => !isStageDone(entry, record, stage)) ?? null
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

/**
 * Un traité est « ponctuellement maîtrisé » quand les trois étapes sont
 * faites : association, QCM, écrit. C'est la porte d'entrée d'un nouveau
 * traité ; il lui reste à être consolidé (`isAcquired`).
 */
export function isValidated(entry: TreatiseEntry, record: TreatiseRecord | undefined): boolean {
  return stageOf(entry, record) === null
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

/** Ce qui reste à réussir sur un lien à une étape, et les erreurs passées : le poids de cette association dans le tirage. */
function need(entry: TreatiseEntry, stage: TreatiseStage, link: TreatiseLink, record: TreatiseRecord | undefined): number {
  if (link === 'title-thesis') {
    return (entry.theses ?? []).reduce((sum, _, index) => sum + thesisNeed(record, stage, index), 0)
  }
  const known = numberRecord(record, stage)
  return (known.right === 0 ? 3 : 0) + Math.min(known.wrong, 3)
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

/** Poids d'un traité dans le tirage d'une étape : ce qui lui reste à y réussir, ou le poids léger de la consolidation. */
function weightOf(entry: TreatiseEntry, stage: TreatiseStage, link: TreatiseLink, progress: TreatiseProgress): number {
  const record = progress[entry.id]
  return isValidated(entry, record) ? REVIEW_WEIGHT : need(entry, stage, link, record)
}

/** Les traités de cette étape, parmi ceux qu'on travaille. */
function atStage(targets: readonly TreatiseEntry[], progress: TreatiseProgress, stage: TreatiseStage): TreatiseEntry[] {
  return targets.filter((entry) => stageOf(entry, progress[entry.id]) === stage)
}

/**
 * L'étape de l'exercice : celle que la place réservée demande, si des traités
 * y sont ; sinon la plus basse où il y en a. Quand rien n'est à apprendre
 * (consolidation, remise à niveau), la place réservée décide.
 */
function stageFor(
  wanted: TreatiseStage,
  targets: readonly TreatiseEntry[],
  progress: TreatiseProgress,
): TreatiseStage {
  const populated = STAGES.filter((stage) => atStage(targets, progress, stage).length > 0)
  if (populated.length === 0 || populated.includes(wanted)) return wanted
  return populated[0]!
}

function formMatch(
  entries: readonly TreatiseEntry[],
  targets: readonly TreatiseEntry[],
  practice: boolean,
  progress: TreatiseProgress,
  id: string,
  session: string,
  rng: Rng,
): TreatiseMatchExercise | null {
  const stage: TreatiseStage = 'match'
  // Une manche demande au moins `MIN_BOARD` paires : si les traités à travailler
  // sont trop peu (la fin du parcours), des traités déjà maîtrisés la complètent :
  // jamais un traité pas encore introduit, que cette manche ferait avancer en douce.
  const withLink = (link: TreatiseLink, among: readonly TreatiseEntry[]) =>
    among.filter((entry) => linksOf(entry).includes(link))
  const candidates = LINKS.map((link) => {
    const own = withLink(link, targets)
    const fill =
      own.length < MIN_BOARD
        ? shuffle(
            withLink(link, entries).filter((entry) => !own.includes(entry) && isValidated(entry, progress[entry.id])),
            rng,
          )
        : []
    return { link, pool: [...own, ...fill.slice(0, MIN_BOARD - own.length)] }
  }).filter(({ pool }) => pool.length >= MIN_BOARD && pool.some((entry) => targets.includes(entry)))
  if (candidates.length === 0) return null

  // Le lien qui reste le plus à réussir sur ces traités passe le plus souvent.
  const { link, pool } = weightedPick(
    candidates,
    (candidate) => candidate.pool.reduce((sum, entry) => sum + weightOf(entry, stage, candidate.link, progress), 0),
    rng,
  )
  // Les traités qui ont le plus à y gagner d'abord, au hasard à besoin égal ;
  // s'il en manque à cette étape, des traités plus avancés complètent la manche.
  const group = shuffle(pool, rng)
    .sort((a, b) => weightOf(b, stage, link, progress) - weightOf(a, stage, link, progress))
    .slice(0, BOARD_SIZE)

  // La thèse se lit toujours à gauche du titre du traité qui la défend ; la numérotation, d'un côté ou de l'autre.
  const flipped = link === 'title-thesis' ? true : rng() < 0.5
  const columns = (flipped ? [...LINK_COLUMNS[link]].reverse() : LINK_COLUMNS[link]) as [TreatiseColumn, TreatiseColumn]
  return {
    kind: 'treatise-match',
    id,
    link,
    columns,
    session,
    pairs: group.map((entry) => {
      const thesis = link === 'title-thesis' ? pickThesis(entry, progress[entry.id], stage, rng) : undefined
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

/** Le traité interrogé, et le lien : parmi ceux de l'étape s'il y en a, au poids de ce qui leur reste à y réussir. */
function pickTarget(
  targets: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  stage: TreatiseStage,
  rng: Rng,
): { target: TreatiseEntry; link: TreatiseLink } {
  const here = atStage(targets, progress, stage)
  const pool = here.length > 0 ? here : targets
  const target = weightedPick(
    pool,
    (entry) => linksOf(entry).reduce((sum, link) => sum + weightOf(entry, stage, link, progress), 0),
    rng,
  )
  const links = linksOf(target)
  const unfinished = links.filter((link) => !isLinkDone(target, progress[target.id], stage, link))
  const link = sample(unfinished.length > 0 ? unfinished : links, 1, rng)[0]!
  return { target, link }
}

function formChoice(
  entries: readonly TreatiseEntry[],
  targets: readonly TreatiseEntry[],
  practice: boolean,
  progress: TreatiseProgress,
  id: string,
  session: string,
  rng: Rng,
): TreatiseChoiceExercise {
  const stage: TreatiseStage = 'choice'
  const { target, link } = pickTarget(targets, progress, stage, rng)
  const [a, b] = LINK_COLUMNS[link]
  const [from, to] = rng() < 0.5 ? [a, b] : [b, a]
  const thesis = link === 'title-thesis' ? pickThesis(target, progress[target.id], stage, rng) : undefined

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

/**
 * L'écrit : la numérotation d'après le titre, ou le titre d'après une thèse
 * (la numérotation du traité est alors donnée avec elle).
 */
function formType(
  targets: readonly TreatiseEntry[],
  practice: boolean,
  progress: TreatiseProgress,
  id: string,
  session: string,
  rng: Rng,
): TreatiseTypeExercise {
  const stage: TreatiseStage = 'type'
  const { target, link } = pickTarget(targets, progress, stage, rng)
  if (link === 'title-number') {
    return {
      kind: 'treatise-type',
      id,
      link,
      from: 'title',
      to: 'number',
      entryId: target.id,
      prompt: target.title,
      answer: numberingOf(target),
      session,
      ...(practice ? { practice } : {}),
    }
  }
  const thesis = pickThesis(target, progress[target.id], stage, rng)
  return {
    kind: 'treatise-type',
    id,
    link,
    from: 'thesis',
    to: 'title',
    entryId: target.id,
    prompt: valueIn(target, 'thesis', thesis),
    given: numberingOf(target),
    answer: target.title,
    thesis,
    session,
    ...(practice ? { practice } : {}),
  }
}

/** Rythme d'une séance : une manche d'association, un QCM, un écrit. */
const SHAPES: readonly TreatiseStage[] = ['match', 'choice', 'type']

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
 * traités à cet instant : à chaque traité l'exercice de son étape (association,
 * QCM, écrit), un tirage pondéré par ce qui reste à réussir, jamais deux thèses
 * d'un même traité dans un exercice, chaque thèse suivie à part, et un traité
 * maîtrisé remplacé aussitôt par le suivant (il reste, plus rarement, jusqu'à
 * être réussi dans une autre séance). Une place qui n'a aucun traité à son
 * étape prend l'étape la plus basse où il y en a ; une manche qui manquerait de
 * traités se rabat sur un QCM.
 */
export function materializeTreatise(
  ghost: TreatiseGhostExercise,
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  seed: number,
): Exercise {
  const session = String(seed)
  const rng = createRng(seedFrom(seed, ghost.id, Object.keys(progress).length))
  const { targets, practice } = targetsOf(entries, progress, session, rng)
  const stage = stageFor(ghost.shape, targets, progress)
  if (stage === 'match') {
    const match = formMatch(entries, targets, practice, progress, ghost.id, session, rng)
    if (match) return match
  }
  if (stage === 'type') return formType(targets, practice, progress, ghost.id, session, rng)
  return formChoice(entries, targets, practice, progress, ghost.id, session, rng)
}
