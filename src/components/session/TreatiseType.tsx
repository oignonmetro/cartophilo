import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { TreatiseTypeExercise } from '@/engine/exercises'
import type { Rating } from '@/engine/srs'
import { isTreatiseAnswerCorrect } from '@/engine/treatiseAnswers'
import { Button } from '@/components/Button'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useProgress } from '@/store/progressStore'
import { AnswerModeSwitch } from './AnswerModeSwitch'
import { RATINGS, RevealButtons } from './RevealButtons'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/** La consigne d'un écrit, d'après ce qu'on cherche (`to`) et le mode de réponse. */
function questionOf(to: TreatiseTypeExercise['to'], reveal: boolean, revealed: boolean): string {
  if (reveal) return revealed ? 'Notez-vous' : 'Révélez la réponse'
  return to === 'number' ? 'Quelle est la numérotation de ce traité ?' : 'Quel est le titre de ce traité ?'
}

/**
 * Écrit de repérage dans les traités : la numérotation d'un traité d'après son
 * titre, ou son titre d'après l'une de ses thèses (avec la numérotation). La
 * réponse se tape, sans option ni indice ; ou, pour un titre long à taper sur
 * téléphone, se révèle puis s'auto-évalue (même réglage que les phrases à trou,
 * voir `gapModes`).
 */
export function TreatiseType({
  exercise,
  onAnswer,
}: {
  exercise: TreatiseTypeExercise
  /** `rating` : présent pour une auto-évaluation (mode révéler), absent pour une réponse écrite. */
  onAnswer: (correct: boolean, rating?: Rating) => void
}) {
  const { prompt, given, answer, from, to } = exercise
  const isDesktop = useIsDesktop()
  const device = isDesktop ? 'desktop' : 'mobile'
  const mode = useProgress((state) => state.gapModes[device])
  const setGapMode = useProgress((state) => state.setGapMode)
  const reveal = mode === 'reveal'

  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const [revealed, setRevealed] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()

  useEffect(() => {
    setValue('')
    setChecked(null)
    setRevealed(false)
  }, [exercise.id])

  // Le champ n'a le focus qu'en mode écrire (différé : voir la même remarque dans `TypeAnswer`).
  useEffect(() => {
    if (reveal) return
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [exercise.id, reveal])

  const filled = value.trim().length > 0
  const answered = checked !== null || revealed

  function settle(correct: boolean) {
    setChecked(correct)
    sounds.success(correct)
    haptics.answered(exercise, correct)
  }

  // Touches 1, 2, 3 pour s'auto-évaluer, Entrée pour révéler (sur ordinateur).
  useEffect(() => {
    if (!isDesktop || !reveal) return
    function onKeyDown(event: KeyboardEvent) {
      if (!revealed) {
        if (event.key === 'Enter') {
          event.preventDefault()
          setRevealed(true)
        }
        return
      }
      const picked = RATINGS.find((item) => item.key === event.key)
      if (picked) {
        event.preventDefault()
        onAnswer(picked.rating === 'good', picked.rating)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, reveal, revealed, onAnswer])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-cream py-1">
        <span aria-hidden />
        <p className="text-center text-sm font-bold uppercase tracking-wide text-ink-faint">
          {questionOf(to, reveal, revealed)}
        </p>
        <div className="flex justify-end">
          <AnswerModeSwitch mode={mode} disabled={answered} onChange={(next) => setGapMode(device, next)} />
        </div>
      </div>

      <div className="card-3d flex flex-col items-center gap-3 px-4 py-6 text-center">
        <span
          className={`font-black break-words ${from === 'thesis' ? 'text-lg leading-snug' : 'text-xl'} ${from === 'title' ? 'italic' : ''}`}
        >
          {prompt}
        </span>
        {given && <span className="text-sm font-bold text-ink-faint">{given}</span>}
      </div>

      {reveal ? (
        revealed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-3d px-4 py-5 text-center"
          >
            <p className={`text-lg font-black break-words ${to === 'title' ? 'italic' : ''}`}>{answer}</p>
          </motion.div>
        )
      ) : (
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
      )}

      {!reveal && checked !== null && (
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
        {reveal ? (
          revealed ? (
            <RevealButtons isDesktop={isDesktop} onRate={(rating) => onAnswer(rating === 'good', rating)} />
          ) : (
            <Button block tone="violet" onClick={() => setRevealed(true)}>
              Révéler
            </Button>
          )
        ) : checked === null ? (
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
