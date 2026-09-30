import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { WorkLocateExercise } from '@/engine/exercises'
import { matchesLocation, stephanusStart } from '@/content/work'
import { Button } from '@/components/Button'
import { Rich } from '@/components/session/RuleNote'
import { OptionList } from '@/components/session/OptionList'
import { useSessionHaptics } from '@/components/session/useSessionHaptics'
import { useSessionSounds } from '@/components/session/useSessionSounds'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useKeyboardOpen } from '@/lib/useKeyboardOpen'
import { ThesisText } from './WorkTree'

/**
 * Localiser une thèse : elle est donnée en entier, on dit où elle se trouve
 * dans l'œuvre. Deux façons, selon la maturité de la carte (voir
 * `WorkLocateExercise`) : choisir parmi quelques emplacements voisins, ou
 * saisir l'emplacement au clavier (« II, 4 », « chap. 4 », « 4 »). La
 * correction rappelle le titre du chapitre juste, pour que l'emplacement se
 * rattache à quelque chose.
 */
export function WorkLocate({
  exercise,
  onAnswer,
}: {
  exercise: WorkLocateExercise
  onAnswer: (correct: boolean) => void
}) {
  const { point, answer, options, typed } = exercise
  const [picked, setPicked] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()
  const isDesktop = useIsDesktop()
  const keyboardOpen = useKeyboardOpen()

  useEffect(() => {
    setPicked(null)
    setValue('')
    if (!typed) return
    // Différé, comme dans `GrammarGap`, pour laisser la transition d'entrée finir avant le clavier.
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [exercise.id, typed])

  const checked = picked !== null
  const correct = checked && (typed ? matchesLocation(answer.label, picked) : picked === answer.label)

  function submit(candidate: string) {
    const right = typed ? matchesLocation(answer.label, candidate) : candidate === answer.label
    setPicked(candidate)
    sounds.success(right)
    haptics.answered(exercise, right)
  }

  // Au clavier : les chiffres choisissent (QCM), Entrée vérifie puis continue.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (checked) {
        if (event.key !== 'Enter') return
        event.preventDefault()
        onAnswer(correct)
        return
      }
      if (typed) return // Entrée est gérée par le champ lui-même.
      const option = options[Number(event.key) - 1]
      if (option) submit(option)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {!keyboardOpen && (
        <p className="shrink-0 text-center text-sm font-bold tracking-wide text-ink-faint uppercase">
          Situez cette thèse
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <div className="card-3d px-5 py-5 text-center text-lg leading-relaxed font-bold md:px-10 md:py-8">
          <ThesisText point={point} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3">
        {typed ? (
          <input
            ref={input}
            value={checked ? picked : value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !checked && value.trim()) submit(value)
            }}
            disabled={checked}
            // Un exemple de la forme attendue, qui ne soit la réponse d'aucune carte.
            placeholder={stephanusStart(answer.label) ? 'ex. 17a' : 'II, 4'}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Emplacement"
            className={`w-full rounded-2xl border-2 bg-paper px-4 py-3 text-center text-lg font-bold outline-none disabled:opacity-70 ${
              !checked ? 'border-line focus:border-violet' : correct ? 'border-success' : 'border-error'
            }`}
          />
        ) : (
          <OptionList options={options} picked={picked} isCorrect={(option) => option === answer.label} onPick={submit} />
        )}

        {checked ? (
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
        ) : (
          typed && (
            <div className="flex flex-col items-center gap-3">
              <Button block tone="violet" disabled={!value.trim()} onClick={() => submit(value)}>
                Vérifier
              </Button>
              {!keyboardOpen && (
                <button
                  type="button"
                  onClick={() => submit('')}
                  className="text-sm font-bold text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-soft"
                >
                  Je ne sais pas
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
