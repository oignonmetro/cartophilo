import type { TreeLesson } from './types'

/**
 * Parenthèses dans l'éditeur : des leçons consécutives d'une unité qui portent
 * la même clé `aside:` (voir `asideFrom` dans `src/content/course.ts`).
 */

/**
 * La clé à donner à une leçon qu'on met entre parenthèses : celle de la
 * leçon d'avant si elle en est déjà, sinon celle de la leçon d'après (la
 * leçon rejoint ainsi la parenthèse voisine), sinon une clé neuve, tirée de
 * son identifiant.
 */
export function asideKeyFor(lessons: readonly TreeLesson[], lessonId: string): string {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  return lessons[index - 1]?.aside ?? lessons[index + 1]?.aside ?? lessonId
}

/**
 * Les autres leçons de la parenthèse de clé `key` qui entoure la leçon
 * `lessonId`, dans l'ordre de l'unité : celles qui la touchent, de proche en
 * proche, avec la même clé.
 */
export function asideCompanions(lessons: readonly TreeLesson[], lessonId: string, key: string): TreeLesson[] {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1) return []
  let start = index
  while (start > 0 && lessons[start - 1]!.aside === key) start -= 1
  let end = index
  while (end < lessons.length - 1 && lessons[end + 1]!.aside === key) end += 1
  return lessons.slice(start, end + 1).filter((lesson) => lesson.id !== lessonId)
}
