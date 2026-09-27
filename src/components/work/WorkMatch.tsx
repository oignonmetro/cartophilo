import type { WorkMatchExercise } from '@/engine/exercises'
import { workMatchItems } from '@/engine/exercises'
import { PairBoard } from '@/components/session/PairBoard'

/**
 * Association d'une unité-œuvre : relier chaque chapitre à ce qu'il affirme.
 * Le plateau est celui de l'association de vocabulaire (voir `PairBoard`) ;
 * seules changent les paires, et la traduction des paires manquées (des
 * chapitres) en éléments notés (leurs thèses).
 */
export function WorkMatch({
  exercise,
  onDone,
}: {
  exercise: WorkMatchExercise
  onDone: (result: { missedIds: string[] }) => void
}) {
  return (
    <PairBoard
      seed={exercise.id}
      pairs={exercise.pairs}
      prompt="Associez chaque chapitre à ce qu'il affirme"
      onDone={({ missedIds }) => onDone({ missedIds: workMatchItems(exercise, missedIds) })}
    />
  )
}
