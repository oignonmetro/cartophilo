import { forwardRef, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { ClozeExercise } from '@/engine/exercises'
import { normalizeForm } from '@/engine/exercises'
import { Button } from '@/components/Button'
import { sentenceTextSize, sentenceTextSizeMd } from '@/lib/textDensity'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useKeyboardOpen } from '@/lib/useKeyboardOpen'
import { CorrectionGap } from './CorrectionGap'
import { ExpectedAnswer } from './ExpectedAnswer'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/**
 * Phrase à trou.
 *
 * Deux modes selon le niveau : on pioche le mot dans une banque tant que la
 * leçon est jeune, on le saisit au clavier une fois qu'elle est solide.
 */
export function ClozeSentence({
  exercise,
  onAnswer,
}: {
  exercise: ClozeExercise
  onAnswer: (correct: boolean) => void
}) {
  const { vocab, sentence, bank } = exercise
  const textSize = sentenceTextSize('text-2xl', sentence.before.length + sentence.match.length + sentence.after.length)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const [gapResolved, setGapResolved] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const blank = useRef<HTMLSpanElement>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()
  // Voir la même remarque dans `GrammarGap`.
  const keyboardOpen = useKeyboardOpen()
  const isDesktop = useIsDesktop()

  // Voir la même remarque dans `GrammarGap`.
  useEffect(() => {
    blank.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [exercise.id, keyboardOpen])

  useEffect(() => {
    setValue('')
    setChecked(null)
    setGapResolved(false)
    if (bank) return
    // Différé : voir la même remarque dans `GrammarGap`.
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [exercise.id, bank])

  const filled = value.trim().length > 0

  function check(candidate: string) {
    const correct = normalizeForm(candidate) === normalizeForm(sentence.match)
    setValue(candidate)
    setChecked(correct)
    sounds.success(correct)
    haptics.answered(exercise, correct)
  }

  // Raccourci clavier, réservé à l'ordinateur : voir la même remarque dans `GrammarGap`.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      if (checked !== null) {
        if (!checked && !bank && !gapResolved) return
        event.preventDefault()
        onAnswer(checked)
        return
      }
      if (bank) return
      if (!filled) {
        event.preventDefault()
        check('')
        return
      }
      if (document.activeElement === input.current) return
      event.preventDefault()
      check(value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, checked, bank, gapResolved, filled, value, onAnswer])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Retirée pendant que le clavier est ouvert : voir la même remarque dans `GrammarGap`. */}
      {!keyboardOpen && (
        <p className="shrink-0 text-center text-sm font-bold uppercase tracking-wide text-ink-faint">
          Complétez la phrase
        </p>
      )}

      {/* La carte défile pour son propre compte, centrée dans son espace sur ordinateur : voir la même remarque dans `GrammarGap`. */}
      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <div className="card-3d flex flex-col items-center gap-3 px-5 py-6 text-center md:gap-4 md:px-10 md:py-12">
          <p className={`${textSize} ${sentenceTextSizeMd(textSize)} leading-relaxed font-bold`}>
            {sentence.before}
            <Blank ref={blank} value={value} state={checked} />
            {sentence.after}
          </p>
          {vocab.example && <p className="text-sm text-ink-soft">{vocab.example.translation}</p>}
        </div>
      </div>

      <div className={`flex shrink-0 flex-col ${keyboardOpen ? 'gap-2' : 'gap-3'}`}>
        {bank ? (
          <div className="grid grid-cols-2 gap-3">
            {bank.map((word) => (
              <button
                key={word}
                type="button"
                disabled={checked !== null}
                onClick={() => check(word)}
                className={`min-h-14 rounded-2xl border-2 px-3 py-3 font-bold transition-colors ${
                  value === word && checked !== null
                    ? checked
                      ? 'border-success bg-success/15 text-success'
                      : 'border-error bg-error/15 text-error'
                    : 'border-line bg-paper'
                } disabled:opacity-60`}
              >
                {word}
              </button>
            ))}
          </div>
        ) : (
          <input
            ref={input}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && filled && checked === null) check(value)
            }}
            disabled={checked !== null}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Le mot manquant…"
            aria-label="Mot manquant"
            className={`w-full rounded-2xl border-2 border-line bg-paper px-4 text-lg font-bold outline-none focus:border-teal disabled:opacity-70 md:px-5 md:py-5 md:text-xl ${
              keyboardOpen ? 'py-2.5' : 'py-4'
            }`}
          />
        )}

        <Feedback
          state={checked}
          expected={sentence.match}
          translation={vocab.translation}
          typed={value}
          bank={bank}
          onGapResolved={() => setGapResolved(true)}
        />

        <div className={`flex flex-col items-center ${keyboardOpen ? 'gap-1.5' : 'gap-3'}`}>
          {checked === null ? (
            <>
              <Button
                block
                disabled={!filled}
                onClick={() => check(value)}
                className={keyboardOpen ? 'py-2' : 'md:py-4 md:text-lg'}
              >
                Vérifier
              </Button>
              {!bank && !keyboardOpen && (
                <button
                  type="button"
                  onClick={() => check('')}
                  className="text-sm font-bold text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-soft"
                >
                  Je ne sais pas
                </button>
              )}
            </>
          ) : (
            <Button
              block
              tone={checked ? 'success' : 'error'}
              disabled={!checked && !bank && !gapResolved}
              onClick={() => onAnswer(checked)}
              className="md:py-4 md:text-lg"
            >
              Continuer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const Blank = forwardRef<HTMLSpanElement, { value: string; state: null | boolean }>(function Blank(
  { value, state },
  ref,
) {
  const tone =
    state === null
      ? 'border-ink-faint text-ink'
      : state
        ? 'border-success text-success'
        : 'border-error text-error line-through'

  return (
    <span ref={ref} className={`mx-1 inline-block min-w-24 border-b-4 px-2 text-center align-baseline ${tone}`}>
      {value || ' '}
    </span>
  )
})

function Feedback({
  state,
  expected,
  translation,
  typed,
  bank,
  onGapResolved,
}: {
  state: null | boolean
  expected: string
  translation: string
  typed: string
  bank: string[] | null
  onGapResolved: () => void
}) {
  if (state === null) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center text-center ${state ? 'text-success' : 'text-error'}`}
    >
      {state ? (
        <p className="text-sm font-bold">
          Exact : {expected} ({translation})
        </p>
      ) : bank ? (
        // Piochée dans une banque, pas écrite : rien à corriger au clavier,
        // la réponse s'affiche comme avant.
        <ExpectedAnswer typed={typed} expected={expected} />
      ) : (
        <CorrectionGap typed={typed} expected={expected} onResolved={onGapResolved} />
      )}
    </motion.div>
  )
}
