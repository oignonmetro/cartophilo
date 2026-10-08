import type { TreatiseEntry } from '@/content/schema'
import type { Exercise, TreatiseChoiceExercise, TreatiseMatchExercise } from './exercises'
import { createRng, sample, shuffle, type Rng } from './rng'

/**
 * Repérage général dans les traités d'un auteur (Plotin : 54 traités, deux
 * numérotations). On y apprend à lier un titre à son double repère, petit à
 * petit : jamais plus de `ACTIVE_COUNT` traités en cours d'apprentissage, et
 * un nouveau entre en jeu chaque fois qu'un autre est validé.
 *
 * Trois choses sont séparées exprès, pour que de nouveaux types d'exercices
 * puissent venir plus tard sans toucher à l'ordre d'apprentissage :
 *
 *   1. l'ordre d'arrivée des traités (`learningOrder`) ;
 *   2. ce qui valide un traité (`isValidated`, qui ne lit que la fiche du
 *      traité) ;
 *   3. les exercices proposés pour ceux qui sont en cours (`buildTreatiseSession`).
 *
 * Aujourd'hui, un traité est validé par une bonne réponse du premier coup
 * (une paire reliée sans faute, un QCM juste). Plus tard, un nouvel exercice
 * n'aura qu'à ajouter ses réponses à la fiche, et la règle de validation à
 * exiger plusieurs exercices réussis : le reste ne bougera pas.
 */

/** Nombre de traités en cours d'apprentissage : ni plus, ni moins (tant qu'il en reste à apprendre). */
export const ACTIVE_COUNT = 8

/** Ce qu'on retient de chaque traité : ses réponses justes (du premier coup) et fausses. */
export interface TreatiseRecord {
  right: number
  wrong: number
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

/**
 * Un traité est validé quand on l'a reconnu une fois du premier coup. La seule
 * définition de la « connaissance » d'un traité : voir l'en-tête du fichier.
 */
export function isValidated(record: TreatiseRecord | undefined): boolean {
  return (record?.right ?? 0) >= 1
}

/** Les traités en cours d'apprentissage : les `ACTIVE_COUNT` premiers non validés, dans l'ordre d'arrivée. */
export function activeTreatises(entries: readonly TreatiseEntry[], progress: TreatiseProgress): TreatiseEntry[] {
  return learningOrder(entries)
    .filter((entry) => !isValidated(progress[entry.id]))
    .slice(0, ACTIVE_COUNT)
}

export function validatedCount(entries: readonly TreatiseEntry[], progress: TreatiseProgress): number {
  return entries.filter((entry) => isValidated(progress[entry.id])).length
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

const OPTIONS = 4

function choiceFor(
  target: TreatiseEntry,
  entries: readonly TreatiseEntry[],
  direction: TreatiseChoiceExercise['direction'],
  rng: Rng,
  practice: boolean,
): TreatiseChoiceExercise {
  const toNumber = direction === 'title-to-number'
  const label = (entry: TreatiseEntry) => (toNumber ? numberingOf(entry) : entry.title)
  const options = shuffle([target, ...distractors(target, entries, OPTIONS - 1, rng)], rng).map(label)
  return {
    kind: 'treatise-choice',
    id: `treatise-choice:${target.id}:${direction}`,
    entryId: target.id,
    prompt: toNumber ? target.title : numberingOf(target),
    answer: label(target),
    options,
    direction,
    ...(practice ? { practice } : {}),
  }
}

function matchFor(chunk: readonly TreatiseEntry[], practice: boolean): TreatiseMatchExercise {
  return {
    kind: 'treatise-match',
    id: `treatise-match:${chunk.map((entry) => entry.id).join('+')}`,
    pairs: chunk.map((entry) => ({ id: entry.id, left: entry.title, right: numberingOf(entry) })),
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

/**
 * Une séance sur les traités en cours : une manche d'association, des QCM sur
 * l'autre moitié, puis l'inverse — surtout des associations et des QCM, pour
 * rester ludique. Un traité y paraît dans une manche et dans un QCM ; le sens
 * du QCM (titre → numérotation, ou l'inverse) est tiré au sort.
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
      choiceFor(entry, entries, rng() < 0.5 ? 'title-to-number' : 'number-to-title', rng, practice),
    )

  if (chunks.length === 0) return choices(targets)
  // Les QCM d'une moitié suivent la manche de l'autre : on retrouve ce qu'on vient de relier.
  const [first, second] = chunks
  return [
    matchFor(first!, practice),
    ...choices(second ?? first!),
    ...(second ? [matchFor(second, practice)] : []),
    ...choices(first!),
  ]
}
