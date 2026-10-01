import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Exercise } from '@/engine/exercises'
import { isExplanationOnly, isNonLocating, isPresentation, itemIdsOf } from '@/engine/exercises'
import { isCitation } from '@/content/course'
import { ratingFromAnswer, type Rating } from '@/engine/srs'
import { useCourse } from '@/content/CourseProvider'
import { useProgress } from '@/store/progressStore'
import { Flashcard } from '@/components/session/Flashcard'
import { ChoiceQuestion } from '@/components/session/ChoiceQuestion'
import { MatchPairs } from '@/components/session/MatchPairs'
import { ClozeSentence } from '@/components/session/ClozeSentence'
import { TypeAnswer } from '@/components/session/TypeAnswer'
import { VocabIntro } from '@/components/session/VocabIntro'
import { RuleNote } from '@/components/session/RuleNote'
import { GrammarGap } from '@/components/session/GrammarGap'
import { GrammarSentenceChoice } from '@/components/session/GrammarSentenceChoice'
import { PassageCard } from '@/components/session/PassageCard'
import { SessionPause } from '@/components/session/SessionPause'
import { ConjugationAnswer } from '@/components/session/ConjugationAnswer'
import { ConjugationChoice } from '@/components/session/ConjugationChoice'
import { ConjugationMatch } from '@/components/session/ConjugationMatch'
import { WorkMapNote } from '@/components/work/WorkMapNote'
import { WorkPlan } from '@/components/work/WorkPlan'
import { WorkLocate } from '@/components/work/WorkLocate'
import { WorkOrder } from '@/components/work/WorkOrder'
import { WorkMatch } from '@/components/work/WorkMatch'
import {
  SessionHapticsProvider,
  useHaptics,
  type SessionCombo,
  type SessionHaptics,
} from '@/components/session/useSessionHaptics'
import { ComboBadge } from '@/components/session/ComboBadge'
import { BookIcon, ChestIcon, CloseIcon, FlagIcon, RefreshIcon, StarIcon } from '@/components/icons'
import type { SessionOutcome } from '@/engine/progress'
import type { UnitNodeKind } from '@/engine/unitPath'

/**
 * Déroulé d'une session.
 *
 * Un exercice raté repart en fin de file : la session ne se termine pas tant
 * qu'il n'a pas été réussi. Seule la première tentative compte dans le score,
 * pour que le taux de réussite reflète ce qui était su au départ.
 */

interface SessionScreenProps {
  /**
   * Nature de la séance — leçon, révision, approfondissement, entraînement,
   * bilan final (voir `UnitNodeKind`). Se lit sur un petit repère dans
   * l'en-tête (voir `SessionKindBadge`) : depuis l'archivage du parcours
   * visuel, une leçon enchaîne directement sur la suivante, sa révision ou
   * sa consolidation sans jamais repasser par un écran de parcours qui le
   * disait — sans ce repère, rien à l'écran ne distingue plus les deux.
   */
  kind: UnitNodeKind
  exercises: Exercise[]
  onQuit: () => void
  /** `peakTier` : le plus haut palier de série atteint, voir `useSessionHaptics`. */
  onFinish: (outcome: SessionOutcome, peakTier: number) => void
}

/**
 * Icône, libellé et teinte de chaque nature de séance — mêmes intitulés que
 * `STEP_LABELS` dans `unitPath.ts`, « Leçon » en plus pour le seul nœud que
 * ce fichier-là ne nomme pas lui-même (`lesson.title` y tient déjà lieu de
 * titre). La teinte reprend des couleurs déjà en usage ailleurs plutôt que
 * d'en inventer : `teal` porte déjà le vocabulaire (voir `RuleNote`),
 * `amber` la récompense de fin d'unité (voir `ChestNode`, `PathScreen`) — la
 * séance finale en hérite tout naturellement.
 *
 * Les classes de teinte sont écrites en toutes lettres plutôt qu'assemblées
 * par gabarit (`bg-${tone}/15`) : Tailwind ne génère que les classes qu'il
 * peut lire littéralement dans le source, un nom composé à l'exécution ne
 * produirait rien.
 */
const SESSION_KIND: Record<UnitNodeKind, { label: string; Icon: typeof BookIcon; tone: string; bubble: string }> = {
  lesson: { label: 'Leçon', Icon: BookIcon, tone: 'bg-teal/15 text-teal', bubble: 'bg-teal' },
  review: { label: 'Révision', Icon: RefreshIcon, tone: 'bg-sky/15 text-sky', bubble: 'bg-sky' },
  drill: { label: 'Approfondissement', Icon: StarIcon, tone: 'bg-violet/15 text-violet', bubble: 'bg-violet' },
  workout: { label: 'Entraînement', Icon: FlagIcon, tone: 'bg-coral/15 text-coral', bubble: 'bg-coral' },
  final: { label: 'Séance finale', Icon: ChestIcon, tone: 'bg-amber/15 text-amber', bubble: 'bg-amber' },
}

/** Combien de temps le rappel du badge reste affiché avant de s'effacer seul. */
const KIND_HINT_MS = 2600

/**
 * Taille d'un lot d'exercices avant la pause (voir `SessionPause`).
 *
 * Une leçon garde tous ses exercices — ce plafond ne touche ni au contenu
 * ni au calcul de réussite, seulement au rythme d'affichage : la file
 * entière continue de tourner en mémoire, la pause ne fait qu'interrompre
 * son rendu à intervalles réguliers plutôt que d'enchaîner vingt exercices
 * d'un bloc.
 */
const BATCH_SIZE = 10

/**
 * L'icône de nature de séance (leçon, révision…) ne porte son intitulé qu'en
 * `title`, un attribut que le tactile ne révèle jamais : sur mobile, elle
 * reste muette tant que personne ne l'a expliquée une fois. Une bulle sous
 * l'icône répète donc le même intitulé au premier affichage de la séance,
 * puis s'efface d'elle-même — un rappel, pas un élément permanent de
 * l'interface, sur le modèle de `ComboBadge` (même minuteur `setTimeout` +
 * sortie en fondu).
 */
/**
 * Interrupteur d'un mode de séance, dans l'en-tête : « citations seules »
 * dans une leçon de texte, « repérage seul » dans une séance d'unité-œuvre.
 * C'est là qu'on décide, en cours de route, de ne plus faire qu'un type
 * d'exercice. Réglage global, retenu pour les séances suivantes.
 */
function ModeSwitch({
  on,
  onToggle,
  glyph,
  label,
  titleOn,
  titleOff,
}: {
  on: boolean
  onToggle: () => void
  glyph: string
  label: string
  titleOn: string
  titleOff: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      title={on ? titleOn : titleOff}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-2 py-1 text-xs font-extrabold transition-colors ${
        on ? 'border-violet bg-violet text-white' : 'border-line text-ink-faint hover:text-ink-soft'
      }`}
    >
      <span aria-hidden className="font-black">
        {glyph}
      </span>
      {label}
    </button>
  )
}

function SessionKindBadge({ kind }: { kind: UnitNodeKind }) {
  const { label, Icon, tone, bubble } = SESSION_KIND[kind]
  const [hint, setHint] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setHint(false), KIND_HINT_MS)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <span className="relative flex shrink-0">
      <span
        role="img"
        aria-label={label}
        title={label}
        className={`flex shrink-0 items-center justify-center rounded-full p-2 ${tone}`}
      >
        <Icon size={18} />
      </span>
      <AnimatePresence>
        {hint && (
          <motion.span
            initial={{ opacity: 0, y: -4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className={`pointer-events-none absolute top-full left-0 z-20 mt-2 rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-lg ${bubble}`}
          >
            <span className={`absolute -top-1 left-3 h-2 w-2 rotate-45 ${bubble}`} />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

interface Attempt {
  /** Exercices déjà tentés une fois : le premier essai seul compte pour la réussite. */
  seen: Set<string>
  /** Exercices réussis au moins une fois : ce que la barre de progression mesure. */
  passed: Set<string>
  /** Réponses données, reprises comprises : ce qui rythme les pauses. */
  answers: number
  correct: number
  total: number
}

/**
 * Ne fait qu'ouvrir la session au retour haptique : le suiveur de série doit
 * être créé au-dessus du déroulé pour que les exercices y accèdent par le
 * contexte (voir `useSessionHaptics`), et `SessionRunner` ne peut pas à la
 * fois fournir un contexte et le lire.
 */
export function SessionScreen(props: SessionScreenProps) {
  const { haptics, combo, peakTier } = useHaptics()
  return (
    <SessionHapticsProvider value={haptics}>
      <SessionRunner {...props} haptics={haptics} combo={combo} peakTier={peakTier} />
    </SessionHapticsProvider>
  )
}

function SessionRunner({
  kind,
  exercises,
  onQuit,
  onFinish,
  haptics,
  combo,
  peakTier,
}: SessionScreenProps & { haptics: SessionHaptics; combo: SessionCombo; peakTier: () => number }) {
  const { course } = useCourse()
  const gradeItem = useProgress((state) => state.gradeItem)
  const [queue, setQueue] = useState<Exercise[]>(exercises)
  const [position, setPosition] = useState(0)
  const [attempt, setAttempt] = useState<Attempt>({ seen: new Set(), passed: new Set(), answers: 0, correct: 0, total: 0 })
  // Nombre d'exercices déjà faits au début du lot courant : la pause suivante
  // tombe dix exercices plus loin, pas au premier multiple de dix atteint
  // dans l'absolu (sans quoi reprendre juste après une pause en déclencherait
  // aussitôt une autre au dixième exercice de la leçon, pas au vingtième).
  const [batchStart, setBatchStart] = useState(0)
  const [paused, setPaused] = useState(false)

  // Mode « citations seules » (voir `citationsOnly` dans le store) : proposé
  // dans une leçon qui cite un texte, et là seulement ; les révisions ne
  // changent pas. Il agit en direct : allumé, il saute ce qui reste de
  // cartes-explication et de rappels de fragment (voir `isExplanationOnly`),
  // et les rend si on l'éteint. La file reste entière, seul le parcours
  // l'enjambe.
  const citationsOnly = useProgress((state) => state.citationsOnly)
  const setCitationsOnly = useProgress((state) => state.setCitationsOnly)
  const hasCitations = useMemo(
    () => kind === 'lesson' && exercises.some((exercise) => exercise.kind === 'passage' && isCitation(exercise.point)),
    [exercises, kind],
  )
  const skipping = hasCitations && citationsOnly

  // Mode « repérage seul » (voir `locateOnly` dans le store) : proposé dès
  // qu'une séance, leçon ou révision, a des exercices d'unité-œuvre qui ne
  // font pas associer une idée à une référence (voir `isNonLocating`) ; même
  // mécanique, en direct.
  const locateOnly = useProgress((state) => state.locateOnly)
  const setLocateOnly = useProgress((state) => state.setLocateOnly)
  const hasNonLocating = useMemo(() => exercises.some(isNonLocating), [exercises])
  const locating = hasNonLocating && locateOnly

  const skips = useCallback(
    (exercise: Exercise) => (skipping && isExplanationOnly(exercise)) || (locating && isNonLocating(exercise)),
    [skipping, locating],
  )

  const current = queue[position]
  const skipped = current !== undefined && skips(current)
  useEffect(() => {
    if (skipped) setPosition((index) => index + 1)
  }, [skipped, position])

  // Les exercices sautés ne comptent pas, sauf ceux déjà faits avant
  // d'allumer le mode.
  const graded = useMemo(
    () =>
      exercises.filter((exercise) => !isPresentation(exercise) && (!skips(exercise) || attempt.seen.has(exercise.id)))
        .length,
    [exercises, skips, attempt.seen],
  )
  // La progression compte les exercices réussis, non les exercices vus : un
  // exercice raté revient dans la file (voir `answer`) tant qu'il n'a pas
  // reçu une bonne réponse, comme le mode « Apprendre » de Quizlet.
  const progress = graded === 0 ? 1 : Math.min(1, attempt.passed.size / graded)

  // Coupe la session toutes les `BATCH_SIZE` réponses, reprises comprises,
  // réussies ou non. Pas de pause si la file est déjà vide : la session se
  // termine alors normalement (voir l'effet de clôture plus bas), une pause
  // n'y ajouterait qu'un écran de plus avant l'écran de fin.
  useEffect(() => {
    if (paused || !current) return
    if (attempt.answers - batchStart < BATCH_SIZE) return
    setPaused(true)
  }, [attempt.answers, batchStart, current, paused])

  const resume = useCallback(() => {
    setBatchStart(attempt.answers)
    setPaused(false)
  }, [attempt.answers])

  /** Avance dans la file, en réinsérant l'exercice raté un peu plus loin. */
  const advance = useCallback(
    (requeue: boolean) => {
      setQueue((current_) => {
        if (!requeue) return current_
        const exercise = current_[position]
        const next = current_.slice()
        // Trois exercices plus loin : assez pour ne pas répondre de mémoire.
        next.splice(Math.min(next.length, position + 4), 0, exercise)
        return next
      })
      setPosition((index) => index + 1)
    },
    [position],
  )

  /**
   * Note une réponse. La réussite affichée à la fin ne retient que le premier
   * essai de chaque exercice (c'est lui qui dit ce qui était su) ; la
   * progression, elle, avance dès qu'un exercice a été réussi, au premier
   * essai ou à une reprise.
   */
  const record = useCallback((exercise: Exercise, correct: boolean, passed = correct) => {
    setAttempt((state) => {
      const first = !state.seen.has(exercise.id)
      return {
        seen: first ? new Set(state.seen).add(exercise.id) : state.seen,
        passed: passed && !state.passed.has(exercise.id) ? new Set(state.passed).add(exercise.id) : state.passed,
        answers: state.answers + 1,
        correct: state.correct + (first && correct ? 1 : 0),
        total: state.total + (first ? 1 : 0),
      }
    })
  }, [])

  const answer = useCallback(
    (exercise: Exercise, correct: boolean, rating?: Rating) => {
      const firstTry = !attempt.seen.has(exercise.id)
      for (const itemId of itemIdsOf(exercise)) {
        gradeItem(course.id, itemId, rating ?? ratingFromAnswer(correct, firstTry))
      }
      // Pas de son ici : il a déjà sonné dans l'exercice, à la validation
      // de la réponse (voir `useSessionSounds`). `answer` n'est appelé qu'à
      // l'appui sur « Continuer », une ou deux secondes plus tard.
      if (!isPresentation(exercise)) record(exercise, correct)
      // Tant qu'un exercice n'a pas reçu une bonne réponse, il revient un peu
      // plus loin dans la file, auto-évaluation comprise (« À revoir » sur
      // une carte révélée) : la session ne s'achève que tout réussi. Seules
      // les présentations (rappel, découverte d'un mot) ne reviennent pas :
      // il n'y a rien à y réussir. La fragilité, elle, est déjà notée : le
      // premier échec a marqué la carte pour la révision espacée.
      advance(!correct && !isPresentation(exercise))
    },
    [advance, attempt.seen, course.id, gradeItem, record],
  )

  const answerMatch = useCallback(
    (exercise: Exercise, missedItemIds: string[]) => {
      const missed = new Set(missedItemIds)
      const firstTry = !attempt.seen.has(exercise.id)
      for (const itemId of itemIdsOf(exercise)) {
        gradeItem(course.id, itemId, missed.has(itemId) ? 'again' : ratingFromAnswer(true, firstTry))
      }
      // Pas de son ici : chaque paire a déjà sonné en se résolvant (voir
      // `PairBoard`), et la dernière est la fin de la manche. En rejouer un
      // par-dessus doublerait la note d'arrivée.
      //
      // La vibration, elle, se déclenche bien ici, et une seule fois pour
      // toute la manche : la dernière paire trouvée *est* la fin de
      // l'exercice, il n'y a pas de « Continuer » qui retarderait la
      // sensation. Vibrer à chaque paire aurait fait exactement le bruit
      // que la parcimonie cherche à éviter.
      haptics.answered(exercise, missed.size === 0)
      // Toutes les paires finissent trouvées : la manche est réussie, même
      // si les paires manquées comptent comme un échec au premier essai.
      record(exercise, missed.size === 0, true)
      // Les paires sont toutes trouvées à la fin : inutile de rejouer la manche.
      advance(false)
    },
    [advance, attempt.seen, course.id, gradeItem, haptics, record],
  )

  // La file est vide : la session est terminée. Le drapeau évite que le rendu
  // suivant ne déclenche une seconde clôture.
  const finished = useRef(false)
  useEffect(() => {
    if (current || finished.current) return
    finished.current = true
    const outcome = { correct: attempt.correct, total: attempt.total }
    haptics.finished(outcome)
    onFinish(outcome, peakTier())
  }, [attempt.correct, attempt.total, current, haptics, onFinish, peakTier])

  if (!current || skipped) return null

  if (paused) {
    return (
      <div
        className="mx-auto flex w-full max-w-md flex-col overflow-hidden md:max-w-3xl"
        style={{ height: 'var(--app-vh, 100dvh)' }}
      >
        <SessionPause
          passed={attempt.passed.size}
          attempted={attempt.seen.size}
          graded={graded}
          onContinue={resume}
          onQuit={onQuit}
        />
      </div>
    )
  }

  return (
    // Pas `h-full` : `#root` ne porte qu'un `min-height` (voir
    // `CourseProvider`), donc un pourcentage ne résout contre rien et la
    // div reprenait la hauteur de son seul contenu — sans jamais vraiment
    // remplir l'écran, ni donc avoir quoi que ce soit à couper avec
    // `overflow-hidden`. `height: var(--app-vh, 100dvh)` (voir
    // `ViewportHeightEffect`) se mesure contre le viewport directement, pas
    // contre le parent, et surtout reste juste quand le clavier virtuel
    // s'ouvre sur un navigateur où `100dvh` seul ne suit pas. Une leçon ne
    // doit jamais pouvoir défiler, le contenu est conçu pour tenir dans
    // l'écran — d'où `overflow-hidden` plutôt qu'une hauteur minimale, qui
    // laisserait grandir au lieu de couper.
    //
    // `mx-auto w-full max-w-md`, comme tous les autres écrans (voir
    // `LibraryScreen`, `ProfileScreen`…) : sans lui, une fenêtre de bureau
    // large étirait l'en-tête et les cartes sur toute sa largeur au lieu de
    // garder une colonne centrée. `md:max-w-3xl` élargit cette colonne à
    // partir d'un écran de bureau plutôt que de garder la largeur pensée
    // pour un téléphone : le clavier virtuel qui motive tout le reste de ce
    // fichier (voir `useKeyboardOpen`, plus bas) n'existe simplement pas
    // sur un ordinateur, la carte peut y respirer.
    <div
      className="mx-auto flex w-full max-w-md flex-col overflow-hidden md:max-w-3xl"
      style={{ height: 'var(--app-vh, 100dvh)' }}
    >
      <header className="flex items-center gap-3 px-4 py-3 md:py-5">
        <button
          type="button"
          onClick={onQuit}
          aria-label="Quitter la session"
          className="rounded-full p-2 text-ink-faint transition-colors hover:text-ink"
        >
          <CloseIcon size={22} />
        </button>
        <SessionKindBadge kind={kind} />
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-line md:h-5">
          <motion.div
            className="h-full rounded-full bg-teal"
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
        <span className="w-12 text-right text-sm font-extrabold text-ink-faint">
          {attempt.passed.size}/{graded}
        </span>
        <ComboBadge combo={combo} />
        {hasCitations && (
          <ModeSwitch
            on={citationsOnly}
            onToggle={() => setCitationsOnly(!citationsOnly)}
            glyph="«»"
            label="Citations"
            titleOn="Citations seules : les cartes-explication et les rappels sont sautés"
            titleOff="Ne jouer que les cartes-citation"
          />
        )}
        {hasNonLocating && (
          <ModeSwitch
            on={locateOnly}
            onToggle={() => setLocateOnly(!locateOnly)}
            glyph="→"
            label="Repérage"
            titleOn="Repérage seul : remise en ordre et phrases à trou sautées"
            titleOff="Ne faire que localiser et associer"
          />
        )}
      </header>

      {/* `min-h-0` : sans lui, un enfant flex-1 en colonne se voit imposer une
          hauteur minimale égale à son contenu, ce qui neutralise
          `overflow-y-auto` juste en dessous — le classique piège flexbox.
          Filet de sécurité, pas le comportement voulu : un rappel de
          grammaire trop long pour l'écran doit rester lisible en entier
          plutôt que couper son bouton, même si l'intention reste que rien
          n'ait normalement besoin de défiler ici. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 md:pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.id}:${position}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {current.kind === 'intro' && (
              <VocabIntro exercise={current} onRate={(rating) => answer(current, rating !== 'again', rating)} />
            )}
            {current.kind === 'flashcard' && (
              <Flashcard
                exercise={current}
                onRate={(rating) => answer(current, rating !== 'again', rating)}
              />
            )}
            {current.kind === 'match' && (
              <MatchPairs exercise={current} onDone={({ missedIds }) => answerMatch(current, missedIds)} />
            )}
            {current.kind === 'choice' && (
              <ChoiceQuestion exercise={current} onAnswer={(correct) => answer(current, correct)} />
            )}
            {current.kind === 'rule' && (
              <RuleNote exercise={current} hideNotes={skipping} onNext={() => advance(false)} />
            )}
            {current.kind === 'work-map' && <WorkMapNote exercise={current} onNext={() => advance(false)} />}
            {current.kind === 'work-locate' && (
              <WorkLocate exercise={current} onAnswer={(correct) => answer(current, correct)} />
            )}
            {current.kind === 'work-match' && (
              <WorkMatch exercise={current} onDone={({ missedIds }) => answerMatch(current, missedIds)} />
            )}
            {current.kind === 'work-order' && (
              <WorkOrder exercise={current} onDone={({ missedIds }) => answerMatch(current, missedIds)} />
            )}
            {current.kind === 'work-plan' && (
              <WorkPlan exercise={current} onDone={({ missedIds }) => answerMatch(current, missedIds)} />
            )}
            {current.kind === 'grammar-gap' && (
              <GrammarGap exercise={current} onAnswer={(correct, rating) => answer(current, correct, rating)} />
            )}
            {current.kind === 'grammar-choice' && (
              <GrammarSentenceChoice exercise={current} onAnswer={(correct) => answer(current, correct)} />
            )}
            {current.kind === 'passage' && (
              <PassageCard exercise={current} onAnswer={(correct, rating) => answer(current, correct, rating)} />
            )}
            {current.kind === 'conjugation' && (
              <ConjugationAnswer exercise={current} onAnswer={(correct) => answer(current, correct)} />
            )}
            {current.kind === 'conjugation-choice' && (
              <ConjugationChoice exercise={current} onAnswer={(correct) => answer(current, correct)} />
            )}
            {current.kind === 'conjugation-match' && (
              <ConjugationMatch exercise={current} onDone={({ missedIds }) => answerMatch(current, missedIds)} />
            )}
            {current.kind === 'cloze' && (
              <ClozeSentence exercise={current} onAnswer={(correct) => answer(current, correct)} />
            )}
            {current.kind === 'type' && (
              <TypeAnswer exercise={current} onAnswer={(correct) => answer(current, correct)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
