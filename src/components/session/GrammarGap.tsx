import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GrammarGapExercise } from '@/engine/exercises'
import { matchesAnswer, splitGap } from '@/engine/exercises'
import { Button } from '@/components/Button'
import { learningLanguage } from '@/lib/speech'
import { CorrectionGap } from './CorrectionGap'
import { ExpectedAnswer } from './ExpectedAnswer'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/**
 * Phrase de grammaire à compléter.
 *
 * Aux premiers passages, les formes plausibles sont proposées : l'apprenant
 * choisit, et c'est la comparaison entre les formes qui enseigne la règle.
 * Ensuite la réponse se saisit, sans filet.
 *
 * La traduction française suit le même retrait : tant qu'elle est là, le sens
 * visé est acquis et il ne reste qu'à trouver la forme ; une fois retirée,
 * c'est la grammaire seule qui doit trancher. Elle réapparaît toujours à la
 * correction, où elle n'aide plus mais explique.
 */
export function GrammarGap({
  exercise,
  onAnswer,
}: {
  exercise: GrammarGapExercise
  onAnswer: (correct: boolean) => void
}) {
  const { point, bank, cue } = exercise
  const gap = useMemo(() => splitGap(point.sentence), [point.sentence])
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const [gapResolved, setGapResolved] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()

  useEffect(() => {
    setValue('')
    setChecked(null)
    setGapResolved(false)
    if (bank) return
    // Différé : mettre le focus dès le montage fait parfois défiler le
    // navigateur, pour garder le champ visible sous le clavier qui s'ouvre,
    // avant que la transition d'entrée de l'exercice (voir `SessionScreen`)
    // et le redimensionnement du clavier n'aient fini de stabiliser la mise
    // en page — le calcul du défilement se fait alors sur une hauteur
    // provisoire, et coupe le haut de la carte au lieu de la garder entière
    // au-dessus du clavier.
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [exercise.id, bank])

  const filled = value.trim().length > 0

  function check(candidate: string) {
    const correct = matchesAnswer(point.answer, point.alt, candidate)
    setValue(candidate)
    setChecked(correct)
    sounds.success(correct)
    haptics.answered(exercise, correct)
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Épinglée : voir la même remarque dans `TypeAnswer`. Vaut surtout
          quand la réponse se tape (`bank` absent) — sans effet visible
          sinon, la banque de mots ne réclamant jamais le clavier. */}
      <p className="sticky top-0 z-10 bg-cream py-1 text-center text-sm font-bold uppercase tracking-wide text-ink-faint">
        Complétez la phrase
      </p>

      <div className="card-3d flex flex-col items-center gap-3 px-5 py-6 text-center">
        <p className="text-xl leading-relaxed font-bold">
          {gap.before}
          <Blank value={value} state={checked} />
          {gap.after}
        </p>
        {point.translation && (cue === 'translation' || checked !== null) && (
          <p className="text-sm text-ink-soft">{point.translation}</p>
        )}
      </div>

      {bank ? (
        <div className="grid grid-cols-2 gap-3">
          {bank.map((option) => (
            <button
              key={option}
              type="button"
              disabled={checked !== null}
              onClick={() => check(option)}
              className={`min-h-14 rounded-2xl border-2 px-3 py-3 font-bold break-words transition-colors ${
                value === option && checked !== null
                  ? checked
                    ? 'border-success bg-success/15 text-success'
                    : 'border-error bg-error/15 text-error'
                  : 'border-line bg-paper'
              } disabled:opacity-60`}
            >
              {option}
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
          // La forme manquante se tape dans la langue apprise, jamais en
          // français : c'est elle qui doit décider du clavier proposé.
          lang={learningLanguage()}
          placeholder="La forme manquante…"
          aria-label="Forme manquante"
          className={`w-full rounded-2xl border-2 bg-paper px-4 py-4 text-lg font-bold outline-none disabled:opacity-70 ${
            checked === null ? 'border-line focus:border-violet' : checked ? 'border-success' : 'border-error'
          }`}
        />
      )}

      {checked !== null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col items-center rounded-2xl border-2 px-4 py-3 text-center text-sm ${
            checked ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'
          }`}
        >
          {checked ? (
            <p className="font-extrabold text-success">Exact.</p>
          ) : bank ? (
            // Piochée dans une banque, pas écrite : rien à corriger au
            // clavier, la réponse s'affiche comme avant.
            <div className="text-error">
              <ExpectedAnswer typed={value} expected={point.answer} />
            </div>
          ) : (
            <div className="text-error">
              <CorrectionGap typed={value} expected={point.answer} onResolved={() => setGapResolved(true)} />
            </div>
          )}
          {point.explanation && <p className="mt-1 text-ink-soft">{point.explanation}</p>}
        </motion.div>
      )}

      <div className="mt-auto">
        {checked === null ? (
          <Button block tone="violet" disabled={!filled} onClick={() => check(value)}>
            Vérifier
          </Button>
        ) : (
          <Button
            block
            tone={checked ? 'success' : 'error'}
            disabled={!checked && !bank && !gapResolved}
            onClick={() => onAnswer(checked)}
          >
            Continuer
          </Button>
        )}
      </div>
    </div>
  )
}

function Blank({ value, state }: { value: string; state: null | boolean }) {
  const tone =
    state === null
      ? 'border-ink-faint text-ink'
      : state
        ? 'border-success text-success'
        : 'border-error text-error line-through'

  return (
    <span className={`mx-1 inline-block min-w-28 border-b-4 px-2 text-center align-baseline ${tone}`}>
      {value || ' '}
    </span>
  )
}
