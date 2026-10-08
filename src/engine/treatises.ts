import type { TreatiseEntry } from '@/content/schema'
import type { Exercise, TreatiseChoiceExercise, TreatiseMatchExercise } from './exercises'
import { createRng, sample, shuffle, type Rng } from './rng'

/**
 * Repérage général dans les traités d'un auteur (Plotin : 54 traités, deux
 * numérotations). On y apprend à lier un titre à son double repère, et, pour
 * les traités qui en ont, à leurs thèses principales, petit à petit : jamais
 * plus de `ACTIVE_COUNT` traités en cours d'apprentissage, et un nouveau
 * entre en jeu chaque fois qu'un autre est validé.
 *
 * Trois choses sont séparées exprès, pour que de nouveaux types d'exercices
 * puissent venir sans toucher à l'ordre d'apprentissage :
 *
 *   1. l'ordre d'arrivée des traités (`learningOrder`) ;
 *   2. ce qui valide un traité (`isValidated`, qui ne lit que la fiche du
 *      traité) ;
 *   3. les exercices proposés pour ceux qui sont en cours (`buildTreatiseSession`).
 *
 * Un traité n'est plus validé par une bonne réponse ponctuelle, mais quand
 * chacun des sujets qui le concernent a été réussi une fois du premier coup
 * (`requiredTopics`) : la numérotation pour tous, et la thèse pour ceux qui en
 * ont. Un nouveau type d'exercice n'aura qu'à ajouter un sujet.
 */

/** Nombre de traités en cours d'apprentissage : ni plus, ni moins (tant qu'il en reste à apprendre). */
export const ACTIVE_COUNT = 8

/** Ce qu'un exercice fait savoir d'un traité. */
export type TreatiseTopic = 'numbering' | 'thesis'

/**
 * Ce qu'on retient de chaque traité : ses réponses justes du premier coup,
 * par sujet, et ses réponses fausses. `right` est le compte d'avant les
 * sujets : il ne portait que sur la numérotation.
 */
export interface TreatiseRecord {
  right: number
  wrong: number
  thesis?: number
}

export type TreatiseProgress = Record<string, TreatiseRecord>

export const ENNEAD_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

/** « 53 [I, 1] » : rang chronologique, puis place chez Porphyre. */
export function numberingOf(entry: TreatiseEntry): string {
  return `${entry.chrono} [${ENNEAD_NUMERALS[entry.ennead - 1]}, ${entry.numberInEnnead}]`
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

/** Les sujets à réussir pour valider ce traité : sa numérotation, et ses thèses s'il en a. */
export function requiredTopics(entry: TreatiseEntry): TreatiseTopic[] {
  return entry.theses && entry.theses.length > 0 ? ['numbering', 'thesis'] : ['numbering']
}

function rightsOn(record: TreatiseRecord | undefined, topic: TreatiseTopic): number {
  return topic === 'numbering' ? (record?.right ?? 0) : (record?.thesis ?? 0)
}

/**
 * Un traité est validé quand chaque sujet qui le concerne a été réussi une
 * fois du premier coup. La seule définition de la « connaissance » d'un
 * traité : voir l'en-tête du fichier.
 */
export function isValidated(entry: TreatiseEntry, record: TreatiseRecord | undefined): boolean {
  return requiredTopics(entry).every((topic) => rightsOn(record, topic) >= 1)
}

/** Les traités en cours d'apprentissage : les `ACTIVE_COUNT` premiers non validés, dans l'ordre d'arrivée. */
export function activeTreatises(entries: readonly TreatiseEntry[], progress: TreatiseProgress): TreatiseEntry[] {
  return learningOrder(entries)
    .filter((entry) => !isValidated(entry, progress[entry.id]))
    .slice(0, ACTIVE_COUNT)
}

export function validatedCount(entries: readonly TreatiseEntry[], progress: TreatiseProgress): number {
  return entries.filter((entry) => isValidated(entry, progress[entry.id])).length
}

/** Distance entre deux traités : les confusions se font entre voisins (même Ennéade, rangs proches). */
function distance(a: TreatiseEntry, b: TreatiseEntry): number {
  return Math.abs(a.chrono - b.chrono) + (a.ennead === b.ennead ? 0 : 6) + Math.abs(a.numberInEnnead - b.numberInEnnead)
}

/** Leurres d'un traité : quelques-uns tirés parmi ses plus proches voisins. */
function distractors(target: TreatiseEntry, entries: readonly TreatiseEntry[], count: number, rng: Rng): TreatiseEntry[] {
  const near = entries
    .filter((entry) => entry.id !== target.id)
    .sort((a, b) => distance(target, a) - distance(target, b))
    .slice(0, 8)
  return sample(near, count, rng)
}

/**
 * Leurres d'une question de thèse : d'abord les autres traités qui ont des
 * thèses (c'est entre eux qu'on confond, et chacune de leurs thèses est
 * précise), à défaut les voisins.
 */
function thesisDistractors(
  target: TreatiseEntry,
  entries: readonly TreatiseEntry[],
  count: number,
  rng: Rng,
): TreatiseEntry[] {
  const withTheses = entries.filter((entry) => entry.id !== target.id && entry.theses && entry.theses.length > 0)
  const picked = sample(withTheses, Math.min(count, withTheses.length), rng)
  if (picked.length === count) return picked
  const others = distractors(target, entries, count + picked.length, rng).filter(
    (entry) => !picked.some((chosen) => chosen.id === entry.id),
  )
  return [...picked, ...others].slice(0, count)
}

const OPTIONS = 4

function numberingChoice(
  target: TreatiseEntry,
  entries: readonly TreatiseEntry[],
  direction: 'title-to-number' | 'number-to-title',
  rng: Rng,
  practice: boolean,
): TreatiseChoiceExercise {
  const toNumber = direction === 'title-to-number'
  const label = (entry: TreatiseEntry) => (toNumber ? numberingOf(entry) : entry.title)
  const options = shuffle([target, ...distractors(target, entries, OPTIONS - 1, rng)], rng).map(label)
  return {
    kind: 'treatise-choice',
    id: `treatise-choice:${target.id}:${direction}`,
    topic: 'numbering',
    entryId: target.id,
    prompt: toNumber ? target.title : numberingOf(target),
    answer: label(target),
    options,
    direction,
    ...(practice ? { practice } : {}),
  }
}

function thesisChoice(
  target: TreatiseEntry,
  entries: readonly TreatiseEntry[],
  rng: Rng,
  practice: boolean,
): TreatiseChoiceExercise {
  const theses = target.theses!
  const index = Math.floor(rng() * theses.length)
  const options = shuffle([target, ...thesisDistractors(target, entries, OPTIONS - 1, rng)], rng).map(
    (entry) => entry.title,
  )
  return {
    kind: 'treatise-choice',
    id: `treatise-choice:${target.id}:thesis-to-title:${index}`,
    topic: 'thesis',
    entryId: target.id,
    prompt: theses[index]!,
    answer: target.title,
    options,
    direction: 'thesis-to-title',
    ...(practice ? { practice } : {}),
  }
}

function numberingMatch(chunk: readonly TreatiseEntry[], practice: boolean): TreatiseMatchExercise {
  return {
    kind: 'treatise-match',
    id: `treatise-match:${chunk.map((entry) => entry.id).join('+')}`,
    topic: 'numbering',
    pairs: chunk.map((entry) => ({ id: entry.id, left: entry.title, right: numberingOf(entry) })),
    ...(practice ? { practice } : {}),
  }
}

/** Une manche de thèses : à gauche une thèse (tirée au hasard parmi celles du traité), à droite son traité. */
function thesisMatch(chunk: readonly TreatiseEntry[], rng: Rng, practice: boolean): TreatiseMatchExercise {
  return {
    kind: 'treatise-match',
    id: `treatise-match:thesis:${chunk.map((entry) => entry.id).join('+')}`,
    topic: 'thesis',
    pairs: chunk.map((entry) => ({
      id: entry.id,
      left: entry.theses![Math.floor(rng() * entry.theses!.length)]!,
      right: entry.title,
    })),
    ...(practice ? { practice } : {}),
  }
}

/** Manches d'association : de trois à quatre paires, deux manches dès six traités. */
function chunksOf(targets: readonly TreatiseEntry[]): TreatiseEntry[][] {
  if (targets.length < 3) return []
  if (targets.length < 6) return [targets.slice()]
  const half = Math.ceil(targets.length / 2)
  return [targets.slice(0, half), targets.slice(half)]
}

/** Combien de QCM de thèse au plus dans une séance : les manches de thèses font déjà passer chaque traité. */
const THESIS_CHOICES_MAX = 3

/**
 * Une séance sur les traités en cours : une manche d'association, des QCM sur
 * l'autre moitié, puis l'inverse — surtout des associations et des QCM, pour
 * rester ludique. Un traité y paraît dans une manche et dans un QCM ; le sens
 * du QCM (titre → numérotation, ou l'inverse) est tiré au sort.
 *
 * Pour les traités qui ont des thèses (`theses`), la séance se termine par
 * une manche qui associe chaque thèse à son traité, puis quelques QCM qui
 * demandent de quel traité relève une thèse.
 *
 * Sans traité à apprendre (tous validés), la séance reprend huit traités au
 * hasard, sans rien noter (`practice`).
 */
export function buildTreatiseSession(
  entries: readonly TreatiseEntry[],
  progress: TreatiseProgress,
  seed: number,
): Exercise[] {
  const rng = createRng(seed)
  const active = activeTreatises(entries, progress)
  const practice = active.length === 0
  const targets = shuffle(practice ? sample(entries, Math.min(ACTIVE_COUNT, entries.length), rng) : active, rng)
  const chunks = chunksOf(targets)
  const choices = (group: readonly TreatiseEntry[]) =>
    group.map((entry) =>
      numberingChoice(entry, entries, rng() < 0.5 ? 'title-to-number' : 'number-to-title', rng, practice),
    )

  let session: Exercise[]
  if (chunks.length === 0) {
    session = choices(targets)
  } else {
    // Les QCM d'une moitié suivent la manche de l'autre : on retrouve ce qu'on vient de relier.
    const [first, second] = chunks
    session = [
      numberingMatch(first!, practice),
      ...choices(second ?? first!),
      ...(second ? [numberingMatch(second, practice)] : []),
      ...choices(first!),
    ]
  }

  const withTheses = targets.filter((entry) => entry.theses && entry.theses.length > 0)
  if (withTheses.length >= 3) session.push(thesisMatch(withTheses.slice(0, 6), rng, practice))
  const asked = withTheses.length >= 3 ? sample(withTheses, Math.min(THESIS_CHOICES_MAX, withTheses.length), rng) : withTheses
  for (const entry of asked) session.push(thesisChoice(entry, entries, rng, practice))
  return session
}
