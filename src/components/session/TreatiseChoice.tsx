import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { TreatiseChoiceExercise, TreatiseColumn } from '@/engine/exercises'
import { Button } from '@/components/Button'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { OptionList } from './OptionList'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/** La consigne d'un QCM, d'après ce qu'on donne (`from`) et ce qu'on cherche (`to`). */
function questionOf(from: TreatiseColumn, to: TreatiseColumn): string {
  if (to === 'number') return from === 'thesis' ? 'Quelle numérotation porte le traité de cette thèse ?' : 'Quelle numérotation ?'
  if (to === 'thesis') return 'Quelle thèse défend ce traité ?'
  return from === 'thesis' ? 'Quel traité défend cette thèse ?' : 'Quel traité ?'
}

/**
 * QCM de repérage dans les traités : un titre dont on cherche la double
 * numérotation, ou l'inverse. Les leurres sont des traités voisins (voir
 * `treatises.ts`) : c'est entre eux qu'on se trompe.
 */
export function TreatiseChoice({
  exercise,
  onAnswer,
}: {
  exercise: TreatiseChoiceExercise
  onAnswer: (correct: boolean) => void
}) {
  const { prompt, answer, options, from, to } = exercise
  const [picked, setPicked] = useState<string | null>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()
  const isDesktop = useIsDesktop()

  useEffect(() => {
    setPicked(null)
  }, [exercise.id])

  const checked = picked !== null
  const correct = checked && picked === answer

  // Entrée fait continuer une fois répondu (les chiffres sont gérés par `OptionList`).
  useEffect(() => {
    if (!isDesktop || !checked) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      event.preventDefault()
      onAnswer(correct)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, checked, correct, onAnswer])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-center text-sm font-bold uppercase tracking-wide text-ink-faint">
        {questionOf(from, to)}
      </p>

      <div className="card-3d px-4 py-4 text-center">
        <span
          className={`font-black break-words ${from === 'thesis' ? 'text-lg leading-snug' : 'text-xl'}`}
        >
          {prompt}
        </span>
      </div>

      <OptionList
        options={options}
        picked={picked}
        isCorrect={(option) => option === answer}
        size={to === 'thesis' ? 'long' : 'normal'}
        onPick={(option) => {
          setPicked(option)
          const right = option === answer
          sounds.success(right)
          haptics.answered(exercise, right)
        }}
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
