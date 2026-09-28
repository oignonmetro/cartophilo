import { forwardRef, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GrammarGapExercise } from '@/engine/exercises'
import { matchesAnswer } from '@/engine/exercises'
import type { Rating } from '@/engine/srs'
import { Button } from '@/components/Button'
import { learningLanguage } from '@/lib/speech'
import { sentenceTextSize, sentenceTextSizeMd } from '@/lib/textDensity'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useKeyboardOpen } from '@/lib/useKeyboardOpen'
import { useProgress } from '@/store/progressStore'
import { CorrectionGap } from './CorrectionGap'
import { Rich, RichGaps } from './RuleNote'
import { ExpectedAnswer } from './ExpectedAnswer'
import { AnswerModeSwitch } from './AnswerModeSwitch'
import { RATINGS, RevealButtons } from './RevealButtons'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/**
 * Phrase de grammaire à compléter — la carte d'une unité classique (voir
 * `content/philosophie.md`, `content/README.md`), par opposition au
 * paragraphe cité d'une unité de texte (voir `PassageCard`).
 *
 * Aux premiers passages, les formes plausibles sont proposées (`bank`) :
 * l'apprenant choisit, et c'est la comparaison entre les formes qui enseigne
 * la règle. Sans banque, deux façons de répondre, au choix de l'apprenant et
 * retenues ensuite pour toutes, sur ce type d'écran (voir `gapModes`) : même
 * choix, pour les mêmes raisons, que sur une carte de texte (voir
 * `PassageCard`) — écrire, jugé au mot près, ou révéler puis s'auto-évaluer,
 * pour une réponse qui se tape mal (une citation, un terme accentué) ou dont
 * la formulation exacte importe peu à mémoriser mot pour mot.
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
  /** `rating` : présent pour une auto-évaluation (mode révéler), absent pour une réponse écrite. */
  onAnswer: (correct: boolean, rating?: Rating) => void
}) {
  const { point, bank, cue } = exercise
  const textSize = sentenceTextSize('text-xl', point.sentence.length)
  const isDesktop = useIsDesktop()
  // Écrire par défaut sur ordinateur, révéler sur téléphone : un réglage par
  // type d'écran (voir `gapModes`), indépendant de celui d'une carte de texte.
  const device = isDesktop ? 'desktop' : 'mobile'
  const mode = useProgress((state) => state.gapModes[device])
  const setGapMode = useProgress((state) => state.setGapMode)
  // Une banque de formes n'est jamais une saisie : le choix écrire/révéler
  // ne la concerne pas, seule la production libre en a besoin.
  const revealable = !bank

  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const [gapResolved, setGapResolved] = useState(false)
  const [revealed, setRevealed] = useState(false)
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
    setRevealed(false)
  }, [exercise.id, bank])

  // Effet séparé du précédent : le focus dépend du mode courant (révéler
  // n'a pas de champ à focaliser), qui peut changer sans que la carte elle-
  // même change — sans quoi basculer sur « écrire » n'ouvrirait pas le
  // clavier de lui-même.
  useEffect(() => {
    if (bank || (revealable && mode === 'reveal')) return
    // Différé pour laisser la transition d'entrée de l'exercice (voir
    // `SessionScreen`) se terminer avant d'ouvrir le clavier par-dessus.
    // Contrairement à une ancienne version de ce délai, il ne s'agit plus de
    // laisser le temps à un calcul de défilement de se stabiliser : la carte
    // défile désormais elle-même, indépendamment du champ, voir plus bas.
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [exercise.id, bank, revealable, mode])

  const filled = value.trim().length > 0
  const answered = checked !== null || revealed

  function check(candidate: string) {
    const correct = matchesAnswer(point.answer, point.alt, candidate)
    setValue(candidate)
    setChecked(correct)
    sounds.success(correct)
    haptics.answered(exercise, correct)
  }

  // Raccourci clavier, réservé à l'ordinateur (voir `useIsDesktop`) : Entrée
  // fait avancer l'exercice comme un clic sur le bouton principal du moment
  // — Vérifier, Je ne sais pas si le champ est vide, ou Continuer une fois
  // la réponse corrigée. Le mode banque (`bank`) n'a rien à valider par
  // Entrée : la réponse s'y choisit au clic, jamais au clavier. En mode
  // révéler, mêmes touches qu'une carte de texte : Entrée révèle, 1/2/3 notent.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (revealable && mode === 'reveal') {
        if (!revealed) {
          if (event.key !== 'Enter') return
          event.preventDefault()
          setRevealed(true)
          return
        }
        const match = RATINGS.find((candidate) => candidate.key === event.key)
        if (match) {
          event.preventDefault()
          onAnswer(match.rating !== 'again', match.rating)
        }
        return
      }
      if (event.key !== 'Enter') return
      if (checked !== null) {
        if (!checked && !bank && !gapResolved) return // « Continuer » est alors désactivé
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
      // Déjà géré par le champ lui-même quand il a le focus (voir son onKeyDown) :
      // éviter de vérifier deux fois la même réponse.
      if (document.activeElement === input.current) return
      event.preventDefault()
      check(value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, revealable, mode, revealed, checked, bank, gapResolved, filled, value, onAnswer])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Retirée pendant que le clavier est ouvert : la consigne ne change
          jamais, la carte a plus besoin de ces quelques pixels qu'elle
          n'a besoin d'être répétée à chaque exercice. Trois colonnes égales
          pour que la consigne reste centrée que le commutateur soit affiché
          ou non (une banque de formes ne l'affiche pas, voir `revealable`). */}
      {!keyboardOpen && (
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span aria-hidden />
          <p className="text-center text-sm font-bold uppercase tracking-wide text-ink-faint">
            {revealable && mode === 'reveal' ? (revealed ? 'Notez-vous' : 'Révélez la réponse') : 'Complétez la phrase'}
          </p>
          <div className="flex justify-end">
            {revealable && (
              <AnswerModeSwitch mode={mode} disabled={answered} onChange={(next) => setGapMode(device, next)} />
            )}
          </div>
        </div>
      )}

      {/*
       * La carte défile pour son propre compte, dans l'espace qu'il reste
       * une fois le champ, la correction et les boutons posés en dessous
       * (voir plus bas), toujours en `flex-1 overflow-y-auto` — sur mobile
       * comme sur ordinateur. Sur mobile, c'est le clavier qui réduit cet
       * espace ; sur ordinateur, c'est simplement la hauteur de la fenêtre
       * (un écran de bureau courant, en 1366×768 ou moins, tient largement
       * moins qu'un exercice long une fois l'en-tête posé). Dans les deux
       * cas, le champ et le bouton Vérifier restent à une position fixe,
       * toujours visibles sans avoir à faire défiler la page : ils suivent
       * la carte, jamais l'inverse — seule la carte se réduit, lisible en
       * la faisant défiler à la main. Une précédente version ne gardait ce
       * découpage que sur mobile (`md:flex-none md:overflow-visible`, avec
       * un `justify-center` pour recentrer la carte sur ordinateur) : ça
       * fonctionnait tant que le contenu tenait dans la fenêtre, mais un
       * écran de bureau plus bas qu'un certain seuil (1366×768, très
       * courant) repoussait quand même le bouton hors champ, sans qu'aucun
       * signe n'indique qu'il fallait défiler pour l'atteindre — exactement
       * le bug que ce découpage doit éviter.
       *
       * `md:flex md:flex-col md:justify-[safe_center]` recentre la carte
       * *à l'intérieur* de cette zone plutôt que d'agrandir la zone
       * elle-même : sur un grand écran, une carte courte se retrouve
       * centrée dans l'espace qui lui est propre, sans le grand vide qu'un
       * simple `flex-1` sans centrage aurait laissé en dessous d'elle —
       * et sans jamais toucher à la position du champ ni du bouton, qui
       * restent des frères posés après cette zone, toujours à leur place.
       * `safe` retombe sur un alignement en haut dès que la carte ne tient
       * plus dans l'espace disponible, pour ne jamais perdre son début.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <div className="card-3d flex flex-col items-center gap-3 px-5 py-6 text-center md:gap-4 md:px-10 md:py-12">
          {/* Thèse d'une unité-œuvre : son emplacement dans l'œuvre, sans
              lequel une carte revenue seule en révision ne dirait pas de
              quel chapitre elle parle. */}
          {exercise.work && (
            <p className="text-xs leading-snug font-black tracking-widest text-violet-deep uppercase">
              {exercise.work.label}
              {exercise.work.title && (
                <span className="font-semibold tracking-normal text-ink-faint normal-case"> · {exercise.work.title}</span>
              )}
            </p>
          )}
          <p className={`${textSize} ${sentenceTextSizeMd(textSize)} leading-relaxed font-bold`}>
            {/* Un seul trou compte (voir `splitGap`) : un `___` suivant, s'il
                y en a, reste affiché tel quel, comme avant. */}
            <RichGaps
              text={point.sentence}
              renderGap={(index) =>
                index === 0 ? (
                  <Blank
                    ref={blank}
                    value={revealable && mode === 'reveal' ? (revealed ? point.answer : '') : value}
                    state={revealable && mode === 'reveal' ? (revealed ? 'revealed' : null) : checked}
                  />
                ) : (
                  '___'
                )
              }
            />
          </p>
          {point.translation && (cue === 'translation' || answered) && (
            <p className="text-sm text-ink-soft">{point.translation}</p>
          )}
          {/* Hors banque et hors correction (qui affiche déjà l'explication
              plus bas), le mode révéler n'a pas de carton de correction :
              l'explication paraît ici, comme sur une carte de texte. */}
          {revealable && mode === 'reveal' && revealed && point.explanation && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-ink-soft">
              <Rich text={point.explanation} />
            </motion.p>
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
        ) : revealable && mode === 'reveal' ? null : (
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
            {point.explanation && (
              <p className="mt-1 text-ink-soft">
                <Rich text={point.explanation} />
              </p>
            )}
          </motion.div>
        )}

        <div className={`flex flex-col items-center ${keyboardOpen ? 'gap-1.5' : 'gap-3'}`}>
          {checked !== null ? (
            <Button
              block
              tone={checked ? 'success' : 'error'}
              disabled={!checked && !bank && !gapResolved}
              onClick={() => onAnswer(checked)}
              className="md:py-4 md:text-lg"
            >
              Continuer
            </Button>
          ) : revealable && mode === 'reveal' ? (
            revealed ? (
              <RevealButtons isDesktop={isDesktop} onRate={(rating) => onAnswer(rating !== 'again', rating)} />
            ) : (
              <Button
                block
                tone="violet"
                onClick={() => setRevealed(true)}
                className={keyboardOpen ? 'py-2' : 'md:py-4 md:text-lg'}
              >
                Révéler
              </Button>
            )
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}

const Blank = forwardRef<HTMLSpanElement, { value: string; state: null | boolean | 'revealed' }>(function Blank(
  { value, state },
  ref,
) {
  const tone =
    state === null
      ? 'border-ink-faint text-ink'
      : state === 'revealed'
        ? // Révélée mais pas encore auto-évaluée : ni juste ni fausse, une
          // teinte neutre distincte du vert et du rouge de la saisie.
          'border-teal text-teal-deep'
        : state
          ? 'border-success text-success'
          : 'border-error text-error line-through'

  return (
    <span ref={ref} className={`mx-1 inline-block min-w-28 border-b-4 px-2 text-center align-baseline ${tone}`}>
      {value || ' '}
    </span>
  )
})
