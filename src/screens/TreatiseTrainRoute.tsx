import { useCallback, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCourse } from '@/content/CourseProvider'
import type { TreatiseGhostExercise } from '@/engine/exercises'
import { materializeTreatise, treatiseGhosts } from '@/engine/treatises'
import type { SessionOutcome } from '@/engine/progress'
import { useProgress } from '@/store/progressStore'
import { SessionScreen } from './SessionScreen'
import { SessionResult } from './SessionResult'

/**
 * Repérage général dans les traités du cours (voir `engine/treatises.ts`) :
 * accessible directement depuis l'onglet qui les liste, sans rappel ni leçon.
 * La séance se construit à l'ouverture, d'après les traités en cours
 * d'apprentissage à cet instant ; chaque nouvelle séance repart de ce que la
 * précédente a validé.
 */
export function TreatiseTrainRoute() {
  const navigate = useNavigate()
  const { course } = useCourse()
  const finishStep = useProgress((state) => state.finishStep)
  const [attempt, setAttempt] = useState(0)
  const [finished, setFinished] = useState<{ outcome: SessionOutcome; xp: number; peakTier: number } | null>(null)

  const entries = useMemo(
    () =>
      course.layout === 'library'
        ? (course.tracks.find((track) => track.entries && track.entries.length > 0)?.entries ?? [])
        : [],
    [course],
  )

  // Des places réservées, pas des exercices : chacun se forme au moment de
  // l'ouvrir, d'après ce que les réponses précédentes ont appris (un traité
  // maîtrisé laisse aussitôt sa place à un nouveau). `attempt` relance une
  // séance sur ce que la précédente a validé.
  const ghosts = useMemo(() => treatiseGhosts(), [attempt])
  const seed = useMemo(() => Date.now() + attempt, [attempt])
  const materialize = useCallback(
    (ghost: TreatiseGhostExercise) =>
      materializeTreatise(ghost, entries, useProgress.getState().treatises[course.id] ?? {}, seed),
    [entries, course.id, seed],
  )

  if (entries.length === 0) return <Navigate to="/" replace />

  const back = () => navigate(-1)

  if (finished) {
    return (
      <SessionResult
        outcome={finished.outcome}
        passed
        xp={finished.xp}
        peakTier={finished.peakTier}
        onContinue={back}
        onNext={() => {
          setFinished(null)
          setAttempt((n) => n + 1)
        }}
        onRetry={back}
      />
    )
  }

  return (
    <SessionScreen
      key={attempt}
      kind="workout"
      showKind={false}
      exercises={ghosts}
      materialize={materialize}
      onQuit={back}
      onFinish={(outcome, peakTier) =>
        setFinished({ outcome, peakTier, ...finishStep(course.id, 'traites:reperage', outcome) })
      }
    />
  )
}
