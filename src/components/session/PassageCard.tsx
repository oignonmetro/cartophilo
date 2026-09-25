import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { PassageExercise } from '@/engine/exercises'
import { matchesAnswer, splitGaps } from '@/engine/exercises'
import type { Rating } from '@/engine/srs'
import { Button } from '@/components/Button'
import { sentenceTextSize, sentenceTextSizeMd } from '@/lib/textDensity'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useKeyboardOpen } from '@/lib/useKeyboardOpen'
import { useProgress } from '@/store/progressStore'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/**
 * Carte d'une leçon de texte : un fragment cité à compléter, ou une
 * explication à trou (voir content/textes.md).
 *
 * Deux façons de la jouer, au choix de l'apprenant et retenues ensuite pour
 * toutes (voir `passageMode`) :
 *
 *   - révéler puis s'auto-évaluer, comme une flashcard. Le défaut : une
 *     réponse de dix mots, exacte à la virgule près, se tape mal sur un
 *     téléphone, et c'est la citation qu'on veut savoir, pas sa frappe ;
 *   - écrire la réponse, jugée comme une phrase à trou. Ce qui manque parfois
 *     à cette comparaison stricte, une variante qu'elle ne connaît pas, se
 *     rattrape par « J'avais bon » plutôt que par une liste d'`alt` qu'aucun
 *     auteur ne tiendra à jour sur des citations entières.
 *
 * Une carte peut porter plusieurs trous : ses réponses les remplissent dans
 * l'ordre, séparées par « ; » (voir `splitGaps`), et se saisissent de même
 * dans un seul champ.
 */
export function PassageCard({
  exercise,
  onAnswer,
}: {
  exercise: PassageExercise
  /** `rating` : présent pour une auto-évaluation, absent pour une réponse écrite. */
  onAnswer: (correct: boolean, rating?: Rating) => void
}) {
  const { point, passage } = exercise
  const mode = useProgress((state) => state.passageMode)
  const setMode = useProgress((state) => state.setPassageMode)
  const { parts, fills } = useMemo(() => splitGaps(point.sentence, point.answer), [point.sentence, point.answer])
  const gapCount = parts.length - 1
  const textSize = sentenceTextSize('text-lg', point.sentence.length)
  const isDesktop = useIsDesktop()
  const keyboardOpen = useKeyboardOpen()
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()

  const [revealed, setRevealed] = useState(false)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setRevealed(false)
    setValue('')
    setChecked(null)
  }, [exercise.id])

  // La réponse ne se révèle qu'une fois : changer de mode après coup ne doit
  // pas permettre de relire la carte puis de la réécrire.
  const answered = revealed || checked !== null

  useEffect(() => {
    if (mode !== 'write' || answered) return
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [mode, answered, exercise.id])

  function check(candidate: string) {
    const correct = matchesAnswer(point.answer, point.alt, candidate)
    setValue(candidate)
    setChecked(correct)
    setRevealed(true)
    sounds.success(correct)
    haptics.answered(exercise, correct)
  }

  // Raccourcis, réservés à l'ordinateur : Entrée révèle ou vérifie puis fait
  // continuer ; 1, 2, 3 notent une carte révélée, dans l'ordre des boutons.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (mode === 'reveal' && checked === null) {
        if (!revealed && event.key === 'Enter') {
          event.preventDefault()
          setRevealed(true)
          return
        }
        if (revealed) {
          const rating = ({ '1': 'again', '2': 'hard', '3': 'good' } as const)[event.key as '1' | '2' | '3']
          if (rating) {
            event.preventDefault()
            onAnswer(rating !== 'again', rating)
          }
        }
        return
      }
      if (event.key !== 'Enter' || checked === null) return
      event.preventDefault()
      onAnswer(checked)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, mode, revealed, checked, onAnswer])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <PassageHeader label={passage.label} heading={passage.heading} fragment={point.fragment} />
        <ModeSwitch mode={mode} disabled={answered} onChange={setMode} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <div className="card-3d flex flex-col gap-3 px-5 py-6 md:px-10 md:py-10">
          <p className={`${textSize} ${sentenceTextSizeMd(textSize)} text-left leading-relaxed font-semibold`}>
            {parts.map((part, index) => (
              <span key={index}>
                {part}
                {index < gapCount && <Fill text={fills[index] ?? ''} shown={answered} state={checked} />}
              </span>
            ))}
          </p>
          {answered && point.explanation && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-ink-soft">
              {point.explanation}
            </motion.p>
          )}
        </div>
      </div>

      <div className={`flex shrink-0 flex-col ${keyboardOpen ? 'gap-2' : 'gap-3'}`}>
        {mode === 'write' && checked === null && !revealed && (
          <>
            <textarea
              ref={input}
              value={value}
              rows={2}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return
                event.preventDefault()
                check(value)
              }}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Réponse"
              placeholder={gapCount > 1 ? 'Séparez les réponses par « ; »' : 'Votre réponse'}
              className="w-full resize-none rounded-2xl border-2 border-line bg-paper px-4 py-3 text-base font-bold outline-none focus:border-violet md:text-lg"
            />
            <Button block tone="violet" disabled={value.trim().length === 0} onClick={() => check(value)}>
              Vérifier
            </Button>
            {!keyboardOpen && (
              <button
                type="button"
                onClick={() => check('')}
                className="self-center text-sm font-bold text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-soft"
              >
                Je ne sais pas
              </button>
            )}
          </>
        )}

        {checked !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-3 text-center text-sm ${
              checked ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'
            }`}
          >
            {checked ? (
              <p className="font-extrabold text-success">Exact.</p>
            ) : value.trim() ? (
              <p className="text-error">
                <span className="font-bold">Votre réponse : </span>
                <span className="line-through">{value}</span>
              </p>
            ) : (
              <p className="font-bold text-error">La réponse est affichée ci-dessus.</p>
            )}
          </motion.div>
        )}

        {checked !== null ? (
          <div className="flex flex-col items-center gap-2">
            <Button block tone={checked ? 'success' : 'error'} onClick={() => onAnswer(checked)}>
              Continuer
            </Button>
            {!checked && value.trim() && (
              <button
                type="button"
                onClick={() => onAnswer(true)}
                className="text-sm font-bold text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-soft"
              >
                J'avais bon
              </button>
            )}
          </div>
        ) : mode === 'reveal' && !revealed ? (
          <Button block tone="violet" onClick={() => setRevealed(true)}>
            Révéler
          </Button>
        ) : mode === 'reveal' && revealed ? (
          <div className="grid grid-cols-3 gap-2">
            <Button tone="error" onClick={() => onAnswer(false, 'again')} className="text-xs">
              À revoir
            </Button>
            <Button tone="amber" onClick={() => onAnswer(true, 'hard')} className="text-xs">
              Hésitant
            </Button>
            <Button tone="success" onClick={() => onAnswer(true, 'good')} className="text-xs">
              Je savais
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Repère du paragraphe, « §1 · 1/3 », et son intitulé : ce qui situe la carte
 * dans le texte, surtout en révision, où elle revient seule.
 */
function PassageHeader({ label, heading, fragment }: { label: string; heading: string; fragment?: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-xs font-black tracking-wide text-violet uppercase">
        {label}
        {fragment && <span className="text-ink-faint"> · {fragment}</span>}
      </span>
      <span className="line-clamp-2 text-sm leading-snug font-bold text-ink-soft" title={heading}>
        {heading}
      </span>
    </div>
  )
}

function ModeSwitch({
  mode,
  disabled,
  onChange,
}: {
  mode: 'reveal' | 'write'
  disabled: boolean
  onChange: (mode: 'reveal' | 'write') => void
}) {
  const options = [
    { id: 'reveal', label: 'Révéler' },
    { id: 'write', label: 'Écrire' },
  ] as const
  return (
    <div role="radiogroup" aria-label="Mode de réponse" className="flex shrink-0 rounded-full border-2 border-line p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={mode === option.id}
          disabled={disabled}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors disabled:opacity-60 ${
            mode === option.id ? 'bg-violet text-white' : 'text-ink-faint hover:text-ink-soft'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Un trou : vide tant que la réponse n'est pas montrée, rempli ensuite. */
function Fill({ text, shown, state }: { text: string; shown: boolean; state: null | boolean }) {
  const tone = !shown
    ? 'border-ink-faint'
    : state === false
      ? 'border-error text-error'
      : state === true
        ? 'border-success text-success'
        : 'border-teal text-teal-deep'
  return (
    <span className={`mx-0.5 inline border-b-4 px-1 font-extrabold ${tone}`}>
      {shown ? text : ' '.repeat(14)}
    </span>
  )
}
