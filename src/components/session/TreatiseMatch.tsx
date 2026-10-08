import type { TreatiseLink, TreatiseMatchExercise } from '@/engine/exercises'
import { PairBoard } from './PairBoard'

const MATCH_PROMPT: Record<TreatiseLink, string> = {
  'title-number': 'Associez chaque traité à sa numérotation',
  'title-thesis': 'Associez chaque thèse au traité qui la défend',
  'number-thesis': 'Associez chaque numérotation à la thèse du traité',
}

/**
 * Association de repérage dans les traités : relier chaque titre à sa double
 * numérotation (« 53 [I, 1] »). Le plateau est celui de l'association de
 * vocabulaire (voir `PairBoard`) ; les identifiants des paires sont ceux des
 * traités, rendus tels quels à la clôture.
 */
export function TreatiseMatch({
  exercise,
  onDone,
}: {
  exercise: TreatiseMatchExercise
  onDone: (result: { missedIds: string[] }) => void
}) {
  return (
    <PairBoard
      seed={exercise.id}
      pairs={exercise.pairs}
      prompt={MATCH_PROMPT[exercise.link]}
      onDone={onDone}
    />
  )
}
