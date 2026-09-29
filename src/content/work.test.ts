import { describe, expect, it } from 'vitest'
import { unitSchema, type GrammarPoint, type Work, type WorkNode } from './schema'
import { itemsOfUnit } from './course'
import { isDrawn, lessonsFromWork, linksOf, matchesLocation, planRoundsOf, planTextOf, pointsOf, thesisFills, threadOf, workContextOf } from './work'
import { buildLessonSession, buildWorkSession, itemIdsOf, workLocateFor, workMatchesFor, workMatchItems, workOrder, workOrderItems, type WorkLocateExercise, type WorkPlanExercise } from '@/engine/exercises'
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

  it('schémas archivés : ni plan à lire ni plan à trous, le reste de la leçon inchangé', () => {
    const session = buildLessonSession(lesson, 0, 1, false, 0, undefined, WORK)
    expect(session.some((exercise) => exercise.kind === 'work-map' || exercise.kind === 'work-plan')).toBe(false)
    // Seules les cartes de lien, sans emplacement propre à localiser, passent en carte à trou.
    const gaps = session.filter((exercise) => exercise.kind === 'grammar-gap').flatMap(itemIdsOf)
    expect(gaps).toEqual(['lien-a3', 'lien-pivot'])
    expect(session.some((exercise) => exercise.kind === 'work-match')).toBe(true)
    expect(session[session.length - 1]?.kind).toBe('work-order')
  })

  it('schémas réactivés, à la découverte : le plan à lire, puis bloc par bloc, les plans à trous arrivant après leurs chapitres', () => {
    const session = buildWorkSession(lesson, WORK, 0, 1, true)
    expect(session[0]?.kind).toBe('work-map')

    // Seules les cartes de lien passent en carte à trou, faute d'emplacement propre à localiser.
    const gaps = session.filter((exercise) => exercise.kind === 'grammar-gap').flatMap(itemIdsOf)
    expect(gaps).toEqual(['lien-a3', 'lien-pivot'])

    // Un plan à trous par niveau du schéma, chacun après le bloc de son dernier chapitre.
    const plans = session.filter((exercise): exercise is WorkPlanExercise => exercise.kind === 'work-plan')
    expect(plans.map((plan) => plan.holes)).toEqual([
      ['a1', 'a2', 'a3'],
      ['pivot', 'b1', 'b2', 'b3'],
    ])
    expect(session.indexOf(plans[0]!)).toBeLessThan(session.findIndex((exercise) => itemIdsOf(exercise).includes('p-pivot')))
    expect([...plans[1]!.bank].sort()).toEqual(['b1', 'b2', 'b3', 'pivot'])
    // Un chapitre manqué compte pour ses thèses.
    expect(itemIdsOf(plans[0]!)).toEqual(['p-a1', 'p-a2', 'p-a3'])
  })

  it('schémas réactivés, rejouée : pas de plan à lire', () => {
    const session = buildWorkSession(lesson, WORK, 1, 1, true)
    expect(session.some((exercise) => exercise.kind === 'work-map')).toBe(false)
  })

  it('dès la découverte, localise toute thèse qui a un emplacement propre, jamais une carte de lien', () => {
    const session = buildLessonSession(lesson, 0, 1, false, 0, undefined, WORK)
    const located = session.filter((exercise) => exercise.kind === 'work-locate').flatMap(itemIdsOf)
    expect([...located].sort()).toEqual(['p-a1', 'p-a2', 'p-a3', 'p-b1', 'p-b2', 'p-b3', 'p-pivot'])
    expect(located.some((id) => id.startsWith('lien'))).toBe(false)
  })

  it('rejouée, chaque thèse reste localisée ; seules les cartes de lien restent des phrases à trou', () => {
    const session = buildLessonSession(lesson, 1, 7, false, 0, undefined, WORK)
    const asked = session
      .filter((exercise) => exercise.kind === 'grammar-gap' || exercise.kind === 'work-locate')
      .flatMap(itemIdsOf)
    expect([...asked].sort()).toEqual([...lesson.points.map((p) => p.id)].sort())
    const gaps = session.filter((exercise) => exercise.kind === 'grammar-gap').flatMap(itemIdsOf)
    expect([...gaps].sort()).toEqual(['lien-a3', 'lien-pivot'])
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

  it('clôt la leçon', () => {
    const [raw] = lessonsFromWork('u', WORK)
    const session = buildLessonSession({ ...raw!, notes: undefined }, 0, 1, false, 0, undefined, WORK)
    expect(session[session.length - 1]?.kind).toBe('work-order')
  })
})

describe('associer chaque chapitre à ce qu’il affirme', () => {
  const [livre] = WORK.parts

  it('fait une manche par bloc d’au moins trois chapitres, dans l’ordre du plan', () => {
    const [a, pivot] = livre!.parts
    const [round] = workMatchesFor(WORK, a!)
    expect(round?.pairs.map((pair) => pair.id)).toEqual(['a1', 'a2', 'a3'])
    expect(round?.pairs[0]).toEqual({ id: 'a1', left: 'A1', right: 'A1' })
    expect(workMatchesFor(WORK, pivot!)).toEqual([])
    expect(workMatchItems(round!, ['a2'])).toEqual(['p-a2'])
  })

  it('coupe un long bloc en manches égales plutôt que de laisser un reste de deux', () => {
    const many: WorkNode = { id: 'm', label: 'M', points: [], parts: Array.from({ length: 8 }, (_, i) => leaf(`m${i}`)) }
    const rounds = workMatchesFor({ parts: [many], links: [] }, many)
    expect(rounds.map((round) => round.pairs.length)).toEqual([4, 4])
  })

  it('a sa place dans la leçon, bloc par bloc', () => {
    const [raw] = lessonsFromWork('u', WORK)
    const session = buildLessonSession({ ...raw!, notes: undefined }, 0, 1, false, 0, undefined, WORK)
    expect(session.filter((exercise) => exercise.kind === 'work-match')).toHaveLength(2)
  })
})

describe('saisir l’emplacement au clavier', () => {
  it('accepte les façons courantes d’écrire un emplacement, et refuse un autre livre', () => {
    for (const value of ['II, 4', 'ii,4', 'II 4', '2, 4', '2.4', 'livre II chap. 4', 'chap. 4', 'chap.4', 'chapitre 4', '4']) {
      expect(matchesLocation('II, 4', value), value).toBe(true)
    }
    for (const value of ['II, 5', 'III, 4', '5', 'chap. 14', '', 'quatre']) {
      expect(matchesLocation('II, 4', value), value).toBe(false)
    }
    expect(matchesLocation('Préface', 'preface')).toBe(true)
  })

  it('accepte un paragraphe par son seul numéro, sans le prendre pour un livre et un chapitre', () => {
    for (const value of ['§16', '§ 16', '16', 'paragraphe 16']) expect(matchesLocation('§16', value), value).toBe(true)
    for (const value of ['§17', '6', '1, 16', '']) expect(matchesLocation('§16', value), value).toBe(false)
    expect(matchesLocation('§10-12', '10-12')).toBe(true)
    expect(matchesLocation('§10-12', '12')).toBe(false)
  })

  it('se saisit à partir de la troisième fois qu’on joue la leçon', () => {
    const [raw] = lessonsFromWork('u', WORK)
    const lesson = { ...raw!, notes: undefined }
    const locates = (level: number) =>
      buildLessonSession(lesson, level, 7, false, 0, undefined, WORK).filter(
        (exercise): exercise is WorkLocateExercise => exercise.kind === 'work-locate',
      )
    expect(locates(1).every((exercise) => !exercise.typed)).toBe(true)
    expect(locates(2).length).toBeGreaterThan(0)
    expect(locates(2).every((exercise) => exercise.typed && exercise.options.length === 0)).toBe(true)
  })
})

describe('les manches du plan à trous', () => {
  const chapter = (id: string, rel?: WorkNode['rel']) => leaf(id, rel)

  it('suivent les niveaux du schéma, comme au livre II du Contrat social', () => {
    // chap. 1-3 de même plan ; 4 → 5 ; 6 ; 7 ; 8-10 de même plan ; 11 ; 12.
    const livre: WorkNode = {
      id: 'l2',
      label: 'Livre II',
      points: [],
      parts: [
        {
          id: 'l2-1-5',
          label: 'chap. 1-5',
          question: '?',
          points: [],
          parts: [
            { id: 'l2-1-3', label: 'chap. 1-3', points: [], parts: [chapter('c1'), chapter('c2', 'declinaison'), chapter('c3', 'declinaison')] },
            { id: 'l2-4-5', label: 'chap. 4-5', rel: 'limite', points: [], parts: [chapter('c4'), chapter('c5', 'application')] },
          ],
        },
        chapter('c6', 'consequence'),
        {
          id: 'l2-7-12',
          label: 'chap. 7-12',
          question: '?',
          rel: 'probleme-solution',
          points: [],
          parts: [
            chapter('c7'),
            { id: 'l2-8-10', label: 'chap. 8-10', rel: 'application', points: [], parts: [chapter('c8'), chapter('c9', 'declinaison'), chapter('c10', 'declinaison')] },
            chapter('c11', 'consequence'),
            chapter('c12', 'consequence'),
          ],
        },
      ],
    }
    expect(planRoundsOf(livre).map((round) => round.map((node) => node.id))).toEqual([
      ['c1', 'c2', 'c3'],
      ['c4', 'c5', 'c6', 'c7'],
      ['c8', 'c9', 'c10'],
      ['c11', 'c12'],
    ])
  })

  it('ne laissent jamais un chapitre seul', () => {
    const livre: WorkNode = {
      id: 'l',
      label: 'L',
      points: [],
      parts: [
        { id: 'g', label: 'G', points: [], parts: [chapter('x1'), chapter('x2', 'declinaison')] },
        chapter('x3', 'consequence'),
      ],
    }
    expect(planRoundsOf(livre).map((round) => round.map((node) => node.id))).toEqual([['x1', 'x2', 'x3']])
  })

  it('font replacer l’argument, à défaut l’affirmation', () => {
    expect(planTextOf({ ...chapter('r'), reason: 'qui veut la fin veut les moyens' })).toBe('car qui veut la fin veut les moyens')
    expect(planTextOf({ ...chapter('s'), summary: 'Le souverain est absolu' })).toBe('Le souverain est absolu')
  })
})
