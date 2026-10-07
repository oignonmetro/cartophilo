import type { Unit } from '@/content/schema'
import { buildLessonSession, type RuleExercise } from './exercises'
import { seedFrom } from './rng'
import { sectionRank } from './unitPath'

/**
 * Les fiches (rappels de cours) d'une unité, dans l'ordre des leçons, telles
 * qu'une leçon les montre à sa découverte : `buildLessonSession` au niveau 0,
 * dont on ne garde que les rappels. Même rendu que pendant une séance
 * (paragraphe cité, rappel coupé par fragments…), sans rien jouer : de quoi
 * relire tout le cours d'une unité sans avoir suivi ses leçons.
 */
export function unitFiches(unit: Unit): RuleExercise[] {
  return unit.lessons.flatMap((lesson) =>
    buildLessonSession(
      lesson,
      0,
      seedFrom(lesson.id, 'fiches'),
      undefined,
      sectionRank(unit, lesson.id),
      unit.lessons[0]?.id === lesson.id ? unit.intro : undefined,
      unit.work,
    ).filter((exercise): exercise is RuleExercise => exercise.kind === 'rule'),
  )
}
