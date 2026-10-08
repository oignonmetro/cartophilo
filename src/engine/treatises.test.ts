import { describe, expect, it } from 'vitest'
import type { TreatiseEntry } from '@/content/schema'
import {
  ACTIVE_COUNT,
  activeTreatises,
  buildTreatiseSession,
  isValidated,
  learningOrder,
  numberingOf,
  type TreatiseProgress,
} from './treatises'

// 54 traités : 6 Ennéades de 9, rang chronologique en boucle (pas celui de Plotin, peu importe ici).
const ENTRIES: TreatiseEntry[] = Array.from({ length: 54 }, (_, index) => ({
  id: `t-${Math.floor(index / 9) + 1}-${(index % 9) + 1}`,
  title: `Traité numéro ${index + 1}`,
  ennead: Math.floor(index / 9) + 1,
  numberInEnnead: (index % 9) + 1,
  chrono: ((index * 7) % 54) + 1,
  // Les traités 3, 12, 30 et 41 (en partant de zéro) sont en gras.
  ...([3, 12, 30, 41].includes(index) ? { highlight: true } : {}),
}))

const right = (...ids: string[]): TreatiseProgress =>
  Object.fromEntries(ids.map((id) => [id, { right: 1, wrong: 0 }]))

describe('ordre d’apprentissage des traités', () => {
  it('commence par les traités en gras, puis suit l’ordre de Porphyre', () => {
    const order = learningOrder(ENTRIES)
    expect(order.slice(0, 4).every((entry) => entry.highlight)).toBe(true)
    expect(order.slice(4).some((entry) => entry.highlight)).toBe(false)
    expect(order.slice(4, 6).map((entry) => entry.id)).toEqual(['t-1-1', 't-1-2'])
  })

  it('fait passer d’abord les traités qui ont un rang, dans l’ordre de ce rang', () => {
    const ranked = ENTRIES.map((entry, index) =>
      index === 40 ? { ...entry, priority: 1 } : index === 20 ? { ...entry, priority: 2 } : entry,
    )
    const order = learningOrder(ranked)
    expect(order.slice(0, 2).map((entry) => entry.id)).toEqual([ENTRIES[40]!.id, ENTRIES[20]!.id])
    // Un traité à rang qui est aussi en gras (index 3 ou 41) ne passe pas deux fois.
    expect(new Set(order.map((entry) => entry.id)).size).toBe(ENTRIES.length)
    expect(order[2]!.highlight).toBe(true)
  })

  it('met toujours huit traités en cours, ceux en gras d’abord', () => {
    const active = activeTreatises(ENTRIES, {})
    expect(active).toHaveLength(ACTIVE_COUNT)
    expect(active.slice(0, 4).every((entry) => entry.highlight)).toBe(true)
  })

  it('remplace un traité validé par le suivant, sans jamais en avoir plus ni moins de huit', () => {
    const before = activeTreatises(ENTRIES, {})
    const after = activeTreatises(ENTRIES, right(before[0]!.id))
    expect(after).toHaveLength(ACTIVE_COUNT)
    expect(after.map((entry) => entry.id)).not.toContain(before[0]!.id)
    expect(after.slice(0, 7).map((entry) => entry.id)).toEqual(before.slice(1).map((entry) => entry.id))
  })

  it('garde un traité raté en cours d’apprentissage', () => {
    const before = activeTreatises(ENTRIES, {})
    const progress: TreatiseProgress = { [before[0]!.id]: { right: 0, wrong: 3 } }
    expect(activeTreatises(ENTRIES, progress).map((entry) => entry.id)).toEqual(before.map((entry) => entry.id))
    expect(isValidated(progress[before[0]!.id])).toBe(false)
  })

  it('n’en propose plus que ce qui reste à la fin', () => {
    const order = learningOrder(ENTRIES)
    const progress = right(...order.slice(0, 50).map((entry) => entry.id))
    expect(activeTreatises(ENTRIES, progress)).toHaveLength(4)
    expect(activeTreatises(ENTRIES, right(...order.map((entry) => entry.id)))).toHaveLength(0)
  })
})

describe('séance de repérage dans les traités', () => {
  it('numérote chaque traité de deux façons : rang chronologique, puis Ennéade et rang', () => {
    expect(numberingOf({ ...ENTRIES[0]!, chrono: 53, ennead: 1, numberInEnnead: 1 })).toBe('53 [I, 1]')
  })

  it('porte sur les huit traités en cours, surtout en associations et en QCM', () => {
    const session = buildTreatiseSession(ENTRIES, {}, 1)
    const active = new Set(activeTreatises(ENTRIES, {}).map((entry) => entry.id))
    expect(session.every((exercise) => exercise.kind === 'treatise-match' || exercise.kind === 'treatise-choice')).toBe(true)
    const matches = session.filter((exercise) => exercise.kind === 'treatise-match')
    expect(matches).toHaveLength(2)
    const targeted = new Set(
      session.flatMap((exercise) =>
        exercise.kind === 'treatise-match'
          ? exercise.pairs.map((pair) => pair.id)
          : exercise.kind === 'treatise-choice'
            ? [exercise.entryId]
            : [],
      ),
    )
    expect(targeted).toEqual(active)
  })

  it('propose de vrais choix : la bonne réponse y est une fois, parmi des leurres distincts', () => {
    for (const exercise of buildTreatiseSession(ENTRIES, {}, 7)) {
      if (exercise.kind !== 'treatise-choice') continue
      expect(exercise.options).toHaveLength(4)
      expect(new Set(exercise.options).size).toBe(4)
      expect(exercise.options.filter((option) => option === exercise.answer)).toHaveLength(1)
    }
  })

  it('reprend huit traités au hasard, sans rien noter, quand tout est validé', () => {
    const progress = right(...ENTRIES.map((entry) => entry.id))
    const session = buildTreatiseSession(ENTRIES, progress, 3)
    expect(session.length).toBeGreaterThan(0)
    expect(session.every((exercise) => 'practice' in exercise && exercise.practice === true)).toBe(true)
  })
})
