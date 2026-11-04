import type { TreatiseLink, TreatiseMatchExercise } from '@/engine/exercises'
import { useCourse } from '@/content/CourseProvider'
import { termLanguage } from '@/content/definitions'
import { PairBoard } from './PairBoard'

const termPrompt = (language: string): Partial<Record<TreatiseLink, string>> => ({
  'title-number': `Associez chaque notion à son terme ${language}`,
  'title-thesis': 'Associez chaque définition à sa notion',
})

const MATCH_PROMPT: Record<TreatiseLink, string> = {
  'title-number': 'Associez chaque traité à sa numérotation',
  'title-thesis': 'Associez chaque thèse au traité qui la défend',
  'title-example': 'Associez chaque exemple au traité qui en fait cet usage',
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
  // En italique : le titre d'un traité, le terme grec d'une notion.
  const italic = exercise.domain === 'terms' ? 'number' : 'title'
  const language = termLanguage(useCourse().course.id)
  return (
    <PairBoard
      seed={exercise.id}
      pairs={exercise.pairs}
      prompt={(exercise.domain === 'terms' && termPrompt(language)[exercise.link]) || MATCH_PROMPT[exercise.link]}
      italicSides={[exercise.columns[0] === italic, exercise.columns[1] === italic]}
      onDone={onDone}
    />
  )
}
