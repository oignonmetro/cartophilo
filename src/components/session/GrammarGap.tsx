import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GrammarGapExercise } from '@/engine/exercises'
import { matchesAnswer, splitGap } from '@/engine/exercises'
import { Button } from '@/components/Button'
import { learningLanguage } from '@/lib/speech'
import { sentenceTextSize, sentenceTextSizeMd } from '@/lib/textDensity'
import { useKeyboardOpen } from '@/lib/useKeyboardOpen'
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
  const textSize = sentenceTextSize('text-xl', point.sentence.length)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const [gapResolved, setGapResolved] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const blank = useRef<HTMLSpanElement>(null)
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()
  // Le clavier peut réduire la fenêtre visible à moins que la hauteur de la
  // seule zone du bas (champ, correction, boutons) — voir `useKeyboardOpen`.
  // On l'allège alors pour rendre le plus de place possible à la carte.
  const keyboardOpen = useKeyboardOpen()

  // La carte défile pour son propre compte (voir plus bas) : rien ne garantit
  // que le trou tombe dans la portion visible par défaut (le haut de la
  // carte) sur une citation longue. On centre systématiquement dessus plutôt
  // que de compter sur l'apprenant pour aller le chercher à la main — refait
  // à l'ouverture du clavier, dont le retrait de hauteur (voir plus bas)
  // décale ce qui était déjà centré.
  useEffect(() => {
    blank.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [exercise.id, keyboardOpen])

  useEffect(() => {
    setValue('')
    setChecked(null)
    setGapResolved(false)
    if (bank) return
    // Différé pour laisser la transition d'entrée de l'exercice (voir
    // `SessionScreen`) se terminer avant d'ouvrir le clavier par-dessus.
    // Contrairement à une ancienne version de ce délai, il ne s'agit plus de
    // laisser le temps à un calcul de défilement de se stabiliser : la carte
    // défile désormais elle-même, indépendamment du champ, voir plus bas.
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:justify-center">
      {/* Retirée pendant que le clavier est ouvert : la consigne ne change
          jamais, la carte a plus besoin de ces quelques pixels qu'elle
          n'a besoin d'être répétée à chaque exercice. */}
      {!keyboardOpen && (
        <p className="shrink-0 text-center text-sm font-bold uppercase tracking-wide text-ink-faint">
          Complétez la phrase
        </p>
      )}

      {/*
       * La carte défile pour son propre compte, dans l'espace qu'il reste
       * une fois le champ, la correction et les boutons posés en dessous
       * (voir plus bas) : sur mobile, le clavier qui s'ouvre réduit cet
       * espace, et une citation longue n'y tient plus en entier. Avant ce
       * découpage, tout défilait ensemble dans `<main>` (voir
       * `SessionScreen`) et le navigateur, en ramenant le champ sous le
       * clavier, ne laissait voir de la carte qu'un fragment quelconque —
       * parfois seulement la fin de la phrase, sans le trou. Ici, le champ
       * (et le bouton Vérifier) restent toujours visibles quoi qu'il
       * arrive ; seule la carte se réduit, et reste lisible en la faisant
       * défiler à la main.
       *
       * Sur ordinateur, ce découpage ne sert plus à rien (il n'y a pas de
       * clavier virtuel à esquiver) et devient même gênant : `flex-1`
       * forcerait la carte à s'étirer jusqu'en bas de la fenêtre, avec un
       * grand vide avant le champ de saisie. `md:flex-none md:overflow-visible`
       * annule ce comportement à partir d'un écran de bureau, et
       * `justify-center` sur le conteneur (ci-dessus) centre alors le bloc
       * entier (consigne, carte, saisie, boutons) dans la hauteur
       * disponible plutôt que de l'étirer.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto md:flex-none md:overflow-visible">
        <div className="card-3d flex flex-col items-center gap-3 px-5 py-6 text-center md:gap-4 md:px-10 md:py-12">
          <p className={`${textSize} ${sentenceTextSizeMd(textSize)} leading-relaxed font-bold`}>
            {gap.before}
            <Blank ref={blank} value={value} state={checked} />
            {gap.after}
          </p>
          {point.translation && (cue === 'translation' || checked !== null) && (
            <p className="text-sm text-ink-soft">{point.translation}</p>
          )}
        </div>
      </div>

      <div className={`flex shrink-0 flex-col ${keyboardOpen ? 'gap-2' : 'gap-3'}`}>
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
            aria-label="Forme manquante"
            className={`w-full rounded-2xl border-2 bg-paper px-4 text-lg font-bold outline-none disabled:opacity-70 md:px-5 md:py-5 md:text-xl ${
              keyboardOpen ? 'py-2.5' : 'py-4'
            } ${checked === null ? 'border-line focus:border-violet' : checked ? 'border-success' : 'border-error'}`}
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

        <div className={`flex flex-col items-center ${keyboardOpen ? 'gap-1.5' : 'gap-3'}`}>
          {checked === null ? (
            <>
              <Button
                block
                tone="violet"
                disabled={!filled}
                onClick={() => check(value)}
                className={keyboardOpen ? 'py-2' : 'md:py-4 md:text-lg'}
              >
                Vérifier
              </Button>
              {/* Retiré pendant que le clavier est ouvert, avec la consigne
                  ci-dessus : un raccourci secondaire, pas une action qu'on
                  doive pouvoir atteindre sans jamais fermer le clavier. */}
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
    <span ref={ref} className={`mx-1 inline-block min-w-28 border-b-4 px-2 text-center align-baseline ${tone}`}>
      {value || ' '}
    </span>
  )
})
