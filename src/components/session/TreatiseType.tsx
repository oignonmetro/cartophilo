import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { TreatiseTypeExercise } from '@/engine/exercises'
import { isTreatiseAnswerCorrect } from '@/engine/treatiseAnswers'
import { Button } from '@/components/Button'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/** La consigne d'un écrit, d'après ce qu'on donne (`from`) et ce qu'on cherche (`to`). */
function questionOf(to: TreatiseTypeExercise['to']): string {
  return to === 'number' ? 'Quelle est la numérotation de ce traité ?' : 'Quel est le titre de ce traité ?'
}

/**
 * Écrit de repérage dans les traités : la numérotation d'un traité d'après son
 * titre, ou son titre d'après l'une de ses thèses (avec la numérotation). La
 * réponse se tape : sans option ni indice, c'est l'étape la plus exigeante.
 */
export function TreatiseType({
  exercise,
  onAnswer,
}: {
  exercise: TreatiseTypeExercise
  onAnswer: (correct: boolean) => void
}) {
  const { prompt, given, answer, from, to } = exercise
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const input = useRef<HTMLInputElement>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()

  useEffect(() => {
    setValue('')
    setChecked(null)
    // Différé : voir la même remarque dans `TypeAnswer`.
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [exercise.id])

  const filled = value.trim().length > 0

  function settle(correct: boolean) {
    setChecked(correct)
    sounds.success(correct)
    haptics.answered(exercise, correct)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="sticky top-0 z-10 bg-cream py-1 text-center text-sm font-bold uppercase tracking-wide text-ink-faint">
        {questionOf(to)}
      </p>

      <div className="card-3d flex flex-col items-center gap-3 px-4 py-6 text-center">
        <span
          className={`font-black break-words ${from === 'thesis' ? 'text-lg leading-snug' : 'text-xl'} ${from === 'title' ? 'italic' : ''}`}
        >
          {prompt}
        </span>
        {given && <span className="text-sm font-bold text-ink-faint">{given}</span>}
      </div>

      <input
        ref={input}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          if (checked === null && filled) settle(isTreatiseAnswerCorrect(to, answer, value))
          else if (checked !== null) onAnswer(checked)
        }}
        disabled={checked !== null}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        lang="fr"
        placeholder={to === 'number' ? 'Rang [Ennéade, place]' : 'Le titre du traité…'}
        aria-label="Votre réponse"
        className={`w-full rounded-2xl border-2 bg-paper px-4 py-4 text-lg font-bold outline-none disabled:opacity-70 ${
          checked === null ? 'border-line focus:border-teal' : checked ? 'border-success' : 'border-error'
        }`}
      />

      {checked !== null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col items-center gap-2 text-center ${checked ? 'text-success' : 'text-error'}`}
        >
          {checked ? (
            <p className="text-sm font-bold">Bonne réponse.</p>
          ) : (
            <>
              <p className="text-sm font-bold">La bonne réponse :</p>
              <p className={`text-lg font-black break-words ${to === 'title' ? 'italic' : ''}`}>{answer}</p>
            </>
          )}
        </motion.div>
      )}

      <div className="mt-auto flex flex-col items-center gap-3">
        {checked === null ? (
          <>
            <Button block disabled={!filled} onClick={() => settle(isTreatiseAnswerCorrect(to, answer, value))}>
              Vérifier
            </Button>
            <button
              type="button"
              onClick={() => {
                setValue('')
                settle(false)
              }}
              className="text-sm font-bold text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-soft"
            >
              Je ne sais pas
            </button>
          </>
        ) : (
          <Button block tone={checked ? 'success' : 'error'} onClick={() => onAnswer(checked)}>
            Continuer
          </Button>
        )}
      </div>
    </div>
  )
}
