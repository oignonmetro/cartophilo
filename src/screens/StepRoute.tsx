import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCourse } from '@/content/CourseProvider'
import { findUnit, itemsOfUnit } from '@/content/course'
import { buildPracticeSession, buildReviewSession, workOrder, type Exercise } from '@/engine/exercises'
import { createRng, seedFrom } from '@/engine/rng'
import type { SessionOutcome } from '@/engine/progress'
import {
  buildUnitPath,
  consolidationEntries,
  finalEntries,
  nextNodeAfter,
  stepKey,
  type ConsolidationEntry,
} from '@/engine/unitPath'
import { useProgress } from '@/store/progressStore'
import { SessionScreen } from './SessionScreen'
import { SessionResult } from './SessionResult'
import { Button } from '@/components/Button'

/**
 * Sessions courtes : une étape de parcours reprend l'essentiel, la révision
 * espacée se charge du reste. Quinze cartes à l'origine, ramenées à dix
 * quand les étapes sont devenues plus rares (voir `layout`, unitPath.ts).
 */
const STEP_LIMIT = 10

/**
 * Étape de parcours qui n'est pas une leçon : révision de l'unité,
 * approfondissement, ou entraînement sur les points fragiles.
 */
export function StepRoute() {
  const { unitId = '', stepId = '' } = useParams()
  return <StepSession key={`${unitId}/${stepId}`} unitId={unitId} stepId={stepId} />
}

function StepSession({ unitId, stepId }: { unitId: string; stepId: string }) {
  const navigate = useNavigate()
  const { course, itemsById } = useCourse()
  const finishStep = useProgress((state) => state.finishStep)
  const skipTo = useProgress((state) => state.skipTo)
  const [finished, setFinished] = useState<{ outcome: SessionOutcome; xp: number; peakTier: number } | null>(null)

  const unit = useMemo(() => findUnit(course, unitId), [course, unitId])
  const node = useMemo(() => {
    if (!unit) return null
    const { lessons, steps } = useProgress.getState()
    return (
      buildUnitPath(unit, lessons[course.id] ?? {}, steps[course.id] ?? {}).find(
        (candidate) => candidate.id === stepId,
      ) ?? null
    )
  }, [unit, stepId, course.id])

  // Figé à l'ouverture : les réponses données pendant la session ne doivent
  // pas remanier la file en cours.
  const [entries] = useState<ConsolidationEntry[]>(() => {
    if (!unit || !node || node.kind === 'lesson') return []
    const unitItemIds = itemsOfUnit(unit).map((item) => item.id)
    // La séance finale ne reprend que les cartes qui ont rechuté plusieurs
    // fois, les plus fragiles d'abord (voir `finalEntries`).
    if (node.kind === 'final') return finalEntries(useProgress.getState().cards[course.id] ?? {}, itemsById, unitItemIds)
    return consolidationEntries(useProgress.getState().cards[course.id] ?? {}, itemsById, {
      // Seul l'entraînement sort de l'unité : c'est là qu'on va chercher ce
      // qui a été appris ailleurs et qui redemande du travail.
      scope: node.kind === 'workout' ? 'course' : 'unit',
      unitItemIds,
      now: Date.now(),
      limit: STEP_LIMIT,
    })
  })

  const exercises = useMemo(() => {
    if (!node) return []
    // L'approfondissement et la séance finale forcent la production ; les
    // deux autres suivent l'état réel de chaque carte.
    const session =
      node.kind === 'drill' || node.kind === 'final' ? buildPracticeSession(entries) : buildReviewSession(entries)
    // Une unité-œuvre se clôt en reconstituant son plan, livre par livre :
    // le fil du raisonnement de chacun.
    if (node.kind !== 'final' || !unit?.work) return session
    const work = unit.work
    const rng = createRng(seedFrom('final-plan', unit.id, entries.length))
    const closing = work.parts.flatMap((part): Exercise[] => {
      const order = workOrder(work, part.id, rng)
      return order ? [order] : []
    })
    return [...session, ...closing]
  }, [entries, node, unit])

  if (!unit || !node || node.kind === 'lesson') return <Navigate to="/" replace />

  // Même remarque que `LessonRoute` : revenir en arrière plutôt que de
  // forcer l'accueil, pour retomber sur la page d'où l'étape a été ouverte.
  const backHome = () => navigate(-1)

  if (finished) {
    const { lessons, steps } = useProgress.getState()
    const next = nextNodeAfter(
      buildUnitPath(unit, lessons[course.id] ?? {}, steps[course.id] ?? {}),
      stepId,
    )
    return (
      <SessionResult
        outcome={finished.outcome}
        passed
        xp={finished.xp}
        peakTier={finished.peakTier}
        onContinue={backHome}
        onNext={
          next && next.status !== 'locked'
            ? () => navigate(next.lesson ? `/lecon/${next.lesson.id}` : `/etape/${unit.id}/${next.id}`, { replace: true })
            : undefined
        }
        onRetry={backHome}
      />
    )
  }

  if (exercises.length === 0) {
    // Une étape peut se retrouver sans rien à réviser (les leçons qui la
    // précèdent n'ont jamais été jouées) : rester bloqué là serait une
    // impasse, d'où l'échappatoire ci-dessous.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto px-8 text-center [&>*]:shrink-0">
        <h1 className="text-2xl font-black">Rien à travailler</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          {node.kind === 'final'
            ? "Aucune carte de cette unité n'a rechuté plusieurs fois : il n'y a rien à reprendre dans ce bilan. Vous pouvez le valider."
            : "Cette étape reprend ce que vous avez déjà rencontré. Faites d'abord les leçons qui la précèdent, ou passez cette étape si elles ont été sautées."}
        </p>
        <div className="flex gap-3">
          <Button tone="neutral" onClick={backHome}>
            Retour à l'accueil
          </Button>
          <Button
            onClick={() => {
              skipTo(course.id, [], [stepKey(unit.id, stepId)])
              backHome()
            }}
          >
            {node.kind === 'final' ? 'Valider cette étape' : 'Passer cette étape'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SessionScreen
      kind={node.kind}
      exercises={exercises}
      onQuit={backHome}
      onFinish={(outcome, peakTier) =>
        setFinished({ outcome, peakTier, ...finishStep(course.id, stepKey(unit.id, stepId), outcome) })
      }
    />
  )
}
