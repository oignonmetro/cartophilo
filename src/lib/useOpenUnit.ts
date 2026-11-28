import { useNavigate } from 'react-router-dom'
import type { Course, Unit } from '@/content/schema'
import { buildUnitPath, currentDestination, deferredOfUnit } from '@/engine/unitPath'
import { EMPTY_DEFERRED, EMPTY_LESSON_PROGRESS, EMPTY_STEPS, useProgress } from '@/store/progressStore'

/**
 * Ouvrir une unité mène droit à son étape courante — pas à un écran de
 * parcours à traverser pour la retrouver (voir `currentDestination`).
 */
export function useOpenUnit(course: Course): (unit: Unit) => void {
  const navigate = useNavigate()
  const lessons = useProgress((state) => state.lessons[course.id] ?? EMPTY_LESSON_PROGRESS)
  const steps = useProgress((state) => state.steps[course.id] ?? EMPTY_STEPS)
  const deferred = useProgress((state) => state.deferred[course.id] ?? EMPTY_DEFERRED)

  return (unit) => {
    const path = buildUnitPath(unit, lessons, steps, deferredOfUnit(unit, deferred).length)
    const destination = currentDestination(unit.id, path)
    if (!destination) return
    navigate('lessonId' in destination ? `/lecon/${destination.lessonId}` : `/etape/${destination.unitId}/${destination.stepId}`)
  }
}
