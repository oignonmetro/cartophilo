import { describe, expect, it } from 'vitest'
import type { ItemLocation } from '@/content/course'
import { indexItems } from '@/content/course'
import type { LibraryCourse, Unit, Vocab } from '@/content/schema'
import { createCard, DAY, type CardState } from './srs'
import type { LessonProgressMap } from './progress'
import {
  buildUnitPath,
  consolidationEntries,
  currentDestination,
  nextNodeAfter,
  sectionRank,
  solidity,
  stepKey,
} from './unitPath'

function vocab(id: string): Vocab {
  return { id, term: id, translation: id, alt: [] }
}

function unit(id: string, lessonCount: number): Unit {
  return {
    id,
    title: id,
    icon: 'book',
    color: 'teal',
    kind: 'vocab',
    lessons: Array.from({ length: lessonCount }, (_, index) => ({
      kind: 'vocab' as const,
      id: `${id}-l${index + 1}`,
      title: `${id} leçon ${index + 1}`,
      vocab: [vocab(`${id}-w${index + 1}`)],
    })),
  }
}

const U3 = unit('v1', 3)
const U2 = unit('g1', 2)

const COURSE: LibraryCourse = {
  id: 'c',
  name: 'Cours',
  learning: 'en',
  known: 'fr',
  flag: '🇬🇧',
  status: 'available',
  default: false,
  version: 1,
  layout: 'library',
  tracks: [
    { id: 'vocabulaire', title: 'Vocabulaire', kind: 'vocab', color: 'teal', icon: 'book', dividerBefore: false, units: [U3] },
    { id: 'grammaire', title: 'Grammaire', kind: 'vocab', color: 'violet', icon: 'compass', dividerBefore: false, units: [U2] },
  ],
}

const done: LessonProgressMap[string] = { level: 1, completions: 1, lastAt: 0, bestAccuracy: 1 }
const kinds = (nodes: ReturnType<typeof buildUnitPath>) => nodes.map((node) => node.kind)
const statuses = (nodes: ReturnType<typeof buildUnitPath>) => nodes.map((node) => node.status)

const U4 = unit('q4', 4)
const U8 = unit('h8', 8)

describe('composition du parcours', () => {
  it('fait suivre chaque paire de leçons d’une révision, et clôt par une séance finale', () => {
    expect(kinds(buildUnitPath(U2, {}, {}))).toEqual(['lesson', 'lesson', 'review', 'final'])
  })

  it('laisse une dernière leçon seule enchaîner sur la séance finale', () => {
    expect(kinds(buildUnitPath(U3, {}, {}))).toEqual(['lesson', 'lesson', 'review', 'lesson', 'final'])
  })

  it('ajoute une consolidation toutes les quatre leçons, entraînement puis approfondissement', () => {
    expect(kinds(buildUnitPath(U8, {}, {}))).toEqual([
      'lesson',
      'lesson',
      'review',
      'lesson',
      'lesson',
      'review',
      'workout',
      'lesson',
      'lesson',
      'review',
      'lesson',
      'lesson',
      'review',
      'drill',
      'final',
    ])
  })

  it('garde les identifiants d’étape de l’ancien découpage, là où l’étape existait déjà', () => {
    expect(buildUnitPath(U4, {}, {}).filter((node) => !node.lesson).map((node) => node.id)).toEqual([
      'review-1',
      'review-3',
      'consolidate-3',
      'final',
    ])
  })

  it('regroupe chaque paire de leçons avec sa pratique, et isole la séance finale', () => {
    expect(buildUnitPath(U3, {}, {}).map((node) => node.cycle)).toEqual([0, 0, 0, 1, 2])
  })
})

describe('rang d’une leçon dans son unité', () => {
  it('compte d’un bout à l’autre de l’unité', () => {
    expect(U4.lessons.map((lesson) => sectionRank(U4, lesson.id))).toEqual([0, 1, 2, 3])
  })

  it('retombe sur le plancher pour une leçon étrangère à l’unité', () => {
    expect(sectionRank(U4, 'inconnue')).toBe(0)
  })
})

describe('destination courante d’une unité', () => {
  it('mène à la première leçon d’une unité vierge', () => {
    expect(currentDestination('v1', buildUnitPath(U3, {}, {}))).toEqual({ lessonId: 'v1-l1' })
  })

  it('mène à l’étape courante, révision comprise', () => {
    const path = buildUnitPath(U3, { 'v1-l1': done, 'v1-l2': done }, {})
    expect(currentDestination('v1', path)).toEqual({ unitId: 'v1', stepId: 'review-1' })
  })

  it('reprend l’étape suivante une fois la révision franchie', () => {
    const lessons = { 'q4-l1': done, 'q4-l2': done, 'q4-l3': done, 'q4-l4': done }
    const steps = { [stepKey('q4', 'review-1')]: 1, [stepKey('q4', 'review-3')]: 1 }
    expect(currentDestination('q4', buildUnitPath(U4, lessons, steps))).toEqual({ unitId: 'q4', stepId: 'consolidate-3' })
  })

  it('retombe sur la dernière étape quand l’unité est entièrement faite', () => {
    const path = buildUnitPath(U2, {}, {}).map((node) => ({ ...node, status: 'done' as const }))
    expect(currentDestination('g1', path)).toEqual({ unitId: 'g1', stepId: 'final' })
  })

  it('ne renvoie rien pour une unité sans nœud', () => {
    expect(currentDestination('vide', [])).toBeNull()
  })
})

describe('progression dans le parcours', () => {
  it('n’ouvre que la première étape au démarrage', () => {
    expect(statuses(buildUnitPath(U2, {}, {}))).toEqual(['available', 'locked', 'locked', 'locked'])
  })

  it('ouvre l’étape suivante quand la précédente est faite', () => {
    const path = buildUnitPath(U3, { 'v1-l1': done }, {})
    expect(statuses(path).slice(0, 3)).toEqual(['done', 'available', 'locked'])
  })

  it('reconnaît une étape de révision franchie', () => {
    const lessons = { 'v1-l1': done, 'v1-l2': done }
    const path = buildUnitPath(U3, lessons, {})
    expect(path[2]!.status).toBe('available')
    expect(path[3]!.status).toBe('locked')

    const opened = buildUnitPath(U3, lessons, { [stepKey('v1', path[2]!.id)]: 1 })
    expect(opened[2]!.status).toBe('done')
    expect(opened[3]!.status).toBe('available')
  })

  it('laisse une étape déjà faite accessible', () => {
    // Revenir en arrière doit rester possible : seul l'avenir est verrouillé.
    const path = buildUnitPath(U3, { 'v1-l1': done }, {})
    expect(path[0]!.status).toBe('done')
  })

  it('n’ouvre la séance finale qu’après la dernière étape', () => {
    const path = buildUnitPath(U2, {}, {})
    const final = path.find((node) => node.kind === 'final')!
    expect(final.status).toBe('locked')
  })
})

describe('étape suivante', () => {
  it('donne le nœud d’après, révision comprise', () => {
    const path = buildUnitPath(U3, { 'v1-l1': done, 'v1-l2': done }, {})
    expect(nextNodeAfter(path, 'v1-l1')?.id).toBe('v1-l2')
    expect(nextNodeAfter(path, 'v1-l2')?.kind).toBe('review')
  })

  it('renvoie null au bout du parcours', () => {
    const path = buildUnitPath(U3, {}, {})
    expect(nextNodeAfter(path, 'final')).toBeNull()
  })
})

describe('sélection des éléments à consolider', () => {
  const itemsById: Map<string, ItemLocation> = indexItems(COURSE)
  const now = Date.UTC(2026, 0, 10)
  const unitItemIds = ['v1-w1', 'v1-w2', 'v1-w3']

  function card(itemId: string, over: Partial<CardState>): CardState {
    return { ...createCard(itemId, 0), lastReviewed: now - DAY, step: null, interval: 10, due: now + DAY, ...over }
  }

  it('classe la carte la plus fragile en premier', () => {
    // Même intervalle affiché, mais l'une a rechuté trois fois.
    expect(solidity(card('a', { interval: 10, lapses: 0 }))).toBeGreaterThan(
      solidity(card('b', { interval: 10, lapses: 3 })),
    )
    // Une carte encore en apprentissage n'a rien d'acquis.
    expect(solidity(card('c', { step: 0 }))).toBe(0)
  })

  it('ignore ce qui n’a jamais été répondu', () => {
    const cards = { 'v1-w1': card('v1-w1', { lastReviewed: null, step: 0 }) }
    expect(consolidationEntries(cards, itemsById, { scope: 'unit', unitItemIds, now, limit: 10 })).toEqual([])
  })

  it('sert d’abord les cartes échues', () => {
    const cards = {
      'v1-w1': card('v1-w1', { due: now + 5 * DAY }),
      'v1-w2': card('v1-w2', { due: now - 3 * DAY }),
      'v1-w3': card('v1-w3', { due: now + 2 * DAY }),
    }
    const picked = consolidationEntries(cards, itemsById, { scope: 'unit', unitItemIds, now, limit: 10 })
    expect(picked[0]!.item.id).toBe('v1-w2')
  })

  it('complète avec les plus fragiles quand rien n’est échu', () => {
    const cards = {
      'v1-w1': card('v1-w1', { due: now + 5 * DAY, interval: 30 }),
      'v1-w2': card('v1-w2', { due: now + 5 * DAY, interval: 30, lapses: 4 }),
      'v1-w3': card('v1-w3', { due: now + 5 * DAY, interval: 2 }),
    }
    const picked = consolidationEntries(cards, itemsById, { scope: 'unit', unitItemIds, now, limit: 2 })
    // w3 (intervalle 2) puis w2 (30 mais quatre rechutes) ; w1 est le plus solide.
    expect(picked.map((entry) => entry.item.id)).toEqual(['v1-w3', 'v1-w2'])
  })

  it('reste dans l’unité en portée « unit », l’ouvre en portée « course »', () => {
    const cards = {
      'v1-w1': card('v1-w1', { due: now + 5 * DAY }),
      'g1-w1': card('g1-w1', { due: now - 2 * DAY }),
    }
    const inUnit = consolidationEntries(cards, itemsById, { scope: 'unit', unitItemIds, now, limit: 10 })
    expect(inUnit.map((entry) => entry.item.id)).toEqual(['v1-w1'])

    // Portée cours : l'élément échu d'une autre unité passe devant, ce qui est
    // tout l'intérêt de l'étape d'entraînement.
    const wide = consolidationEntries(cards, itemsById, { scope: 'course', unitItemIds, now, limit: 10 })
    expect(wide[0]!.item.id).toBe('g1-w1')
    expect(wide).toHaveLength(2)
  })

  it('respecte le plafond', () => {
    const cards = Object.fromEntries(unitItemIds.map((id) => [id, card(id, { due: now - DAY })]))
    expect(consolidationEntries(cards, itemsById, { scope: 'unit', unitItemIds, now, limit: 2 })).toHaveLength(2)
  })
})
