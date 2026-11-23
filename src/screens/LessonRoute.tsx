import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCourse } from '@/content/CourseProvider'
import { buildLessonSession, lessonProgress } from '@/engine/exercises'
import { seedFrom } from '@/engine/rng'
import { asideFrom, citationsOnlyLesson, findLesson, itemsOfLesson } from '@/content/course'
import { lessonDifficulty, type SessionOutcome } from '@/engine/progress'
import { buildUnitPath, deferredOfUnit, nextNodeAfter, sectionRank, stepKey } from '@/engine/unitPath'
import { useProgress } from '@/store/progressStore'
import { clearSnapshot, loadSnapshot, saveSnapshot } from '@/lib/sessionResume'
import { SessionScreen } from './SessionScreen'
import { SessionResult } from './SessionResult'

interface Finished {
  outcome: SessionOutcome
  passed: boolean
  xp: number
  deferred: number
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
  const aside = asideFrom(unit, lessonId)

  // Ce qui suit dans le parcours le nœud `afterId`, s'il est ouvert.
  const nextAfter = (afterId: string) => {
    const { lessons, steps, deferred } = useProgress.getState()
    const next = nextNodeAfter(
      buildUnitPath(
        unit,
        lessons[course.id] ?? {},
        steps[course.id] ?? {},
        deferredOfUnit(unit, deferred[course.id] ?? {}).length,
      ),
      afterId,
    )
    return next && next.status !== 'locked' ? next : null
  }
  const goTo = (node: NonNullable<ReturnType<typeof nextAfter>>) =>
    navigate(node.lesson ? `/lecon/${node.lesson.id}` : `/etape/${unit.id}/${node.id}`, { replace: true })

  // « Sauter la parenthèse » : ses cartes, de cette leçon à sa fin, sont
  // remises à plus tard, comme par « Revoir plus tard » (le rattrapage les
  // reprendra avec leurs rappels, voir `buildCatchupSession`), et ses leçons
  // comptent pour faites, sans carte créée (voir `skipTo`) : le parcours
  // reprend juste après elle. Les étapes logées entre ses leçons (une
  // révision qui tombe au milieu) sont sautées avec elles : restées à faire,
  // elles retiendraient tout ce qui suit.
  const skipAside = () => {
    const { deferItems, skipTo, lessons, steps } = useProgress.getState()
    const last = aside[aside.length - 1]!.id
    const path = buildUnitPath(unit, lessons[course.id] ?? {}, steps[course.id] ?? {})
    const end = path.findIndex((node) => node.id === last)
    const inside = path.slice(path.findIndex((node) => node.id === lessonId), end)
    // La révision qui suit la parenthèse, quand elle ne reprend que des
    // leçons de la parenthèse (son bloc, voir `cycle`), n'aurait plus rien à
    // réviser : elle est sautée avec elle.
    const skipped = new Set(aside.map((lesson) => lesson.id))
    const cycleOf = new Map(path.filter((node) => node.lesson).map((node) => [node.id, node.cycle]))
    for (const node of path.slice(end + 1)) {
      if (node.kind !== 'review') break
      const ofCycle = unit.lessons.filter((lesson) => cycleOf.get(lesson.id) === node.cycle)
      if (!ofCycle.every((lesson) => skipped.has(lesson.id))) break
      inside.push(node)
    }
    deferItems(
      course.id,
      aside.flatMap((lesson) => itemsOfLesson(lesson, unit).map((item) => item.id)),
    )
    skipTo(
      course.id,
      aside.map((lesson) => lesson.id),
      inside.filter((node) => !node.lesson).map((node) => stepKey(unit.id, node.id)),
    )
    for (const lesson of aside) clearSnapshot(course.id, lesson.id)
    // Le nœud qui suit la parenthèse, s'il est ouvert ; sinon (une leçon
    // antérieure reste à faire), retour d'où l'on vient, plutôt qu'au
    // rattrapage, toujours ouvert, qui reprendrait aussitôt la parenthèse.
    const after = useProgress.getState()
    const path_ = buildUnitPath(
      unit,
      after.lessons[course.id] ?? {},
      after.steps[course.id] ?? {},
      deferredOfUnit(unit, after.deferred[course.id] ?? {}).length,
    )
    const next = path_.slice(path_.findIndex((node) => node.id === last) + 1).find((node) => node.status !== 'done')
    if (next && next.status === 'available' && next.kind !== 'catchup') goTo(next)
    else backHome()
  }
  // Pas `navigate('/')` : on quitte une leçon ouverte depuis la bibliothèque,
  // une révision, un succès… — revenir en arrière, plutôt qu'à l'accueil,
  // retombe sur cette page-là plutôt que de forcer celle du cours courant.
  const backHome = () => navigate(-1)

  if (finished) {
    // L'enchaînement suit l'ordre du parcours, pas celui des seules leçons :
    // la suite peut être une révision, et la sauter viderait le parcours de
    // son sens.
    const next = nextAfter(lessonId)

    return (
      <SessionResult
        outcome={finished.outcome}
        passed={finished.passed}
        xp={finished.xp}
        deferred={finished.deferred}
        onContinue={backHome}
        onNext={next ? () => goTo(next) : undefined}
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
      onSkipAside={aside.length > 0 ? skipAside : undefined}
      onFinish={(outcome, deferred) => {
        clearSnapshot(course.id, lessonId)
        // Une leçon dont des cartes ont été remises à plus tard est tout de
        // même faite : le parcours continue, et c'est le rattrapage, avant la
        // séance finale, qui retient l'unité tant qu'elles n'y sont pas reprises.
        const result = finishLesson(course.id, lessonId, outcome)
        setFinished({ outcome, deferred, ...result })
      }}
    />
  )
}
