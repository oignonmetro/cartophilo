import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourse } from '@/content/CourseProvider'
import { buildReviewSession } from '@/engine/exercises'
import { withoutDeferred, type SessionOutcome } from '@/engine/progress'
import { dueCards, type CardState } from '@/engine/srs'
import { EMPTY_CARDS, EMPTY_DEFERRED, useProgress } from '@/store/progressStore'
import { SessionScreen } from './SessionScreen'
import { SessionResult } from './SessionResult'
import { Button } from '@/components/Button'
import type { PracticeItem } from '@/content/schema'

/** Nombre maximal d'éléments par session de révision : on garde des sessions courtes. */
const REVIEW_LIMIT = 15

export function ReviewRoute() {
  const navigate = useNavigate()
  const { course, itemsById } = useCourse()
  const allCards = useProgress((state) => state.cards[course.id] ?? EMPTY_CARDS)
  const deferred = useProgress((state) => state.deferred[course.id] ?? EMPTY_DEFERRED)
  // Une carte remise à plus tard attend son rattrapage, pas la révision.
  const cards = useMemo(() => withoutDeferred(allCards, deferred), [allCards, deferred])
  const finishReview = useProgress((state) => state.finishReview)
  const [finished, setFinished] = useState<{
    outcome: SessionOutcome
    xp: number
    peakTier: number
    deferred: number
  } | null>(null)

  // La file est figée à l'ouverture : les notes données pendant la session ne
  // doivent pas retirer des éléments de la session en cours. Toutes pistes
  // confondues — mélanger vocabulaire, grammaire et conjugaison ancre mieux
  // que réviser chaque nature d'un bloc. `cards` est déjà restreint au cours
  // affiché.
  const [entries] = useState<{ card: CardState; item: PracticeItem }[]>(() =>
    dueCards(Object.values(cards), Date.now(), REVIEW_LIMIT).map((card) => ({
      card,
      item: itemsById.get(card.itemId)!.item,
    })),
  )

  const exercises = useMemo(() => buildReviewSession(entries), [entries])

  if (finished) {
    return (
      <SessionResult
        outcome={finished.outcome}
        passed
        xp={finished.xp}
        peakTier={finished.peakTier}
        deferred={finished.deferred}
        onContinue={() => navigate(-1)}
        onRetry={() => navigate(-1)}
      />
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto px-8 text-center [&>*]:shrink-0">
        <h1 className="text-2xl font-black">Rien à réviser</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          Tout est à jour. Travaillez de nouvelles leçons, les révisions reviendront d'elles-mêmes.
        </p>
        <Button onClick={() => navigate(-1)}>Retour</Button>
      </div>
    )
  }

  return (
    <SessionScreen
      kind="review"
      exercises={exercises}
      onQuit={() => navigate(-1)}
      onFinish={(outcome, peakTier, deferred) =>
        setFinished({ outcome, peakTier, deferred, ...finishReview(outcome) })
      }
    />
  )
}
