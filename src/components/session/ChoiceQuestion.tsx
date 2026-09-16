import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ChoiceCue, ChoiceExercise } from '@/engine/exercises'
import { choiceAnswer, choicePrompt, choicePromptIsLearningLanguage, normalizeAnswer } from '@/engine/exercises'
import { Button } from '@/components/Button'
import { learningLanguage } from '@/lib/speech'
import { highlightDiffWords } from './highlightDiffWords'
import { OptionList } from './OptionList'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/**
 * QCM : reconnaître la bonne réponse parmi des leurres, juste après avoir
 * relié le mot dans une manche d'association — une étape de reconnaissance
 * de plus avant la phrase à trou qui suit.
 *
 * Trois énoncés possibles pour un même mot (voir `ChoiceCue`), ce qui évite
 * de reposer indéfiniment la même question. Chacun demande un rappel
 * différent, d'où la consigne qui change avec lui.
 */
const PROMPTS: Record<ChoiceCue, string> = {
  term: 'Choisissez le sens',
  translation: 'Choisissez la traduction',
  audio: 'Quel mot entendez-vous ?',
}

export function ChoiceQuestion({
  exercise,
  onAnswer,
}: {
  exercise: ChoiceExercise
  onAnswer: (correct: boolean) => void
}) {
  const { vocab, cue, options } = exercise
  const answer = choiceAnswer(vocab, cue)
  const [picked, setPicked] = useState<string | null>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()

  useEffect(() => {
    setPicked(null)
  }, [exercise.id])

  const checked = picked !== null
  const correct = checked && normalizeAnswer(picked) === normalizeAnswer(answer)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-center text-sm font-bold uppercase tracking-wide text-ink-faint">{PROMPTS[cue]}</p>

      <div className="card-3d px-4 py-3 text-center">
        <span
          lang={choicePromptIsLearningLanguage(cue) ? learningLanguage() : 'fr'}
          className="text-xl font-black break-words"
        >
          {choicePrompt(vocab, cue)}
        </span>
      </div>

      <OptionList
        options={options}
        picked={picked}
        isCorrect={(option) => normalizeAnswer(option) === normalizeAnswer(answer)}
        onPick={(option) => {
          const wasCorrect = normalizeAnswer(option) === normalizeAnswer(answer)
          setPicked(option)
          sounds.success(wasCorrect)
          haptics.answered(exercise, wasCorrect)
        }}
        renderOption={highlightDiffWords(options)}
      />

      <div className="mt-auto">
        {checked && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Button block tone={correct ? 'success' : 'error'} onClick={() => onAnswer(correct)}>
              Continuer
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
