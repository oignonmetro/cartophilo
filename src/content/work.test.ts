import { describe, expect, it } from 'vitest'
import { unitSchema, type GrammarPoint, type Work, type WorkNode } from './schema'
import { itemsOfUnit } from './course'
import { isDrawn, lessonsFromWork, linksOf, pointsOf, thesisFills, threadOf, workContextOf } from './work'
import { buildLessonSession, itemIdsOf, workLocateFor, workOrder, workOrderItems, type WorkPlanExercise } from '@/engine/exercises'
import { createRng } from '@/engine/rng'

function point(id: string): GrammarPoint {
  return { id, sentence: `Thèse ${id} : ___.`, answer: id, alt: [], options: [] }
}

function leaf(id: string, rel?: WorkNode['rel']): WorkNode {
  return { id, label: id.toUpperCase(), rel, points: [point(`p-${id}`)], parts: [] }
}

/** Un livre à deux blocs, une charnière entre eux, un lien éloigné et un lien déjà dessiné. */
const WORK: Work = {
  parts: [
    {
      id: 'livre',
      label: 'Livre',
      points: [],
      parts: [
        { id: 'a', label: 'A', points: [], parts: [leaf('a1'), leaf('a2', 'declinaison'), leaf('a3', 'declinaison')] },
        leaf('pivot', 'consequence'),
        { id: 'b', label: 'B', rel: 'probleme-solution', points: [], parts: [leaf('b1'), leaf('b2', 'application'), leaf('b3', 'consequence')] },
      ],
    },
  ],
  links: [
    { from: 'a3', to: 'pivot', rel: 'reprise', points: [point('lien-a3')] },
    { from: 'pivot', to: 'b1', rel: 'probleme-solution', points: [point('lien-pivot')] },
  ],
}

describe('plan d’une unité-œuvre', () => {
  it('dérive une leçon par livre, thèses dans l’ordre du plan puis cartes des liens', () => {
    const [lesson] = lessonsFromWork('u', WORK)
    expect(lesson?.id).toBe('u-livre')
    expect(lesson?.work).toBe('livre')
    expect(lesson?.points.map((p) => p.id)).toEqual([
      'p-a1',
      'p-a2',
      'p-a3',
      'p-pivot',
      'p-b1',
      'p-b2',
      'p-b3',
      'lien-a3',
      'lien-pivot',
    ])
  })

  it('situe une thèse dans l’œuvre, et la carte d’un lien entre ses deux extrémités', () => {
    expect(workContextOf(WORK, 'p-b2')).toEqual({ label: 'B2', title: undefined, nodeId: 'b2' })
    expect(workContextOf(WORK, 'lien-a3')).toEqual({ label: 'A3 → PIVOT', title: 'reprise' })
  })

  it('ne signale pas à part un lien que le plan dessine déjà', () => {
    // pivot → b1 : la flèche « problème → solution » de pivot vers le bloc B le montre.
    expect(isDrawn(WORK, WORK.links[1]!)).toBe(true)
    expect(isDrawn(WORK, WORK.links[0]!)).toBe(false)
    expect(linksOf(WORK, 'b1')).toEqual([])
    expect(linksOf(WORK, 'pivot').map(({ link }) => link.rel)).toEqual(['reprise'])
  })

  it('répartit les réponses entre les trous comme le moteur', () => {
    expect(thesisFills({ ...point('x'), sentence: '___ et ___', answer: 'un ; deux' })).toEqual(['un', 'deux'])
    expect(thesisFills({ ...point('x'), sentence: '___ et ___', answer: 'seul' })).toEqual(['seul', ''])
  })

  it('compile une unité qui n’écrit que son plan, et en situe les éléments', () => {
    const unit = unitSchema.parse({
      id: 'u',
      title: 'U',
      kind: 'grammar',
      work: WORK,
      lessons: lessonsFromWork('u', WORK),
    })
    const items = itemsOfUnit(unit)
    expect(items).toHaveLength(9)
    const first = items[0]
    expect(first?.kind === 'grammar' && first.work).toEqual({ label: 'A1', title: undefined, nodeId: 'a1' })
  })
})

describe('séance d’une leçon d’unité-œuvre', () => {
  const [raw] = lessonsFromWork('u', WORK)
  const lesson = { ...raw!, notes: undefined, points: raw!.points }
  const all = pointsOf(WORK.parts[0]!).map((p) => p.id)

  it('à la découverte : le plan à lire, un plan à trois trous, puis bloc par bloc, et le plan entier pour finir', () => {
    const session = buildLessonSession(lesson, 0, 1, false, 0, undefined, WORK)
    expect(session[0]?.kind).toBe('work-map')

    const opening = session[1] as WorkPlanExercise
    expect(opening.kind).toBe('work-plan')
    expect(opening.holes).toHaveLength(3)
    // Un trou par bloc : A, la charnière, B.
    expect(new Set(opening.holes.map((id) => id.slice(2, 3)))).toEqual(new Set(['a', 'p', 'b']))

    const last = session[session.length - 1] as WorkPlanExercise
    expect(last.kind).toBe('work-plan')
    expect(last.holes).toEqual(all)
    expect([...last.bank].sort()).toEqual([...all].sort())

    // Chaque thèse et chaque carte de lien passe au moins une fois en carte à trou.
    const gaps = session.filter((exercise) => exercise.kind === 'grammar-gap').flatMap(itemIdsOf)
    expect(gaps).toEqual(['p-a1', 'p-a2', 'p-a3', 'p-pivot', 'lien-a3', 'p-b1', 'lien-pivot', 'p-b2', 'p-b3'])

    // Les blocs d'au moins trois thèses ont leur propre plan à trous.
    const blockPlans = session.filter((exercise) => exercise.kind === 'work-plan').map((exercise) => exercise.id)
    expect(blockPlans).toEqual([
      'work-plan:livre:opening',
      'work-plan:livre:a',
      'work-plan:livre:b',
      'work-plan:livre:full',
    ])
  })

  it('rejouée : pas de plan à lire, et un premier plan à moitié vide', () => {
    const session = buildLessonSession(lesson, 1, 1, false, 0, undefined, WORK)
    expect(session[0]?.kind).toBe('work-plan')
    expect((session[0] as WorkPlanExercise).holes).toHaveLength(Math.ceil(all.length / 2))
  })

  it('à la découverte, fait localiser jusqu’à trois thèses par bloc, jamais une carte de lien', () => {
    const session = buildLessonSession(lesson, 0, 1, false, 0, undefined, WORK)
    const located = session.filter((exercise) => exercise.kind === 'work-locate').flatMap(itemIdsOf)
    expect(located).toHaveLength(3 + 1 + 3)
    expect(located.some((id) => id.startsWith('lien'))).toBe(false)
  })

  it('rejouée, chaque thèse est soit restituée, soit localisée', () => {
    const session = buildLessonSession(lesson, 1, 7, false, 0, undefined, WORK)
    const asked = session
      .filter((exercise) => exercise.kind === 'grammar-gap' || exercise.kind === 'work-locate')
      .flatMap(itemIdsOf)
    expect([...asked].sort()).toEqual([...lesson.points.map((p) => p.id)].sort())
    expect(session.some((exercise) => exercise.kind === 'work-locate')).toBe(true)
  })
})

describe('localiser une thèse', () => {
  const pointOf = (id: string) => pointsOf(WORK.parts[0]!).find((p) => p.id === id)!

  it('propose l’emplacement juste et ses plus proches voisins, dans l’ordre du plan', () => {
    const exercise = workLocateFor(pointOf('p-a2'), WORK, workContextOf(WORK, 'p-a2'), createRng(3))!
    expect(exercise.options).toContain('A2')
    expect(exercise.options).toHaveLength(4)
    const order = ['A1', 'A2', 'A3', 'PIVOT', 'B1', 'B2', 'B3']
    expect(exercise.options).toEqual([...exercise.options].sort((a, b) => order.indexOf(a) - order.indexOf(b)))
    // Les leurres viennent des cinq voisins les plus proches : B3, le plus éloigné, n'y est jamais.
    expect(exercise.options).not.toContain('B3')
  })

  it('ne localise pas la carte d’un lien, qui n’a pas d’emplacement propre', () => {
    const [raw] = lessonsFromWork('u', WORK)
    const lien = raw!.points.find((p) => p.id === 'lien-a3')!
    expect(workLocateFor(lien, WORK, workContextOf(WORK, 'lien-a3'), createRng(1))).toBeNull()
  })
})

describe('remettre le raisonnement dans l’ordre', () => {
  it('suit le fil du livre, les chapitres de même plan réunis en une étape', () => {
    expect(threadOf(WORK.parts[0]!).map((step) => step.map((node) => node.id))).toEqual([
      ['a1', 'a2', 'a3'],
      ['pivot'],
      ['b1'],
      ['b2'],
      ['b3'],
    ])
  })

  it('mélange les étapes sans jamais rendre l’ordre juste, et note les thèses des étapes manquées', () => {
    for (let seed = 0; seed < 20; seed++) {
      const exercise = workOrder(WORK, 'livre', createRng(seed))!
      expect([...exercise.bank].sort()).toEqual([0, 1, 2, 3, 4])
      expect(exercise.bank).not.toEqual([0, 1, 2, 3, 4])
    }
    const exercise = workOrder(WORK, 'livre', createRng(1))!
    expect(workOrderItems(exercise, [0])).toEqual(['p-a1', 'p-a2', 'p-a3'])
    expect(itemIdsOf(exercise)).toHaveLength(7)
  })

  it('vient juste avant le plan entier, à la fin de la leçon', () => {
    const [raw] = lessonsFromWork('u', WORK)
    const session = buildLessonSession({ ...raw!, notes: undefined }, 0, 1, false, 0, undefined, WORK)
    expect(session.slice(-2).map((exercise) => exercise.kind)).toEqual(['work-order', 'work-plan'])
  })
})
