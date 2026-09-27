import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { WorkLocateExercise } from '@/engine/exercises'
import { Button } from '@/components/Button'
import { Rich } from '@/components/session/RuleNote'
import { OptionList } from '@/components/session/OptionList'
import { useSessionHaptics } from '@/components/session/useSessionHaptics'
import { useSessionSounds } from '@/components/session/useSessionSounds'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { ThesisText } from './WorkTree'

/**
 * Localiser une thèse : elle est donnée en entier, on choisit où elle se
 * trouve dans l'œuvre. Les emplacements seuls sont proposés (voir
 * `WorkLocateExercise`) ; la correction rappelle le titre du chapitre juste,
 * pour que l'emplacement se rattache à quelque chose.
 */
export function WorkLocate({
  exercise,
  onAnswer,
}: {
  exercise: WorkLocateExercise
  onAnswer: (correct: boolean) => void
}) {
  const { point, answer, options } = exercise
  const [picked, setPicked] = useState<string | null>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()
  const isDesktop = useIsDesktop()

  useEffect(() => {
    setPicked(null)
  }, [exercise.id])

  const checked = picked !== null
  const correct = picked === answer.label

  function pick(option: string) {
    const right = option === answer.label
    setPicked(option)
    sounds.success(right)
    haptics.answered(exercise, right)
  }

  // Au clavier : les chiffres choisissent, Entrée continue, comme ailleurs sur ordinateur.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (checked) {
        if (event.key !== 'Enter') return
        event.preventDefault()
        onAnswer(correct)
        return
      }
      const option = options[Number(event.key) - 1]
      if (option) pick(option)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="shrink-0 text-center text-sm font-bold tracking-wide text-ink-faint uppercase">
        Situez cette thèse
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <div className="card-3d px-5 py-5 text-center text-lg leading-relaxed font-bold md:px-10 md:py-8">
          <ThesisText point={point} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3">
        <OptionList options={options} picked={picked} isCorrect={(option) => option === answer.label} onPick={pick} />

        {checked && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <p
              className={`rounded-2xl border-2 px-4 py-2.5 text-center text-sm ${
                correct ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'
              }`}
            >
              <span className={`font-black ${correct ? 'text-success' : 'text-error'}`}>{answer.label}</span>
              {answer.title && (
                <span className="text-ink-soft">
                  {' · '}
                  <Rich text={`« ${answer.title} »`} />
                </span>
              )}
            </p>
            <Button block tone={correct ? 'success' : 'error'} onClick={() => onAnswer(correct)}>
              Continuer
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
