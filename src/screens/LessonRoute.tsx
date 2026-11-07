import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCourse } from '@/content/CourseProvider'
import { buildLessonSession, lessonProgress } from '@/engine/exercises'
import { seedFrom } from '@/engine/rng'
import { citationsOnlyLesson, findLesson } from '@/content/course'
import { lessonDifficulty, type SessionOutcome } from '@/engine/progress'
import { buildUnitPath, nextNodeAfter, sectionRank } from '@/engine/unitPath'
import { useProgress } from '@/store/progressStore'
import { clearSnapshot, loadSnapshot, saveSnapshot } from '@/lib/sessionResume'
import { SessionScreen } from './SessionScreen'
import { SessionResult } from './SessionResult'

interface Finished {
  outcome: SessionOutcome
  passed: boolean
  xp: number
  peakTier: number
}

/**
 * Le `key` remonte toute la session quand on enchaîne sur la leçon suivante :
 * sans lui, l'écran de résultat de la leçon précédente resterait affiché,
 * l'instance du composant survivant au changement de paramètre d'URL.
 */
export function LessonRoute() {
  const { lessonId = '' } = useParams()
  return <LessonSession key={lessonId} lessonId={lessonId} />
}

function LessonSession({ lessonId }: { lessonId: string }) {
  const navigate = useNavigate()
  const { course } = useCourse()
  const finishLesson = useProgress((state) => state.finishLesson)

  const entry = useMemo(() => findLesson(course, lessonId), [course, lessonId])

  // En mode « citations seules », la difficulté d'une leçon de texte se
  // mesure sur ses seules cartes-citation (voir `citationsOnlyLesson`), sans
  // quoi des cartes-explication jamais jouées la laisseraient pour toujours à
  // la découverte. La session, elle, reste entière : c'est `SessionScreen`
  // qui saute les explications, pour que l'interrupteur agisse en direct.
  const levelLesson = useMemo(
    () =>
      entry ? ((useProgress.getState().citationsOnly && citationsOnlyLesson(entry.lesson)) || entry.lesson) : null,
    [entry],
  )

  // La difficulté suit ce qui est réellement su : rejouer une leçon déjà
  // solide donne d'emblée de la production, la découvrir donne la
  // présentation. Figée à l'ouverture pour que les réponses de la session en
  // cours ne la fassent pas varier en cours de route.
  // Une session quittée en cours de route se reprend là où elle s'est arrêtée
  // (voir `sessionResume`). Lue une fois, à l'ouverture.
  const [saved, setSaved] = useState(() => loadSnapshot(course.id, lessonId))

  const [level] = useState(() =>
    saved?.level ?? (levelLesson ? lessonDifficulty(levelLesson, useProgress.getState().cards[course.id] ?? {}) : 0),
  )

  // La graine change à chaque tentative pour que « Recommencer » rebatte les cartes.
  const [attempt, setAttempt] = useState(0)
  const [finished, setFinished] = useState<Finished | null>(null)

  const { exercises, seed, resume } = useMemo(() => {
    if (!entry) return { exercises: [], seed: 0, resume: undefined }
    const build = (seed: number) =>
      buildLessonSession(
        entry.lesson,
        level,
        seed,
        undefined,
        sectionRank(entry.unit, entry.lesson.id),
        // L'introduction d'une unité de texte précède son premier paragraphe,
        // et lui seul : elle ne se relit pas à chaque leçon.
        entry.unit.lessons[0]?.id === entry.lesson.id ? entry.unit.intro : undefined,
        entry.unit.work,
      )
    if (saved) {
      const rebuilt = build(saved.seed)
      const ids = new Set(rebuilt.map((exercise) => exercise.id))
      // Le contenu a pu changer depuis : un instantané qui ne retombe plus sur
      // la même session est abandonné plutôt que rejoué de travers.
      if (saved.queue.every((id) => ids.has(id))) return { exercises: rebuilt, seed: saved.seed, resume: saved }
    }
    const cards = useProgress.getState().cards[course.id] ?? {}
    // L'avancement entre dans la graine : rouvrir une leçon un autre jour ne
    // doit pas redonner la même session, exercice pour exercice.
    const fresh = seedFrom(entry.lesson.id, level, attempt, lessonProgress(entry.lesson, cards))
    return { exercises: build(fresh), seed: fresh, resume: undefined }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, attempt, level, course.id])

  if (!entry) return <Navigate to="/" replace />

  const unit = entry.unit
  // Pas `navigate('/')` : on quitte une leçon ouverte depuis la bibliothèque,
  // une révision, un succès… — revenir en arrière, plutôt qu'à l'accueil,
  // retombe sur cette page-là plutôt que de forcer celle du cours courant.
  const backHome = () => navigate(-1)

  if (finished) {
    // L'enchaînement suit l'ordre du parcours, pas celui des seules leçons :
    // la suite peut être une révision, et la sauter viderait le parcours de
    // son sens.
    const { lessons, steps } = useProgress.getState()
    const next = nextNodeAfter(
      buildUnitPath(unit, lessons[course.id] ?? {}, steps[course.id] ?? {}),
      lessonId,
    )

    return (
      <SessionResult
        outcome={finished.outcome}
        passed={finished.passed}
        xp={finished.xp}
        peakTier={finished.peakTier}
        onContinue={backHome}
        onNext={
          next && next.status !== 'locked'
            ? () =>
                navigate(next.lesson ? `/lecon/${next.lesson.id}` : `/etape/${unit.id}/${next.id}`, {
                  replace: true,
                })
            : undefined
        }
        onRetry={() => {
          clearSnapshot(course.id, lessonId)
          setSaved(null)
          setFinished(null)
          setAttempt((value) => value + 1)
        }}
      />
    )
  }

  return (
    <SessionScreen
      // La file d'exercices est un état interne de la session : recommencer
      // doit repartir de zéro, sinon l'ancienne file resterait affichée.
      key={attempt}
      kind="lesson"
      exercises={exercises}
      restored={resume}
      onSnapshot={(snapshot) => saveSnapshot(course.id, lessonId, { ...snapshot, seed, level })}
      onQuit={backHome}
      onFinish={(outcome, peakTier) => {
        clearSnapshot(course.id, lessonId)
        const result = finishLesson(course.id, lessonId, outcome)
        setFinished({ outcome, peakTier, ...result })
      }}
    />
  )
}
