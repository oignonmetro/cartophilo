import { describe, expect, it } from 'vitest'
import type { TreatiseEntry } from '@/content/schema'
import type { Exercise } from './exercises'
import {
  ACTIVE_COUNT,
  LINKS,
  activeTreatises,
  isAcquired,
  isValidated,
  learningOrder,
  linksOf,
  materializeTreatise,
  numberingOf,
  reviewTreatises,
  rightsOn,
  treatiseGhosts,
  type TreatiseProgress,
} from './treatises'

// 54 traités : 6 Ennéades de 9, rang chronologique en boucle (pas celui de Plotin, peu importe ici).
// Les index 3, 12, 30 et 41 sont en gras, les index 3, 12 et 30 ont des thèses (trois chacun).
const ENTRIES: TreatiseEntry[] = Array.from({ length: 54 }, (_, index) => {
  const entry: TreatiseEntry = {
    id: `t-${Math.floor(index / 9) + 1}-${(index % 9) + 1}`,
    title: `Traité numéro ${index + 1}`,
    ennead: Math.floor(index / 9) + 1,
    numberInEnnead: (index % 9) + 1,
    chrono: ((index * 7) % 54) + 1,
  }
  if ([3, 12, 30, 41].includes(index)) entry.highlight = true
  if ([3, 12, 30].includes(index)) entry.theses = [`Thèse A du ${index}`, `Thèse B du ${index}`, `Thèse C du ${index}`]
  return entry
})

const done = (entry: TreatiseEntry): TreatiseProgress[string] => ({
  links: Object.fromEntries(linksOf(entry).map((link) => [link, { right: 1, wrong: 0 }])),
  theses: Object.fromEntries((entry.theses ?? []).map((_, index) => [index, { right: 1, wrong: 0 }])),
})
const masterAll = (...ids: string[]): TreatiseProgress =>
  Object.fromEntries(ids.map((id) => [id, done(ENTRIES.find((entry) => entry.id === id)!)]))

const idsOf = (exercise: Exercise): string[] =>
  exercise.kind === 'treatise-match'
    ? exercise.pairs.map((pair) => pair.id)
    : exercise.kind === 'treatise-choice'
      ? [exercise.entryId]
      : []

describe('ordre et lots d’apprentissage', () => {
  it('apprend par lots de six traités', () => {
    expect(ACTIVE_COUNT).toBe(6)
    expect(activeTreatises(ENTRIES, {})).toHaveLength(6)
  })

  it('commence par ceux qui ont un rang, dans l’ordre de ce rang, puis ceux en gras', () => {
    const ranked = ENTRIES.map((entry, index) =>
      index === 40 ? { ...entry, priority: 1 } : index === 20 ? { ...entry, priority: 2 } : entry,
    )
    const order = learningOrder(ranked)
    expect(order.slice(0, 2).map((entry) => entry.id)).toEqual([ENTRIES[40]!.id, ENTRIES[20]!.id])
    expect(new Set(order.map((entry) => entry.id)).size).toBe(ENTRIES.length)
    expect(order[2]!.highlight).toBe(true)
  })

  it('remplace un traité maîtrisé par le suivant, sans jamais en avoir plus ni moins de six', () => {
    const before = activeTreatises(ENTRIES, {})
    const after = activeTreatises(ENTRIES, masterAll(before[0]!.id))
    expect(after).toHaveLength(6)
    expect(after.map((entry) => entry.id)).not.toContain(before[0]!.id)
    expect(after.slice(0, 5).map((entry) => entry.id)).toEqual(before.slice(1).map((entry) => entry.id))
  })

  it('n’en propose plus que ce qui reste à la fin', () => {
    const order = learningOrder(ENTRIES)
    expect(activeTreatises(ENTRIES, masterAll(...order.slice(0, 50).map((entry) => entry.id)))).toHaveLength(4)
    expect(activeTreatises(ENTRIES, masterAll(...order.map((entry) => entry.id)))).toHaveLength(0)
  })
})

describe('maîtrise lien par lien', () => {
  const withTheses = ENTRIES[3]!
  const plain = ENTRIES[0]!

  it('un traité à thèses a deux liens à réussir (numérotation, thèse), les autres un seul', () => {
    expect(linksOf(withTheses)).toEqual([...LINKS])
    expect(linksOf(plain)).toEqual(['title-number'])
  })

  it('n’est maîtrisé que quand chacun de ses liens a eu une bonne association', () => {
    expect(isValidated(withTheses, { links: { 'title-number': { right: 1, wrong: 0 } } })).toBe(false)
    expect(isValidated(withTheses, { links: { 'title-thesis': { right: 3, wrong: 1 } } })).toBe(false)
    // Toutes les thèses comptent, pas l'une des trois.
    const numberDone = { 'title-number': { right: 1, wrong: 0 } }
    expect(isValidated(withTheses, { links: numberDone, theses: { 0: { right: 2, wrong: 0 } } })).toBe(false)
    expect(
      isValidated(withTheses, {
        links: numberDone,
        theses: { 0: { right: 1, wrong: 0 }, 1: { right: 1, wrong: 0 }, 2: { right: 1, wrong: 0 } },
      }),
    ).toBe(true)
    expect(isValidated(withTheses, done(withTheses))).toBe(true)
    expect(isValidated(plain, { links: { 'title-number': { right: 1, wrong: 0 } } })).toBe(true)
  })

  it('reprend les comptes d’avant les liens', () => {
    expect(rightsOn({ right: 2 }, 'title-number')).toBe(2)
    expect(rightsOn({ thesis: 1 }, 'title-thesis')).toBe(1)
    expect(isValidated(plain, { right: 1 })).toBe(true)
  })

  it('distingue les traités : réussir un lien d’un traité ne valide pas les autres', () => {
    const [first, second] = activeTreatises(ENTRIES, {})
    const progress: TreatiseProgress = { [first!.id]: done(first!) }
    expect(isValidated(first!, progress[first!.id])).toBe(true)
    expect(isValidated(second!, progress[second!.id])).toBe(false)
  })
})

describe('consolidation', () => {
  const entry = ENTRIES[3]!

  it('un traité maîtrisé n’est acquis qu’après une réussite dans une autre séance', () => {
    expect(isAcquired(entry, done(entry))).toBe(false)
    expect(isAcquired(entry, { ...done(entry), session: 'a', sessions: 1 })).toBe(false)
    expect(isAcquired(entry, { ...done(entry), session: 'b', sessions: 2 })).toBe(true)
    expect(isAcquired(entry, { session: 'b', sessions: 2 })).toBe(false)
  })

  it('un traité maîtrisé revient dans les séances suivantes, pas dans la sienne', () => {
    const progress: TreatiseProgress = { [entry.id]: { ...done(entry), session: 'a', sessions: 1 } }
    expect(reviewTreatises(ENTRIES, progress, 'a')).toHaveLength(0)
    expect(reviewTreatises(ENTRIES, progress, 'b').map((item) => item.id)).toEqual([entry.id])
    expect(reviewTreatises(ENTRIES, { [entry.id]: { ...done(entry), sessions: 2 } }, 'b')).toHaveLength(0)
  })

  it('une thèse déjà réussie cède la place aux thèses pas encore vues', () => {
    const progress: TreatiseProgress = {
      [entry.id]: { links: { 'title-number': { right: 1, wrong: 0 } }, theses: { 0: { right: 1, wrong: 0 } } },
    }
    let seen = 0
    let total = 0
    for (let seed = 0; seed < 200; seed++) {
      const exercise = materializeTreatise(treatiseGhosts(2)[1]!, ENTRIES, progress, seed)
      if (exercise.kind !== 'treatise-choice' || exercise.entryId !== entry.id || exercise.thesis === undefined) continue
      total++
      if (exercise.thesis !== 0) seen++
    }
    expect(total).toBeGreaterThan(0)
    expect(seen / total).toBeGreaterThan(0.8)
  })
})

describe('exercices formés à l’instant', () => {
  it('réserve des places, rien de plus : une manche pour deux QCM', () => {
    const ghosts = treatiseGhosts(12)
    expect(ghosts).toHaveLength(12)
    expect(new Set(ghosts.map((ghost) => ghost.id)).size).toBe(12)
    expect(ghosts.filter((ghost) => ghost.shape === 'match')).toHaveLength(4)
    expect(ghosts.every((ghost) => ghost.kind === 'treatise-ghost')).toBe(true)
  })

  it('forme les exercices sur les traités en cours seulement', () => {
    const active = new Set(activeTreatises(ENTRIES, {}).map((entry) => entry.id))
    for (const ghost of treatiseGhosts(12)) {
      const ids = idsOf(materializeTreatise(ghost, ENTRIES, {}, 11))
      expect(ids.length).toBeGreaterThan(0)
      for (const id of ids) expect(active.has(id)).toBe(true)
    }
  })

  it('ne met jamais deux fois le même traité dans une manche, et une seule thèse par traité', () => {
    for (let seed = 0; seed < 40; seed++) {
      const exercise = materializeTreatise(treatiseGhosts(1)[0]!, ENTRIES, {}, seed)
      if (exercise.kind !== 'treatise-match') continue
      const ids = exercise.pairs.map((pair) => pair.id)
      expect(new Set(ids).size).toBe(ids.length)
      const [left, right] = exercise.columns
      for (const pair of exercise.pairs) {
        const entry = ENTRIES.find((candidate) => candidate.id === pair.id)!
        if (left === 'thesis') expect(entry.theses).toContain(pair.left)
        if (right === 'thesis') expect(entry.theses).toContain(pair.right)
      }
    }
  })

  it('associe chaque paire à son traité, dans le bon lien', () => {
    for (let seed = 0; seed < 40; seed++) {
      const exercise = materializeTreatise(treatiseGhosts(1)[0]!, ENTRIES, {}, seed)
      if (exercise.kind !== 'treatise-match') continue
      for (const pair of exercise.pairs) {
        const entry = ENTRIES.find((candidate) => candidate.id === pair.id)!
        expect(linksOf(entry)).toContain(exercise.link)
        const checks = [
          [exercise.columns[0], pair.left],
          [exercise.columns[1], pair.right],
        ] as const
        for (const [column, value] of checks) {
          if (column === 'title') expect(value).toBe(entry.title)
          if (column === 'number') expect(value).toBe(numberingOf(entry))
        }
      }
    }
  })

  it('propose de vrais choix : la bonne réponse une fois, parmi des leurres distincts', () => {
    for (let seed = 0; seed < 40; seed++) {
      const exercise = materializeTreatise(treatiseGhosts(2)[1]!, ENTRIES, {}, seed)
      expect(exercise.kind).toBe('treatise-choice')
      if (exercise.kind !== 'treatise-choice') continue
      expect(new Set(exercise.options).size).toBe(exercise.options.length)
      expect(exercise.options.length).toBeGreaterThanOrEqual(3)
      expect(exercise.options.filter((option) => option === exercise.answer)).toHaveLength(1)
    }
  })

  it('fait passer d’abord le lien pas encore réussi', () => {
    // Tout est réussi pour tous les traités, sauf « titre ↔ thèse ».
    const progress: TreatiseProgress = Object.fromEntries(
      ENTRIES.map((entry) => [
        entry.id,
        {
          links: Object.fromEntries(
            linksOf(entry)
              .filter((link) => link !== 'title-thesis')
              .map((link) => [link, { right: 1, wrong: 0 }]),
          ),
        },
      ]),
    )
    let hits = 0
    let total = 0
    for (let seed = 0; seed < 80; seed++) {
      const exercise = materializeTreatise(treatiseGhosts(2)[1]!, ENTRIES, progress, seed)
      // Les traités sans thèses, déjà maîtrisés, ne reviennent qu'en consolidation.
      if (exercise.kind !== 'treatise-choice' || !ENTRIES.find((e) => e.id === exercise.entryId)!.theses) continue
      total++
      if (exercise.link === 'title-thesis') hits++
    }
    expect(total).toBeGreaterThan(0)
    expect(hits / total).toBeGreaterThan(0.9)
  })

  it('introduit aussitôt un nouveau traité quand un autre est maîtrisé', () => {
    const before = activeTreatises(ENTRIES, {})
    // Maîtrisé et déjà consolidé : il ne revient plus, sa place est prise.
    const progress: TreatiseProgress = { [before[0]!.id]: { ...done(before[0]!), sessions: 2 } }
    for (let seed = 0; seed < 20; seed++) {
      expect(idsOf(materializeTreatise(treatiseGhosts(1)[0]!, ENTRIES, progress, seed))).not.toContain(before[0]!.id)
    }
  })

  it('reprend des traités au hasard, sans rien noter, quand tout est maîtrisé', () => {
    const progress: TreatiseProgress = Object.fromEntries(
      ENTRIES.map((entry) => [entry.id, { ...done(entry), sessions: 2 }]),
    )
    for (const ghost of treatiseGhosts(3)) {
      const exercise = materializeTreatise(ghost, ENTRIES, progress, 3)
      expect('practice' in exercise && exercise.practice).toBe(true)
    }
  })
})
