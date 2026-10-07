import { describe, expect, it } from 'vitest'
import { unitSchema, type GrammarPoint, type Work, type WorkNode } from './schema'
import { itemsOfUnit } from './course'
import {
  lessonsFromWork,
  matchesLocation,
  pointsOf,
  stephanusStart,
  thesisFills,
  threadOf,
  workContextOf,
  workReferenceOf,
} from './work'
import { buildLessonSession, buildWorkSession, isNonLocating, itemIdsOf, workLocateFor, workMatchesFor, workMatchItems, workOrder, workOrderItems, type WorkLocateExercise } from '@/engine/exercises'
import { createRng } from '@/engine/rng'

function point(id: string): GrammarPoint {
  return { id, sentence: `Thèse ${id} : ___.`, answer: id, alt: [], options: [] }
}

function leaf(id: string, rel?: WorkNode['rel']): WorkNode {
  return { id, label: id.toUpperCase(), rel, points: [point(`p-${id}`)], parts: [] }
}

/** Un livre à deux blocs, une charnière entre eux, et deux liens. */
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
  recaps: [],
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

  it('localise, associe, puis remet le livre en ordre', () => {
    const session = buildLessonSession(lesson, 0, 1, false, 0, undefined, WORK)
    // Seules les cartes de lien, sans emplacement propre à localiser, passent en carte à trou.
    const gaps = session.filter((exercise) => exercise.kind === 'grammar-gap').flatMap(itemIdsOf)
    expect(gaps).toEqual(['lien-a3', 'lien-pivot'])
    expect(session.some((exercise) => exercise.kind === 'work-match')).toBe(true)
    expect(session[session.length - 1]?.kind).toBe('work-order')
  })

  it('en repérage seul, ne garde que la localisation et l’association', () => {
    const session = buildWorkSession(lesson, WORK, 0, 1)
    const kept = new Set(session.filter((exercise) => !isNonLocating(exercise)).map((exercise) => exercise.kind))
    expect([...kept].sort()).toEqual(['work-locate', 'work-match'])
    // Sautées : la remise en ordre, les cartes de lien au clavier.
    const skipped = new Set(session.filter(isNonLocating).map((exercise) => exercise.kind))
    expect([...skipped].sort()).toEqual(['grammar-gap', 'work-order'])
  })

  it('à la découverte seulement, le rappel d’un groupe de parties précède la première d’entre elles', () => {
    const recaps = [
      { at: 'a', label: 'A1-A3', title: 'Le bloc A', notes: 'Résumé de A.' },
      { at: 'pivot', label: 'PIVOT-B', title: 'La charnière et B', notes: 'Résumé.' },
    ]
    const work: Work = { ...WORK, recaps }
    const session = buildWorkSession(lesson, work, 0, 1)
    const rules = session.filter((exercise) => exercise.kind === 'rule')
    expect(rules).toMatchObject([
      { id: 'recap:a', title: 'Le bloc A', notes: 'Résumé de A.', passage: { label: 'A1-A3' } },
      { id: 'recap:pivot', title: 'La charnière et B' },
    ])
    const at = (id: string) => session.findIndex((exercise) => itemIdsOf(exercise).includes(id))
    expect(session.indexOf(rules[0]!)).toBeLessThan(at('p-a1'))
    expect(session.indexOf(rules[1]!)).toBeGreaterThan(at('p-a3'))
    expect(session.indexOf(rules[1]!)).toBeLessThan(at('p-pivot'))
    expect(buildWorkSession(lesson, work, 1, 1).some((exercise) => exercise.kind === 'rule')).toBe(false)
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
    const rounds = workMatchesFor({ parts: [many], links: [], recaps: [] }, many)
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

  it('reconnaît une référence d’œuvre à son titre, entier, abrégé ou en sigle, puis livre et chapitre', () => {
    const accepted: [string, string[]][] = [
      ['Métaphysique, Θ, 6', ['Métaphysique, Θ, 6', 'Métaphysique theta 6', 'Métaph. IX, 6', 'metaphysique 9 6']],
      ['Métaphysique, Α, 1', ['Métaphysique A 1', 'Métaph. alpha 1', 'Metaphysique I, 1']],
      ['Éthique à Nicomaque, I, 2-3', ['EN I 2-3', 'Éthique à Nicomaque, I, 2', 'Ethique I 2 3', 'EN 1, 2']],
      ['Grande Morale, II, 15', ['GM II 15', 'Grande Morale 2, 15']],
      ['De l’âme, II, 2', ['De l’âme II 2', 'DA II, 2', 'âme 2 2']],
      ['Poétique, 4', ['Poétique 4', 'Poét. 4']],
    ]
    for (const [label, values] of accepted) for (const value of values) expect(matchesLocation(label, value), `${label} ← ${value}`).toBe(true)
    const refused: [string, string[]][] = [
      ['Métaphysique, Θ, 6', ['Θ, 6', '9, 6', 'Métaphysique, Λ, 6', 'Physique IX 6', 'Métaphysique 6']],
      ['Éthique à Nicomaque, I, 2-3', ['I, 2', 'EN I 3', 'GM I 2', 'Politique I 2']],
      ['Poétique, 4', ['Poétique 6', 'Politique 4']],
    ]
    for (const [label, values] of refused) for (const value of values) expect(matchesLocation(label, value), `${label} ← ${value}`).toBe(false)
    expect(workReferenceOf('II, 4')).toBeNull()
    expect(workReferenceOf('§57, Rem. I')).toBeNull()
  })

  it('reconnaît les divisions annoncées, les ordinaux et les lettres datées', () => {
    const accepted: [string, string[]][] = [
      ['Discours de la méthode, IV', ['DM IV', 'Discours 4', 'Discours de la méthode, 4e partie', 'Discours, IV']],
      ['Méditations métaphysiques, I', ['Méditation I', 'Méd. 1', 'Méditations métaphysiques, 1']],
      ['Règles pour la direction de l’esprit, IV', ['Règle IV', 'Règles 4']],
      ['Principes de la philosophie, II, art. 4', ['Principes II 4', 'Principes, II, art. 4', 'Principes 2, article 4']],
      ['Principes de la philosophie, Lettre-préface', ['Principes, lettre-préface', 'Principes préface']],
      ['Réponses aux deuxièmes objections, déf. I', ['Réponses aux deuxièmes objections, définition 1', 'Réponses déf. I']],
      ['Réponses aux deuxièmes objections, objection VII', ['Réponses, objection 7', 'Réponses 7e objection']],
      ['Lettre à Chanut, 6 juin 1647', ['Chanut', 'Lettre à Chanut 1647', 'Chanut, 6 juin 1647']],
    ]
    for (const [label, values] of accepted) for (const value of values) expect(matchesLocation(label, value), `${label} ← ${value}`).toBe(true)
    const refused: [string, string[]][] = [
      ['Discours de la méthode, IV', ['DM III', 'Méditations IV', 'IV']],
      ['Principes de la philosophie, Lettre-préface', ['Principes I 1']],
      ['Réponses aux deuxièmes objections, déf. I', ['Réponses, objection VII']],
      ['Lettre à Chanut, 6 juin 1647', ['Chanut 1646', 'Mesland 1647']],
    ]
    for (const [label, values] of refused) for (const value of values) expect(matchesLocation(label, value), `${label} ← ${value}`).toBe(false)
  })

  it('exige les mots qui nomment la division, et reconnaît les titres sans division', () => {
    const accepted: [string, string[]][] = [
      ['Critique de la raison pure, Dialectique, Introduction', ['CRP Dialectique Introduction', 'CRP dial. intro', 'Critique de la raison pure, dialectique, introduction']],
      ['Critique de la raison pure, Préface de 1787', ['CRP préface 1787', 'CRP 1787']],
      ['Fondements de la métaphysique des mœurs, II', ['FMM II', 'Fondements des moeurs 2']],
      ['Critique de la faculté de juger, § 46', ['CFJ 46', 'CFJ § 46']],
      ['Qu’est-ce que les Lumières ?', ['Lumières', 'Qu’est-ce que les Lumières']],
      ['Idée d’une histoire universelle, 4e proposition', ['Idée 4', 'Histoire universelle, 4e proposition']],
    ]
    for (const [label, values] of accepted) for (const value of values) expect(matchesLocation(label, value), `${label} ← ${value}`).toBe(true)
    const refused: [string, string[]][] = [
      ['Critique de la raison pure, Dialectique, Introduction', ['CRP Dialectique', 'CRP Logique Introduction', 'CRP intro']],
      ['Critique de la raison pure, Introduction de 1787', ['CRP 1787', 'CRP préface 1787']],
      ['Critique de la raison pratique, Dialectique', ['Critique de la raison pure, Dialectique']],
    ]
    for (const [label, values] of refused) for (const value of values) expect(matchesLocation(label, value), `${label} ← ${value}`).toBe(false)
    expect(matchesLocation('Préface', 'preface')).toBe(true)
  })

  it('reconnaît un texte à sa pagination Stephanus, l’œuvre en plus si l’on veut', () => {
    const label = 'République VII, 514a-517c'
    for (const value of ['514a', '514', '514a-517c', 'République VII 514a', 'rep. vii, 514', 'republique 514a'])
      expect(matchesLocation(label, value), value).toBe(true)
    for (const value of ['514b', '517c', 'Banquet 514a', '', 'VII']) expect(matchesLocation(label, value), value).toBe(false)
    expect(matchesLocation('Apologie de Socrate, 29c-30c', 'Apologie 29c')).toBe(true)
    expect(stephanusStart('II, 4')).toBeNull()
    expect(stephanusStart('§57, Rem. I')).toBeNull()
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
