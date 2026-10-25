import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TONES } from '@/components/session/RuleNote'
import { PassageText } from '@/components/PassageText'
import { ImportSplitDialog, type ImportTarget } from './ImportSplitDialog'
import { PassageEditor } from './PassageEditor'
import { lessonTables } from '@/content/course'
import { tableExercises } from '@/engine/exercises'
import { createRng } from '@/engine/rng'
import type { Lesson } from '@/content/schema'
import { TablesEditor } from './TablesEditor'
import { formattingShortcut } from './formatting'
import { RichNotesEditor, TitleField } from './RichNotesEditor'
import { useFrenchQuotes } from './frenchQuotes'
import { isCitation } from './textUnit'
import type { LessonTableDTO, PassageDTO, PointDTO, SkippedRowDTO, TrackKind, TreeCourse, TreeLesson, TreeTrack, TreeUnit } from './types'
import { NewLessonDialog, NewUnitDialog, UnitSettingsDialog } from './UnitDialogs'

/**
 * Éditeur visuel des rappels de cours, réservé au développement (`npm run
 * dev`) : jamais construit ni expédié en production, voir la route `/editeur`
 * dans `App.tsx` et l'API `tools/content-editor/api-plugin.ts` qui la sert.
 *
 * Parcourt l'arborescence des cours et édite le rappel d'une leçon tel que
 * l'apprenant le verra, directement dans son rendu (voir `RichNotesEditor`) :
 * plus de marqueurs `**gras**`, `__souligné__`… à placer à la main, la barre
 * d'outils montre et bascule la mise en forme de la sélection.
 */

interface Selection {
  course: string
  unit: string
  lesson: string
}

/** Fenêtre ouverte : création d'unité ou de leçon, réglages d'unité, import d'une liste. */
type Dialog =
  | { kind: 'newUnit'; course: string; track: TreeTrack }
  | { kind: 'newLesson'; course: string; track: TreeTrack; unit: TreeUnit }
  | { kind: 'unitSettings'; course: string; unit: TreeUnit }
  | { kind: 'import'; course: string; track: TreeTrack; target: ImportTarget }

/** Même forme que la réponse de `POST /api/import-points` (voir `tools/content/quizletImport.ts`). */
interface ImportedPointDTO {
  sentence: string
  answer: string
  needsReview: boolean
  sourceLine: number
}


/**
 * Id de la prochaine carte d'une leçon, sur le même gabarit que celles déjà
 * en place (`<leçon>-p<n>`) : le numéro le plus haut trouvé, plus un — jamais
 * de trou ni de doublon, même après suppression d'une carte au milieu.
 */
function nextPointId(lessonId: string, points: PointDTO[]): string {
  const prefix = `${lessonId}-p`
  let max = 0
  for (const point of points) {
    if (!point.id.startsWith(prefix)) continue
    const n = Number(point.id.slice(prefix.length))
    if (Number.isFinite(n)) max = Math.max(max, n)
  }
  return `${prefix}${max + 1}`
}

/** Un unique repli par `group` : les unités consécutives qui le partagent. */
function groupUnits(units: TreeUnit[]): { label: string | null; units: TreeUnit[] }[] {
  const out: { label: string | null; units: TreeUnit[] }[] = []
  for (const unit of units) {
    const last = out[out.length - 1]
    if (unit.group && last?.label === unit.group) last.units.push(unit)
    else out.push({ label: unit.group, units: [unit] })
  }
  return out
}

/**
 * Nombre d'exercices que les tableaux du rappel donneront en séance (voir
 * `tableExercises`) : plus parlant que le nombre de tableaux, presque toujours
 * un seul par leçon. Un tableau sans case à remplir n'en donne aucun.
 */
function tableExerciseCount(lessonId: string, title: string, notes: string, settings: LessonTableDTO[]): number {
  try {
    const lesson = { kind: 'grammar', id: lessonId, title, notes, points: [], tables: settings } as unknown as Lesson
    return tableExercises(title, lessonTables(lesson), createRng(1)).length
  } catch {
    return 0
  }
}

const POSITION_KEY = 'cartophilo.editor.position'

interface Position {
  course: string
  track: string
  unit: string
  lesson: string
  view: 'notes' | 'text' | 'points' | 'tables'
}

function rememberPosition(patch: Partial<Position>) {
  try {
    const current = JSON.parse(localStorage.getItem(POSITION_KEY) ?? '{}') as Partial<Position>
    localStorage.setItem(POSITION_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // Stockage indisponible : l'éditeur s'ouvre simplement sur l'accueil.
  }
}

function recallPosition(): Partial<Position> | null {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? 'null') as Partial<Position> | null
    return saved?.course && saved.track && saved.unit && saved.lesson ? saved : null
  } catch {
    return null
  }
}

export default function ContentEditorScreen() {
  useFrenchQuotes()
  const [tree, setTree] = useState<TreeCourse[] | null>(null)
  const [treeError, setTreeError] = useState<string | null>(null)

  const [selection, setSelection] = useState<Selection | null>(null)
  const [trackKind, setTrackKind] = useState<TrackKind>('grammar')
  const [trackId, setTrackId] = useState('')
  const [view, setView] = useState<'notes' | 'text' | 'points' | 'tables'>('notes')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  // Paragraphe cité d'une leçon de texte ; `null` pour une leçon classique.
  const [passage, setPassage] = useState<PassageDTO | null>(null)
  const [originalPassage, setOriginalPassage] = useState<PassageDTO | null>(null)
  const [title, setTitle] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [original, setOriginal] = useState('')
  // Les définitions du glossaire du cours ouvert : les `[def]` du rappel les
  // affichent et les retouchent sur place (voir `RichNotesEditor`).
  const [defs, setDefs] = useState<Record<string, string>>({})
  const [originalDefs, setOriginalDefs] = useState<Record<string, string>>({})
  const [points, setPoints] = useState<PointDTO[] | null>(null)
  // Les exercices choisis pour les tableaux du rappel (`tables:`), voir `TablesEditor`.
  const [tables, setTables] = useState<LessonTableDTO[]>([])
  const [originalTables, setOriginalTables] = useState<LessonTableDTO[]>([])
  const [originalPoints, setOriginalPoints] = useState<PointDTO[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  // Cartes que la mise en forme automatique n'a pas pu corriger seule (une
  // carte sans trou, une réponse vide), signalées au dernier enregistrement.
  const [problems, setProblems] = useState<string[]>([])
  // Incrémenté à chaque Annuler : force `PointsEditor` (voir plus bas) à se
  // remonter entièrement, pour que le texte brut tapé dans « Autres réponses »
  // (état local à `AltField`, voir pourquoi) revienne lui aussi à sa valeur
  // d'origine plutôt que de rester affiché tel quel malgré l'annulation.
  const [resetToken, setResetToken] = useState(0)

  const dirty =
    title !== originalTitle ||
    notes !== original ||
    JSON.stringify(defs) !== JSON.stringify(originalDefs) ||
    JSON.stringify(points) !== JSON.stringify(originalPoints) ||
    JSON.stringify(passage) !== JSON.stringify(originalPassage) ||
    JSON.stringify(tables) !== JSON.stringify(originalTables)

  const loadTree = useCallback(async () => {
    try {
      const res = await fetch('/api/tree')
      setTree(await res.json())
    } catch (err) {
      setTreeError(String(err))
    }
  }, [])

  useEffect(() => {
    void loadTree()
  }, [loadTree])

  const openLesson = useCallback(async (course: string, track: TreeTrack, unit: string, lesson: string) => {
    rememberPosition({ course, track: track.id, unit, lesson })
    setSelection({ course, unit, lesson })
    setTrackKind(track.kind)
    setTrackId(track.id)
    // Une leçon de vocabulaire ou de conjugaison n'a pas d'onglet Exercices
    // (voir plus bas) : y rester dessus laisserait le panneau vide.
    if (track.kind !== 'grammar') setView('notes')
    setStatus('loading')
    setError(null)
    setProblems([])
    try {
      const [res, defsRes] = await Promise.all([
        fetch(`/api/lesson?course=${course}&unit=${unit}&lesson=${lesson}`),
        fetch(`/api/definitions?course=${course}`),
      ])
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      const loadedDefs: Record<string, string> = defsRes.ok ? await defsRes.json() : {}
      setDefs(loadedDefs)
      setOriginalDefs(loadedDefs)
      setTitle(data.title)
      setOriginalTitle(data.title)
      setNotes(data.notes)
      setOriginal(data.notes)
      setPoints(data.points)
      setOriginalPoints(data.points)
      setTables(data.tables ?? [])
      setOriginalTables(data.tables ?? [])
      setPassage(data.passage)
      setOriginalPassage(data.passage)
      // L'onglet Texte n'existe que pour une leçon de texte.
      if (!data.passage) setView((current) => (current === 'text' ? 'notes' : current))
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(String((err as Error).message))
    }
  }, [])

  // Au rechargement (mise à jour du code, ou à la main), on reprend la leçon et l'onglet où l'on était.
  const restored = useRef(false)
  useEffect(() => {
    if (!tree || restored.current) return
    restored.current = true
    const saved = recallPosition()
    if (!saved) return
    const course = tree.find((c) => c.id === saved.course)
    const track = course?.tracks.find((t) => t.id === saved.track)
    const unit = track?.units.find((u) => u.id === saved.unit)
    if (!track || !unit?.lessons.some((l) => l.id === saved.lesson)) return
    void openLesson(saved.course!, track, saved.unit!, saved.lesson!).then(() => {
      if (saved.view && (saved.view === 'notes' || track.kind === 'grammar')) setView(saved.view)
    })
  }, [tree, openLesson])

  useEffect(() => {
    if (restored.current) rememberPosition({ view })
  }, [view])

  /** Après création dans une fenêtre : l'arborescence se recharge et la nouvelle leçon s'ouvre. */
  const afterCreate = useCallback(
    async (course: string, track: TreeTrack, unit: string, lesson: string) => {
      setDialog(null)
      await loadTree()
      void openLesson(course, track, unit, lesson)
    },
    [loadTree, openLesson],
  )

  /**
   * Supprime une unité entière, et toutes ses leçons avec elle : demande
   * confirmation d'abord, rien ne permet de revenir en arrière une fois le
   * fichier effacé. Referme l'éditeur si la leçon ouverte appartenait à
   * cette unité, pour ne pas le laisser pointer sur un contenu disparu.
   */
  const deleteUnit = useCallback(
    async (course: string, unit: TreeUnit) => {
      const count = unit.lessons.length
      if (
        !window.confirm(
          `Supprimer l'unité « ${unit.title} » et ${count === 1 ? 'sa leçon' : `ses ${count} leçons`} ? Cette action est irréversible.`,
        )
      ) {
        return
      }
      try {
        const res = await fetch(`/api/unit?course=${course}&unit=${unit.id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? res.statusText)
        if (selection?.course === course && selection?.unit === unit.id) setSelection(null)
        await loadTree()
      } catch (err) {
        window.alert(`Impossible de supprimer l'unité : ${(err as Error).message}`)
      }
    },
    [loadTree, selection],
  )

  /**
   * Supprime une leçon. Le serveur refuse de retirer la dernière d'une
   * unité (voir `DELETE /api/lesson`, `content/README.md` : une unité a
   * toujours au moins une leçon) plutôt que d'écrire un fichier invalide ;
   * le message d'erreur renvoyé l'explique directement.
   */
  const deleteLesson = useCallback(
    async (course: string, unit: string, lesson: TreeLesson) => {
      if (!window.confirm(`Supprimer la leçon « ${lesson.title} » ?`)) return
      try {
        const res = await fetch(`/api/lesson?course=${course}&unit=${unit}&lesson=${lesson.id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? res.statusText)
        if (selection?.course === course && selection?.unit === unit && selection?.lesson === lesson.id) {
          setSelection(null)
        }
        await loadTree()
      } catch (err) {
        window.alert(`Impossible de supprimer la leçon : ${(err as Error).message}`)
      }
    },
    [loadTree, selection],
  )

  /** Glisser-déposer d'une leçon à une autre position de sa unité. */
  const [drag, setDrag] = useState<{ course: string; unit: string; lesson: string } | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const moveLesson = useCallback(
    async (course: string, unit: string, lesson: string, to: number) => {
      try {
        const res = await fetch(`/api/lesson?course=${course}&unit=${unit}&lesson=${lesson}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? res.statusText)
        await loadTree()
      } catch (err) {
        window.alert(`Impossible de déplacer la leçon : ${(err as Error).message}`)
      }
    },
    [loadTree],
  )

  const save = useCallback(async () => {
    if (!selection) return
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch(`/api/lesson?course=${selection.course}&unit=${selection.unit}&lesson=${selection.lesson}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes, points: points ?? undefined, passage: passage ?? undefined, tables }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      // Les définitions retouchées dans le rappel s'écrivent dans `definitions.yaml`.
      const changedDefs = Object.fromEntries(Object.entries(defs).filter(([id, text]) => originalDefs[id] !== text))
      if (Object.keys(changedDefs).length > 0) {
        const defsRes = await fetch('/api/definitions?course=' + selection.course, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defs: changedDefs }),
        })
        if (!defsRes.ok) throw new Error((await defsRes.json()).error ?? defsRes.statusText)
        setOriginalDefs(defs)
      }
      // Le serveur met en forme ce qu'il enregistre (voir `tools/content/tidy.ts`) :
      // l'éditeur affiche désormais la version enregistrée, pour ne pas se
      // croire modifié au prochain coup d'œil.
      const savedTitle: string = data.title ?? title
      const savedNotes: string = data.notes ?? notes
      const savedPoints: PointDTO[] | null = data.points ?? points
      const savedPassage: PassageDTO | null = data.passage ?? passage
      setTitle(savedTitle)
      setNotes(savedNotes)
      setPoints(savedPoints)
      setPassage(savedPassage)
      // « Autres réponses » garde son texte brut en état local (voir
      // `AltField`) : il ne reprend la version enregistrée qu'en se remontant.
      if (JSON.stringify(savedPoints) !== JSON.stringify(points)) setResetToken((token) => token + 1)
      setOriginalTitle(savedTitle)
      setOriginal(savedNotes)
      setOriginalPoints(savedPoints)
      setOriginalPassage(savedPassage)
      setOriginalTables(tables)
      setProblems(Array.isArray(data.problems) ? data.problems : [])
      setStatus('saved')
      // Le titre affiché dans l'arborescence vient de sa propre copie
      // (`tree`), indépendante de l'état d'édition : sans ce rechargement,
      // un renommage resterait invisible dans la barre latérale tant qu'on
      // ne rouvre pas complètement l'éditeur.
      // Le repère d'une leçon de texte s'y affiche aussi.
      if (title !== originalTitle || passage?.label !== originalPassage?.label) void loadTree()
    } catch (err) {
      setStatus('error')
      setError(String((err as Error).message))
    }
  }, [selection, title, originalTitle, notes, defs, originalDefs, points, passage, originalPassage, tables, loadTree])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [save])

  const tone = TONES[trackKind]
  // Les entrées du glossaire du cours ouvert : les cibles des renvois d'un rappel.
  const glossary = useMemo(
    () =>
      (tree?.find((course) => course.id === selection?.course)?.tracks.find((track) => track.id === 'glossaire')?.units ?? []).map(
        ({ id, title }) => ({ id, title }),
      ),
    [tree, selection?.course],
  )

  return (
    <div className="flex h-screen flex-col bg-paper text-ink">
      <header className="flex items-center justify-between border-b-2 border-line px-4 py-2.5">
        <h1 className="text-sm font-black uppercase tracking-widest text-ink-soft">Éditeur de contenu</h1>

        {selection && trackKind === 'grammar' && (
          <div className="flex gap-0.5 rounded-xl border-2 border-line p-1">
            <ViewTabButton active={view === 'notes'} onClick={() => setView('notes')}>
              Rappel
            </ViewTabButton>
            {passage && (
              <ViewTabButton active={view === 'text'} onClick={() => setView('text')}>
                Texte
              </ViewTabButton>
            )}
            <ViewTabButton active={view === 'points'} onClick={() => setView('points')}>
              Exercices{points ? ` (${points.length})` : ''}
            </ViewTabButton>
            <ViewTabButton active={view === 'tables'} onClick={() => setView('tables')}>
              Tableaux ({tableExerciseCount(selection.lesson, title, notes, tables)})
            </ViewTabButton>
          </div>
        )}

        {selection && (
          <div className="flex items-center gap-3 text-sm">
            <SaveStatus status={status} dirty={dirty} error={error} problems={problems} />
            <button
              type="button"
              onClick={() => {
                setTitle(originalTitle)
                setNotes(original)
                setDefs(originalDefs)
                setPoints(originalPoints)
                setPassage(originalPassage)
                setTables(originalTables)
                setResetToken((n) => n + 1)
              }}
              disabled={!dirty}
              className="rounded-lg border-2 border-line px-3 py-1.5 font-bold text-ink-soft disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || status === 'saving'}
              className="rounded-lg border-2 border-teal-deep bg-teal px-3 py-1.5 font-bold text-white disabled:opacity-40"
            >
              Enregistrer
            </button>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-72 shrink-0 overflow-y-auto border-r-2 border-line px-3 py-3">
          {treeError && <p className="text-sm text-error">Erreur : {treeError}</p>}
          {!tree && !treeError && <p className="text-sm text-ink-faint">Chargement…</p>}
          {tree?.map((course) => (
            <details key={course.id} className="mb-1" open>
              <summary className="cursor-pointer rounded-lg px-2 py-1.5 text-sm font-black">{course.name}</summary>
              <div className="ml-2 border-l-2 border-line pl-2">
                {course.tracks.map((track) => (
                  <details key={track.id} className="mb-0.5">
                    <summary className="cursor-pointer rounded-lg px-2 py-1 text-sm font-bold text-ink-soft">
                      {track.title}
                      {track.units.length === 0 && <span className="ml-1 font-normal text-ink-faint">(vide)</span>}
                    </summary>
                    <div className="ml-2 border-l-2 border-line pl-2">
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'newUnit', course: course.id, track })}
                        className="mb-0.5 rounded-lg px-2 py-1 text-left text-xs font-bold text-ink-faint hover:bg-ink/5 hover:text-teal-deep"
                      >
                        + Nouvelle unité
                      </button>
                      {groupUnits(track.units).map((entry, index) => (
                        <div key={index} className="mb-0.5">
                          {entry.label && <p className="px-2 py-1 text-xs font-black text-ink-faint">{entry.label}</p>}
                          {entry.units.map((unit) => (
                            <details key={unit.id} className="mb-0.5">
                              <summary className="group flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold">
                                <span className="flex-1">{unit.title.replace(/`/g, '')}</span>
                                {unit.isText && (
                                  <span
                                    title="Unité de texte"
                                    className="rounded bg-coral/15 px-1 text-[0.6rem] font-black text-coral-deep uppercase"
                                  >
                                    texte
                                  </span>
                                )}
                                <button
                                  type="button"
                                  title="Réglages de l'unité (titre, sous-titre, groupe, présentation)"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setDialog({ kind: 'unitSettings', course: course.id, unit })
                                  }}
                                  className="rounded px-1 text-ink-faint opacity-0 hover:text-teal-deep group-hover:opacity-100"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  title="Supprimer l'unité"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    void deleteUnit(course.id, unit)
                                  }}
                                  className="rounded px-1 text-ink-faint opacity-0 hover:text-error group-hover:opacity-100"
                                >
                                  ✕
                                </button>
                              </summary>
                              <div className="ml-2 flex flex-col border-l-2 border-line pl-2">
                                {unit.lessons.map((lesson, lessonIndex) => {
                                  const active =
                                    selection?.course === course.id &&
                                    selection?.unit === unit.id &&
                                    selection?.lesson === lesson.id
                                  const sameUnit = drag?.course === course.id && drag.unit === unit.id
                                  const isTarget = sameUnit && dropIndex === lessonIndex && drag.lesson !== lesson.id
                                  return (
                                    <div
                                      key={lesson.id}
                                      draggable
                                      onDragStart={(event) => {
                                        event.dataTransfer.effectAllowed = 'move'
                                        setDrag({ course: course.id, unit: unit.id, lesson: lesson.id })
                                      }}
                                      onDragOver={(event) => {
                                        if (!sameUnit) return
                                        event.preventDefault()
                                        setDropIndex(lessonIndex)
                                      }}
                                      onDrop={(event) => {
                                        event.preventDefault()
                                        if (sameUnit) void moveLesson(drag.course, drag.unit, drag.lesson, lessonIndex)
                                        setDrag(null)
                                        setDropIndex(null)
                                      }}
                                      onDragEnd={() => {
                                        setDrag(null)
                                        setDropIndex(null)
                                      }}
                                      className={`group flex cursor-grab items-center gap-1 border-y-2 border-transparent ${
                                        drag?.lesson === lesson.id ? 'opacity-40' : ''
                                      } ${
                                        isTarget
                                          ? unit.lessons.findIndex((l) => l.id === drag.lesson) < lessonIndex
                                            ? 'border-b-teal'
                                            : 'border-t-teal'
                                          : ''
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => openLesson(course.id, track, unit.id, lesson.id)}
                                        className={`flex-1 rounded-lg px-2 py-1 text-left text-xs ${
                                          active ? 'bg-teal/15 font-bold text-teal-deep' : 'text-ink-soft hover:bg-ink/5'
                                        }`}
                                      >
                                        {lesson.label && (
                                          <span className="mr-1 font-black text-violet">{lesson.label}</span>
                                        )}
                                        {lesson.title}
                                      </button>
                                      <button
                                        type="button"
                                        title="Supprimer la leçon"
                                        onClick={() => void deleteLesson(course.id, unit.id, lesson)}
                                        className="rounded px-1 text-ink-faint opacity-0 hover:text-error group-hover:opacity-100"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )
                                })}
                                <button
                                  type="button"
                                  onClick={() => setDialog({ kind: 'newLesson', course: course.id, track, unit })}
                                  className="rounded-lg px-2 py-1 text-left text-xs font-bold text-ink-faint hover:bg-ink/5 hover:text-teal-deep"
                                >
                                  + Nouvelle leçon
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDialog({ kind: 'import', course: course.id, track, target: { kind: 'existing', unit } })
                                  }
                                  title="Coller une longue liste de cartes et la découper en plusieurs leçons"
                                  className="rounded-lg px-2 py-1 text-left text-xs font-bold text-ink-faint hover:bg-ink/5 hover:text-teal-deep"
                                >
                                  ⇪ Importer une liste…
                                </button>
                              </div>
                            </details>
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </nav>

        {!selection && (
          <div className="flex flex-1 items-center justify-center text-ink-faint">
            Choisis une leçon dans l'arborescence.
          </div>
        )}

        {selection && view === 'text' && passage && (
          <PassageEditor
            passage={passage}
            onChange={setPassage}
            points={points ?? []}
            onAddCard={(card) => {
              const current = points ?? []
              setPoints([...current, { id: nextPointId(selection.lesson, current), ...card, alt: [] }])
            }}
            onShowCards={() => setView('points')}
          />
        )}

        {selection && view === 'points' && points && (
          <PointsEditor
            key={`${selection.lesson}:${resetToken}`}
            lessonId={selection.lesson}
            points={points}
            onChange={setPoints}
            isText={Boolean(passage)}
          />
        )}

        {selection && view === 'tables' && (
          <TablesEditor
            key={selection.lesson}
            lessonId={selection.lesson}
            title={title}
            notes={notes}
            originalNotes={original}
            settings={tables}
            onChange={(nextNotes, nextTables) => {
              setNotes(nextNotes)
              setTables(nextTables)
            }}
          />
        )}

        {selection && view === 'notes' && (
          <RichNotesEditor
            key={selection.lesson}
            notes={notes}
            onChange={setNotes}
            tone={tone}
            trackKind={trackKind}
            onOpenTables={() => setView('tables')}
            glossary={glossary}
            defs={defs}
            onDefs={setDefs}
            selfId={selection.unit}
            autoLink={trackId === 'glossaire'}
            header={
              <>
                <header className="flex flex-col gap-3">
                  <span className={`h-1.5 w-10 rounded-full ${tone.accent}`} />
                  <TitleField value={title} onChange={setTitle} />
                </header>
                {passage?.text.trim() && (
                  <>
                    <PassageText text={passage.text} />
                    <p className={`text-xs font-black tracking-widest uppercase ${tone.eyebrow}`}>Explication</p>
                  </>
                )}
              </>
            }
          />
        )}
      </div>

      {dialog?.kind === 'newUnit' && (
        <NewUnitDialog
          course={dialog.course}
          track={dialog.track}
          onClose={() => setDialog(null)}
          onCreated={(unit, lesson) => void afterCreate(dialog.course, dialog.track, unit, lesson)}
          onImport={(meta) =>
            setDialog({
              kind: 'import',
              course: dialog.course,
              track: dialog.track,
              target: { kind: 'new', track: dialog.track.id, meta },
            })
          }
        />
      )}
      {dialog?.kind === 'newLesson' && (
        <NewLessonDialog
          course={dialog.course}
          unit={dialog.unit}
          onClose={() => setDialog(null)}
          onCreated={(lesson) => void afterCreate(dialog.course, dialog.track, dialog.unit.id, lesson)}
        />
      )}
      {dialog?.kind === 'unitSettings' && (
        <UnitSettingsDialog
          course={dialog.course}
          unit={dialog.unit}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            void loadTree()
          }}
        />
      )}
      {dialog?.kind === 'import' && (
        <ImportSplitDialog
          course={dialog.course}
          target={dialog.target}
          onClose={() => setDialog(null)}
          onCreated={(unit, lesson) => void afterCreate(dialog.course, dialog.track, unit, lesson)}
        />
      )}
    </div>
  )
}

function SaveStatus({
  status,
  dirty,
  error,
  problems,
}: {
  status: 'idle' | 'loading' | 'saving' | 'saved' | 'error'
  dirty: boolean
  error: string | null
  problems: string[]
}) {
  if (status === 'error') return <span className="font-bold text-error">Erreur : {error}</span>
  if (status === 'loading') return <span className="text-ink-faint">Chargement…</span>
  if (status === 'saving') return <span className="text-ink-faint">Enregistrement…</span>
  if (dirty) return <span className="font-bold text-amber-deep">Modifications non enregistrées</span>
  if (status === 'saved' && problems.length > 0) {
    // La liste entière au survol : la barre n'a de place que pour le compte.
    return (
      <span className="font-bold text-amber-deep" title={problems.join('\n')}>
        Enregistré, {problems.length === 1 ? '1 carte à reprendre' : `${problems.length} cartes à reprendre`} : {problems[0]}
      </span>
    )
  }
  if (status === 'saved') return <span className="text-teal-deep">Enregistré</span>
  return null
}

function ViewTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1 text-xs font-bold whitespace-nowrap transition ${
        active ? 'bg-teal text-white' : 'text-ink-faint hover:bg-ink/5 hover:text-ink-soft'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Liste à plat des points d'une leçon, une carte par ligne (terme à gauche,
 * définition à droite), sur le modèle de l'éditeur Quizlet plutôt que d'un
 * onglet par carte : une leçon peut porter plus d'une dizaine de points, et
 * l'arborescence de gauche s'arrête déjà à la leçon — y ajouter un niveau
 * par carte la rendrait vite impraticable à parcourir.
 *
 * Le réordonnancement déplace les cartes dans le tableau sans jamais changer
 * leur `id` : l'id encode un rang dans le nom (`<leçon>-p3`), mais rien ne
 * garantit qu'il reste synchrone avec la position réelle une fois qu'on a pu
 * réordonner ou supprimer une carte au milieu — l'id reste la seule chose
 * qui compte pour la révision espacée (`progressStore`), le renommer
 * perdrait la progression déjà enregistrée sur cette carte.
 */
function PointsEditor({
  lessonId,
  points,
  onChange,
  isText = false,
}: {
  lessonId: string
  points: PointDTO[]
  onChange: (points: PointDTO[]) => void
  /** Leçon de texte : repère de fragment, genre de chaque carte, tri citations d'abord. */
  isText?: boolean
}) {
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<{
    added: number
    reviewCount: number
    skipped: SkippedRowDTO[]
  } | null>(null)

  function update(index: number, patch: Partial<PointDTO>) {
    onChange(points.map((point, i) => (i === index ? { ...point, ...patch } : point)))
  }

  function remove(index: number) {
    onChange(points.filter((_, i) => i !== index))
  }

  // Glisser-déposer : on saisit la carte par son numéro.
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  function moveTo(from: number, to: number) {
    if (from === to) return
    const next = points.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    onChange(next)
  }

  // Dans une leçon de texte, les cartes-citation passent avant les cartes-explication
  // (tri stable : l'ordre au sein de chaque genre ne bouge pas).
  const citationsFirst = points.slice().sort((a, b) => Number(isCitation(b)) - Number(isCitation(a)))
  const sorted = citationsFirst.every((point, i) => point === points[i])

  /** Glisse une carte vide à `index` (0 = avant la première, `points.length` = après la dernière). */
  function insertAt(index: number) {
    const fresh: PointDTO = { id: nextPointId(lessonId, points), sentence: '', answer: '', alt: [] }
    onChange([...points.slice(0, index), fresh, ...points.slice(index)])
    return fresh.id
  }

  // Après un Tab, le curseur passe dans la carte tout juste créée (une fois rendue).
  const focusAfterInsert = useRef<string | null>(null)
  useEffect(() => {
    const id = focusAfterInsert.current
    if (!id) return
    focusAfterInsert.current = null
    document.querySelector<HTMLElement>(`[data-point-id="${id}"] textarea`)?.focus()
  }, [points])

  /**
   * Tab depuis le verso (réponse) d'une carte : crée une carte juste après elle.
   * Depuis le recto, Tab garde son rôle habituel (passer au verso).
   */
  function insertAfterOnTab(event: React.KeyboardEvent, index: number) {
    if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    focusAfterInsert.current = insertAt(index + 1)
  }

  /**
   * Même conversion que `tools/content/from-quizlet.ts`, servie par
   * `/api/import-points` (voir `tools/content-editor/api-plugin.ts`) : colle
   * une carte par ligne (phrase avec `___`, tabulation, réponse) plutôt que
   * de les saisir une par une. Les cartes importées s'ajoutent à la suite
   * des cartes déjà là, jamais à leur place — regrouper en leçons, écrire
   * les rappels et relire les lignes marquées « à vérifier » restent un
   * travail de lecture, pas quelque chose que l'import puisse faire à la
   * place (voir `content/philosophie.md`).
   */
  async function importList() {
    if (!importText.trim() || importStatus === 'loading') return
    setImportStatus('loading')
    setImportError(null)
    try {
      const res = await fetch('/api/import-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      const imported = data.points as ImportedPointDTO[]
      const skipped = data.skipped as SkippedRowDTO[]

      const newPoints: PointDTO[] = []
      for (const point of imported) {
        newPoints.push({
          id: nextPointId(lessonId, [...points, ...newPoints]),
          sentence: point.sentence,
          answer: point.answer,
          alt: [],
        })
      }
      onChange([...points, ...newPoints])
      setImportSummary({
        added: newPoints.length,
        reviewCount: imported.filter((point) => point.needsReview).length,
        skipped,
      })
      setImportText('')
      setImportStatus('idle')
    } catch (error) {
      setImportStatus('error')
      setImportError(String((error as Error).message))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setImportOpen((open) => !open)}
          className="rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
        >
          {importOpen ? 'Fermer l’import' : 'Importer une liste'}
        </button>
        {isText && (
          <button
            type="button"
            onClick={() => onChange(citationsFirst)}
            disabled={sorted}
            title="Regroupe les cartes-explication après les cartes-citation, sans changer l’ordre à l’intérieur de chaque groupe"
            className="rounded-lg border-2 border-line px-3 py-1.5 text-sm font-bold text-ink-soft hover:border-teal hover:text-teal-deep disabled:opacity-40"
          >
            Trier : citations d’abord
          </button>
        )}
      </div>

      {importOpen && (
        <div className="card-3d flex flex-col gap-2 p-4">
          <p className="text-xs text-ink-faint">
            Une carte par ligne : phrase avec <code>___</code>, puis <code>::</code>, puis la réponse. Plusieurs trous
            sur une ligne : réponses séparées par <code>//</code>, dans le même ordre.
          </p>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            spellCheck={false}
            rows={6}
            placeholder="Phrase avec ___. :: Réponse"
            className="min-h-32 resize-y rounded-xl border-2 border-line bg-paper p-2.5 font-mono text-sm leading-snug text-ink outline-none focus:border-teal"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void importList()}
              disabled={!importText.trim() || importStatus === 'loading'}
              className="rounded-lg border-2 border-teal-deep bg-teal px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {importStatus === 'loading' ? 'Import…' : 'Importer'}
            </button>
            {importStatus === 'error' && <span className="text-xs font-bold text-error">Erreur : {importError}</span>}
          </div>

          {importSummary && (
            <div className="rounded-lg bg-ink/5 p-2.5 text-xs text-ink-soft">
              <p>
                <span className="font-bold text-teal-deep">{importSummary.added}</span> carte(s) ajoutée(s) en fin de
                liste
                {importSummary.reviewCount > 0 && (
                  <span className="font-bold text-amber-deep"> · {importSummary.reviewCount} à vérifier (guillemets)</span>
                )}
                .
              </p>
              {importSummary.skipped.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer font-bold text-ink-faint">
                    {importSummary.skipped.length} ligne(s) ignorée(s)
                  </summary>
                  <ul className="mt-1 flex flex-col gap-1">
                    {importSummary.skipped.map((row) => (
                      <li key={row.line}>
                        ligne {row.line} : {row.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {points.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-faint">Aucune carte pour l'instant.</p>
      )}
      {points.length === 0 && (
        <button
          type="button"
          onClick={() => insertAt(0)}
          className="self-start rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
        >
          + Ajouter une carte
        </button>
      )}
      <div className="flex flex-col">
      {points.map((point, index) => (
        <Fragment key={point.id}>
        <InsertGap onInsert={() => insertAt(index)} />
        <div
          data-point-id={point.id}
          onDragOver={(event) => {
            if (dragFrom === null) return
            event.preventDefault()
            setDragOver(index)
          }}
          onDrop={(event) => {
            event.preventDefault()
            if (dragFrom !== null) moveTo(dragFrom, index)
            setDragFrom(null)
            setDragOver(null)
          }}
          className={`card-3d flex flex-col gap-2 border-y-2 border-transparent p-4 ${
            dragFrom === index ? 'opacity-40' : ''
          } ${
            dragFrom !== null && dragOver === index && dragFrom !== index
              ? dragFrom < index
                ? 'border-b-teal'
                : 'border-t-teal'
              : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-2 flex w-6 shrink-0 flex-col items-end gap-1">
              <span
                draggable
                title="Saisir pour déplacer la carte"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  const card = event.currentTarget.closest('[data-point-id]')
                  if (card) event.dataTransfer.setDragImage(card, 20, 20)
                  setDragFrom(index)
                }}
                onDragEnd={() => {
                  setDragFrom(null)
                  setDragOver(null)
                }}
                className="cursor-grab select-none text-sm font-black text-ink-faint hover:text-ink"
              >
                ⠿ {index + 1}
              </span>
              {isText && (
                <span
                  title={
                    isCitation(point)
                      ? 'Carte-citation : fait retrouver un morceau du texte'
                      : 'Carte-explication : fait retrouver une idée du commentaire'
                  }
                  className={`rounded px-1 text-[0.6rem] font-black uppercase ${
                    isCitation(point) ? 'bg-violet/15 text-violet' : 'bg-teal/15 text-teal-deep'
                  }`}
                >
                  {isCitation(point) ? 'cit.' : 'expl.'}
                </span>
              )}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <textarea
                  value={point.sentence}
                  onChange={(event) => update(index, { sentence: event.target.value })}
                  onKeyDown={formattingShortcut()}
                  spellCheck={false}
                  rows={3}
                  placeholder={isText ? '« Citation avec ___ » (plusieurs trous possibles)' : 'Phrase avec ___'}
                  title="Ctrl+B gras, Ctrl+I italique, Ctrl+U souligné"
                  className="min-h-16 resize-y rounded-xl border-2 border-line bg-paper p-2.5 text-sm leading-snug text-ink outline-none focus:border-teal"
                />
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{isText ? 'Phrase à trous' : 'Terme'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <textarea
                  value={point.answer}
                  onChange={(event) => update(index, { answer: event.target.value })}
                  onKeyDown={(event) => insertAfterOnTab(event, index)}
                  spellCheck={false}
                  rows={3}
                  placeholder={isText ? 'Réponse ; réponse du 2e trou…' : 'Réponse'}
                  className="min-h-16 resize-y rounded-xl border-2 border-line bg-paper p-2.5 text-sm leading-snug text-ink outline-none focus:border-teal"
                />
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{isText ? 'Réponse(s)' : 'Définition'}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                title="Supprimer la carte"
                onClick={() => remove(index)}
                className="rounded-md px-1.5 py-0.5 text-error hover:bg-error/10"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pl-9 text-xs">
            {isText && (
              <label
                className="flex items-center gap-1.5 text-ink-faint"
                title="Pour un paragraphe cité en plusieurs morceaux : 1/3, 2/3… Laisser vide sinon."
              >
                <span className="font-bold uppercase tracking-wide">Fragment</span>
                <input
                  value={point.fragment ?? ''}
                  onChange={(event) => update(index, { fragment: event.target.value || undefined })}
                  placeholder="1/3"
                  className="w-14 rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-teal"
                />
              </label>
            )}
            <label className="flex items-center gap-1.5 text-ink-faint">
              <span className="font-bold uppercase tracking-wide">Autres réponses</span>
              <AltField alt={point.alt} onChange={(alt) => update(index, { alt })} />
            </label>
            <label className="flex flex-1 items-center gap-1.5 text-ink-faint">
              <span className="font-bold uppercase tracking-wide">Précision</span>
              <input
                value={point.explanation ?? ''}
                onChange={(event) => update(index, { explanation: event.target.value })}
                onKeyDown={formattingShortcut()}
                placeholder="référence, complément…"
                title="Ctrl+B gras, Ctrl+I italique, Ctrl+U souligné"
                className="min-w-32 flex-1 rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-teal"
              />
            </label>
          </div>
        </div>
        </Fragment>
      ))}
      {points.length > 0 && <InsertGap onInsert={() => insertAt(points.length)} />}
      </div>
    </div>
  )
}

/**
 * Interstice entre deux cartes : invisible, il révèle un « + » dès que la
 * souris passe pile dans l'espace libre (la hauteur d'une gouttière), pour
 * glisser une carte à cet endroit précis. Remplace l'ancien bouton unique
 * « Ajouter une carte », qui ne savait qu'ajouter en fin de liste.
 */
function InsertGap({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group relative h-3 shrink-0">
      <button
        type="button"
        title="Insérer une carte ici"
        aria-label="Insérer une carte ici"
        onClick={onInsert}
        className="absolute left-1/2 top-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-violet text-lg font-black leading-none text-white pointer-events-none opacity-0 shadow transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        +
      </button>
    </div>
  )
}

/**
 * Le champ « Autres réponses » a besoin de son propre état local pour le
 * texte brut tapé, séparé du tableau `alt` qu'il encode : un champ contrôlé
 * directement par `alt.join('; ')` réanalyse et réaffiche la valeur à
 * chaque frappe, ce qui avale aussitôt un espace ou un `;` en cours de
 * saisie (« a; » redevient « a » avant même d'avoir pu taper le terme
 * suivant). `text` reste donc fidèle à ce qui a été tapé ; `alt` n'est
 * dérivé de lui, vers le parent, qu'en silence à côté.
 */
function AltField({ alt, onChange }: { alt: string[]; onChange: (alt: string[]) => void }) {
  const [text, setText] = useState(alt.join('; '))
  return (
    <input
      value={text}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        onChange(
          next
            .split(';')
            .map((v) => v.trim())
            .filter(Boolean),
        )
      }}
      placeholder="séparées par ;"
      className="w-48 rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-teal"
    />
  )
}
