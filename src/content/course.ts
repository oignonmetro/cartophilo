import type {
  Course,
  GrammarLesson,
  Lesson,
  Passage,
  LessonKind,
  ManifestEntry,
  PracticeItem,
  Track,
  Unit,
} from './schema'
import { noteTables, plainInline, type NoteTableBlock } from './notes'
import { workContextOf } from './work'

/**
 * Accès au contenu d'un cours, indépendamment de son agencement.
 *
 * Le reste de l'application ne devrait jamais parcourir `sections` ou
 * `tracks` à la main : ces fonctions donnent la même vue des deux.
 */

export interface LessonEntry {
  lesson: Lesson
  unit: Unit
  /** Piste d'appartenance, seulement pour l'agencement `library`. */
  track: Track | null
}

/** Toutes les unités d'un cours, dans l'ordre de déclaration. */
export function unitsOf(course: Course): { unit: Unit; track: Track | null }[] {
  if (course.layout === 'library') {
    return course.tracks.flatMap((track) => track.units.map((unit) => ({ unit, track })))
  }
  return course.sections.flatMap((section) => section.units.map((unit) => ({ unit, track: null })))
}

/** Toutes les leçons d'un cours, dans l'ordre de déclaration. */
export function lessonsOf(course: Course): LessonEntry[] {
  return unitsOf(course).flatMap(({ unit, track }) =>
    unit.lessons.map((lesson) => ({ lesson, unit, track })),
  )
}

export function findLesson(course: Course, lessonId: string): LessonEntry | null {
  return lessonsOf(course).find((entry) => entry.lesson.id === lessonId) ?? null
}

/**
 * Les éléments pratiquables d'une leçon, à plat.
 * C'est cette liste qui alimente la révision espacée : un élément, une carte.
 *
 * `unit` n'est utile qu'à une leçon d'unité-œuvre : c'est le plan de l'unité
 * qui dit où se trouve chaque thèse (voir `WorkContext`). Sans lui, les
 * identifiants restent justes, seul l'en-tête des cartes manque.
 */
export function itemsOfLesson(lesson: Lesson, unit?: Unit): PracticeItem[] {
  switch (lesson.kind) {
    case 'vocab':
      return lesson.vocab.map((vocab) => ({ kind: 'vocab' as const, id: vocab.id, vocab }))
    case 'grammar': {
      const passage = lesson.passage ? { label: lesson.passage.label, heading: lesson.title } : undefined
      const work = lesson.work ? unit?.work : undefined
      const points: PracticeItem[] = lesson.points.map((point) => ({
        kind: 'grammar' as const,
        id: point.id,
        point,
        passage,
        work: work ? workContextOf(work, point.id) : undefined,
        workTree: work,
      }))
      const tables: PracticeItem[] = lessonTables(lesson).map(({ id, table }) => ({
        kind: 'table' as const,
        id,
        table,
        heading: lesson.title,
      }))
      return [...points, ...tables]
    }
    case 'conjugation':
      return lesson.verbs.flatMap((verb) =>
        verb.forms.map((form) => ({ kind: 'conjugation' as const, id: form.id, form, verb })),
      )
  }
}

/** Un tableau du rappel d'une leçon, et l'identifiant qui le suit en révision espacée. */
export interface LessonTable {
  id: string
  table: NoteTableBlock
}

/**
 * Les tableaux du rappel d'une leçon de grammaire (leçons de texte
 * comprises, unités-œuvres exclues), chacun un élément de la révision
 * espacée, joué en tableau à trous (voir `tableExercises`).
 *
 * Aucun identifiant à écrire dans le YAML : il se tire de la leçon et de la
 * ligne d'en-tête du tableau (« m7-l1:tableau:moment-repere-ce-qui-s-y-joue »).
 * Corriger ou ajouter des rangées garde donc l'historique de révision, et
 * insérer un autre tableau avant lui ne le fait pas passer à un autre
 * contenu, comme le ferait un numéro d'ordre. Changer l'en-tête en fait un
 * nouvel élément, repris de zéro. Deux tableaux de même en-tête dans une
 * même leçon prennent un suffixe (« -2 »). Un tableau sans aucune case
 * remplie n'a rien à demander et n'en est pas un.
 */
export function lessonTables(lesson: Lesson): LessonTable[] {
  if (lesson.kind !== 'grammar' || lesson.work) return []
  const seen = new Map<string, number>()
  return noteTables(lesson.notes ?? '')
    .filter((table) => table.rows.some((row) => [row.label, ...row.cells].some((cell) => plainInline(cell))))
    .map((table) => {
      const base = `${lesson.id}:tableau:${tableSlug(table)}`
      const count = (seen.get(base) ?? 0) + 1
      seen.set(base, count)
      return { id: count === 1 ? base : `${base}-${count}`, table }
    })
}

/** L'en-tête d'un tableau en identifiant : « Ce qui s'y joue » → « ce-qui-s-y-joue ». */
function tableSlug(table: NoteTableBlock): string {
  const slug = [table.corner, ...table.columns]
    .map(plainInline)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
  return slug || 'sans-en-tete'
}

/** Une leçon de texte : un paragraphe cité, puis ses cartes, dans l'ordre (voir `passageSchema`). */
export function isPassageLesson(lesson: Lesson): lesson is GrammarLesson & { passage: Passage } {
  return lesson.kind === 'grammar' && lesson.passage !== undefined
}

/**
 * Une carte-citation cite le texte : elle porte un fragment, ou tient tout
 * entière entre « ». Une carte-explication peut s'ouvrir sur une citation
 * (« « Normal » vient du latin ___ ») : elle continue alors après le ».
 */
export function isCitation(card: { sentence: string; fragment?: string }): boolean {
  const sentence = card.sentence.trim()
  return Boolean(card.fragment) || (sentence.startsWith('«') && sentence.endsWith('»'))
}

/**
 * La leçon de texte réduite à ses cartes-citation, pour le mode « citations
 * seulement » (voir `citationsOnly` dans le store) : sans son explication, le
 * paragraphe s'affiche seul à la découverte, et les cartes-explication sont
 * sautées. `null` quand la leçon n'a rien à réduire : ce n'est pas une leçon
 * de texte, ou elle n'a aucune carte-citation (introduction, prolongement),
 * auquel cas elle se joue en entier plutôt que de ne rien laisser à jouer.
 */
export function citationsOnlyLesson(lesson: Lesson): Lesson | null {
  if (!isPassageLesson(lesson)) return null
  const points = lesson.points.filter(isCitation)
  if (points.length === 0) return null
  return { ...lesson, notes: undefined, points }
}

/** Une unité consacrée à un texte : au moins une de ses leçons en cite un paragraphe. */
export function isTextUnit(unit: Unit): boolean {
  return unit.lessons.some(isPassageLesson)
}

/** Une unité-œuvre : son plan tient lieu de contenu, ses leçons en dérivent (voir `workSchema`). */
export function isWorkUnit(unit: Unit): unit is Unit & { work: NonNullable<Unit['work']> } {
  return unit.work !== undefined
}

export function itemsOfUnit(unit: Unit): PracticeItem[] {
  return unit.lessons.flatMap((lesson) => itemsOfLesson(lesson, unit))
}

export function findUnit(course: Course, unitId: string): Unit | null {
  return unitsOf(course).find(({ unit }) => unit.id === unitId)?.unit ?? null
}

export function itemsOfCourse(course: Course): PracticeItem[] {
  return lessonsOf(course).flatMap((entry) => itemsOfLesson(entry.lesson))
}

/** Index élément → leçon, pour retrouver un élément depuis une carte de révision. */
export interface ItemLocation {
  item: PracticeItem
  lessonId: string
  unitId: string
  trackId: string | null
}

export function indexItems(course: Course): Map<string, ItemLocation> {
  const byId = new Map<string, ItemLocation>()
  for (const { lesson, unit, track } of lessonsOf(course)) {
    for (const item of itemsOfLesson(lesson, unit)) {
      byId.set(item.id, { item, lessonId: lesson.id, unitId: unit.id, trackId: track?.id ?? null })
    }
  }
  return byId
}

/**
 * Libellé d'une nature de contenu : « 12 points », « 1 forme ».
 *
 * `grammar` porte aussi bien une règle de langue (le cours `demo`) qu'un
 * fait philosophique isolé (les quatre cours de philosophie, voir
 * `content/philosophie.md`) : « point », déjà le nom du champ `points:` dans
 * le contenu, couvre les deux sans trancher pour l'un contre l'autre.
 */
export const KIND_LABELS: Record<LessonKind, { one: string; many: string }> = {
  vocab: { one: 'mot', many: 'mots' },
  grammar: { one: 'point', many: 'points' },
  conjugation: { one: 'forme', many: 'formes' },
}

export function countLabel(kind: LessonKind, count: number): string {
  const { one, many } = KIND_LABELS[kind]
  return `${count} ${count > 1 ? many : one}`
}

/**
 * Même libellé, mais pour une leçon dont on connaît le contenu — « 6 lettres »
 * là où le compte générique dirait « 6 mots ».
 *
 * Une carte de vocabulaire peut porter une lettre plutôt qu'un mot (c'est
 * ainsi que le cours de russe enseigne l'alphabet), et une leçon de l'unité
 * d'alphabet n'en contient alors que. Annoncer « 6 mots » sous six lettres
 * cyrilliques décrirait mal ce qui attend l'apprenant ; une leçon mixte, elle,
 * reste comptée en mots.
 */
export function lessonCountLabel(lesson: Lesson): string {
  const items = itemsOfLesson(lesson)
  if (lesson.kind === 'vocab' && lesson.vocab.every((entry) => entry.pos === 'lettre')) {
    return `${items.length} ${items.length > 1 ? 'lettres' : 'lettre'}`
  }
  return countLabel(lesson.kind, items.length)
}

/**
 * Les lettres qu'une unité enseigne, dans l'ordre où elle les enseigne —
 * `null` si elle n'en enseigne aucune (l'immense majorité des unités).
 *
 * Sert de sous-titre à sa carte dans la bibliothèque (voir `LibraryScreen`) :
 * pour une unité d'alphabet, les lettres elles-mêmes disent mieux ce qu'il y
 * a à apprendre qu'une phrase de description, et se lisent d'un coup d'œil.
 */
export function unitLetters(unit: Unit): string | null {
  const letters = unit.lessons.flatMap((lesson) =>
    lesson.kind === 'vocab' ? lesson.vocab.filter((entry) => entry.pos === 'lettre').map((entry) => entry.term) : [],
  )
  return letters.length > 0 ? letters.join(' ') : null
}

/**
 * `name` ne porte que la langue (« Anglais », « Russe ») ; ce qui identifiait
 * jusqu'ici un cours dans les libellés d'accessibilité — « Anglais B1» —
 * se recompose ici plutôt que de dupliquer le niveau dans `name`.
 */
export function courseLabel(course: { name: string; level?: string }): string {
  return course.level ? `${course.name} ${course.level}` : course.name
}

/** Un groupe de cours qui partagent la même langue apprise. */
export interface LanguageGroup {
  /** Code de la langue apprise (`learning`), qui distingue deux groupes. */
  learning: string
  name: string
  flag: string
  courses: ManifestEntry[]
}

/**
 * Regroupe les cours du sélecteur par langue apprise, sans réordonner : un
 * groupe apparaît à la position de son premier cours, et les cours d'un même
 * groupe gardent entre eux l'ordre du manifeste. C'est ce qui distingue les
 * niveaux d'une même langue (B1, B2, C1) sans dupliquer le drapeau et le nom
 * sur chaque ligne.
 */
export function groupCoursesByLanguage(courses: readonly ManifestEntry[]): LanguageGroup[] {
  const groups: LanguageGroup[] = []
  const byLearning = new Map<string, LanguageGroup>()

  for (const course of courses) {
    let group = byLearning.get(course.learning)
    if (!group) {
      group = { learning: course.learning, name: course.name, flag: course.flag, courses: [] }
      byLearning.set(course.learning, group)
      groups.push(group)
    }
    group.courses.push(course)
  }
  return groups
}
