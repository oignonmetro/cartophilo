import { useCallback, useEffect, useRef, useState } from 'react'
import { NoteBlocks, TONES } from '@/components/session/RuleNote'
import { PassageText } from '@/components/PassageText'
import type { UnitColor } from '@/content/schema'
import { ImportSplitDialog, type ImportTarget } from './ImportSplitDialog'
import { PassageEditor } from './PassageEditor'
import { isCitation } from './textUnit'
import type { PassageDTO, PointDTO, SkippedRowDTO, TrackKind, TreeCourse, TreeLesson, TreeTrack, TreeUnit } from './types'
import { NewLessonDialog, NewUnitDialog, UnitSettingsDialog } from './UnitDialogs'

/**
 * Éditeur visuel des rappels de cours, réservé au développement (`npm run
 * dev`) : jamais construit ni expédié en production, voir la route `/editeur`
 * dans `App.tsx` et l'API `tools/content-editor/api-plugin.ts` qui la sert.
 *
 * Parcourt l'arborescence des cours, édite le texte brut d'un `notes:` à la
 * main (les marqueurs `**gras**`, `__souligné__`, `` `forme` `` et
 * `{couleur}...{/couleur}` s'insèrent via la barre d'outils autour de la
 * sélection), avec un aperçu qui rend exactement le même composant que
 * l'écran de rappel en session : ce qu'on voit ici est ce que voit
 * l'apprenant.
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

const COLORS = ['teal', 'violet', 'coral', 'amber', 'sky', 'yellow', 'green', 'red', 'orange', 'blue'] as const

const SWATCH: Record<UnitColor, string> = {
  teal: 'bg-teal',
  violet: 'bg-violet',
  coral: 'bg-coral',
  amber: 'bg-amber',
  sky: 'bg-sky',
  yellow: 'bg-yellow',
  green: 'bg-green',
  red: 'bg-red',
  orange: 'bg-orange',
  blue: 'bg-blue',
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

export default function ContentEditorScreen() {
  const [tree, setTree] = useState<TreeCourse[] | null>(null)
  const [treeError, setTreeError] = useState<string | null>(null)

  const [selection, setSelection] = useState<Selection | null>(null)
  const [trackKind, setTrackKind] = useState<TrackKind>('grammar')
  const [view, setView] = useState<'notes' | 'text' | 'points'>('notes')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  // Paragraphe cité d'une leçon de texte ; `null` pour une leçon classique.
  const [passage, setPassage] = useState<PassageDTO | null>(null)
  const [originalPassage, setOriginalPassage] = useState<PassageDTO | null>(null)
  const [title, setTitle] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [original, setOriginal] = useState('')
  const [points, setPoints] = useState<PointDTO[] | null>(null)
  const [originalPoints, setOriginalPoints] = useState<PointDTO[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  // Incrémenté à chaque Annuler : force `PointsEditor` (voir plus bas) à se
  // remonter entièrement, pour que le texte brut tapé dans « Autres réponses »
  // (état local à `AltField`, voir pourquoi) revienne lui aussi à sa valeur
  // d'origine plutôt que de rester affiché tel quel malgré l'annulation.
  const [resetToken, setResetToken] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const dirty =
    title !== originalTitle ||
    notes !== original ||
    JSON.stringify(points) !== JSON.stringify(originalPoints) ||
    JSON.stringify(passage) !== JSON.stringify(originalPassage)

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
    setSelection({ course, unit, lesson })
    setTrackKind(track.kind)
    // Une leçon de vocabulaire ou de conjugaison n'a pas d'onglet Exercices
    // (voir plus bas) : y rester dessus laisserait le panneau vide.
    if (track.kind !== 'grammar') setView('notes')
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(`/api/lesson?course=${course}&unit=${unit}&lesson=${lesson}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setTitle(data.title)
      setOriginalTitle(data.title)
      setNotes(data.notes)
      setOriginal(data.notes)
      setPoints(data.points)
      setOriginalPoints(data.points)
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

  const save = useCallback(async () => {
    if (!selection) return
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch(`/api/lesson?course=${selection.course}&unit=${selection.unit}&lesson=${selection.lesson}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes, points: points ?? undefined, passage: passage ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setOriginalTitle(title)
      setOriginal(notes)
      setOriginalPoints(points)
      setOriginalPassage(passage)
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
  }, [selection, title, originalTitle, notes, points, passage, originalPassage, loadTree])

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

  function wrapSelection(before: string, after: string) {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart, selectionEnd, value } = el
    const selected = value.slice(selectionStart, selectionEnd)
    const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd)
    setNotes(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = selectionStart + before.length
      el.selectionEnd = selectionStart + before.length + selected.length
    })
  }

  function prefixLines(prefix: string) {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart, selectionEnd, value } = el
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
    const nextBreak = value.indexOf('\n', selectionEnd)
    const lineEnd = nextBreak === -1 ? value.length : nextBreak
    const block = value.slice(lineStart, lineEnd)
    const prefixed = block
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : prefix + line))
      .join('\n')
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
    setNotes(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = lineStart
      el.selectionEnd = lineStart + prefixed.length
    })
  }

  /** Raccourcis clavier dans le textarea : mêmes marqueurs que la barre d'outils. */
  function handleFormattingShortcut(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return
    const key = event.key.toLowerCase()

    if (key === 'b') {
      event.preventDefault()
      wrapSelection('**', '**')
    } else if (key === 'i' && event.shiftKey) {
      // Mot étranger cité : distinct de l'italique générique, voir le bouton dédié.
      event.preventDefault()
      wrapSelection('`', '`')
    } else if (key === 'i') {
      event.preventDefault()
      wrapSelection('*', '*')
    } else if (key === 'u') {
      event.preventDefault()
      wrapSelection('__', '__')
    }
  }

  const tone = TONES[trackKind]

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
          </div>
        )}

        {selection && (
          <div className="flex items-center gap-3 text-sm">
            <SaveStatus status={status} dirty={dirty} error={error} />
            <button
              type="button"
              onClick={() => {
                setTitle(originalTitle)
                setNotes(original)
                setPoints(originalPoints)
                setPassage(originalPassage)
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
                                <span className="flex-1">{unit.title}</span>
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
                                {unit.lessons.map((lesson) => {
                                  const active =
                                    selection?.course === course.id &&
                                    selection?.unit === unit.id &&
                                    selection?.lesson === lesson.id
                                  return (
                                    <div key={lesson.id} className="group flex items-center gap-1">
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

        {selection && view === 'notes' && (
          <div className="flex min-h-0 flex-1">
            <div className="flex min-h-0 flex-1 flex-col gap-2 border-r-2 border-line px-4 py-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Titre de la leçon"
                aria-label="Titre de la leçon"
                className="rounded-lg border-2 border-transparent bg-transparent px-1 py-0.5 text-sm font-black text-ink outline-none focus:border-teal focus:bg-paper"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <ToolbarButton title="Gras (Ctrl+B)" onClick={() => wrapSelection('**', '**')}>
                  <strong>G</strong>
                </ToolbarButton>
                <ToolbarButton title="Italique : nuance, titre d'œuvre (Ctrl+I)" onClick={() => wrapSelection('*', '*')}>
                  <em>I</em>
                </ToolbarButton>
                <ToolbarButton title="Souligné (Ctrl+U)" onClick={() => wrapSelection('__', '__')}>
                  <span className="underline">S</span>
                </ToolbarButton>
                <ToolbarButton title="Mot étranger cité (Ctrl+Maj+I)" onClick={() => wrapSelection('`', '`')}>
                  `m`
                </ToolbarButton>
                <ToolbarButton title="Règle (- )" onClick={() => prefixLines('- ')}>
                  - Règle
                </ToolbarButton>
                <ToolbarButton title="Piège (! )" onClick={() => prefixLines('! ')}>
                  ⚠ Piège
                </ToolbarButton>
                <ToolbarButton
                  title="Tableau : deux classifications croisées"
                  onClick={() =>
                    wrapSelection(
                      '\n|              | Colonne A | Colonne B |\n| **Ligne 1**  | …         | …         |\n| **Ligne 2**  | …         | …         |\n',
                      '',
                    )
                  }
                >
                  ⊞ Tableau
                </ToolbarButton>
                {trackKind === 'vocab' && (
                  <ToolbarButton title="Nouvelle section (===)" onClick={() => wrapSelection('\n===\n', '')}>
                    === Section
                  </ToolbarButton>
                )}
                <span className="mx-1 h-5 w-px bg-line" />
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => wrapSelection(`{${color}}`, `{/${color}}`)}
                    className={`h-6 w-6 shrink-0 rounded-full border-2 border-paper shadow ${SWATCH[color]}`}
                  />
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onKeyDown={handleFormattingShortcut}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none rounded-2xl border-2 border-line bg-paper p-4 font-mono text-sm leading-relaxed text-ink outline-none focus:border-teal"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ink/3 px-6 py-6">
              <p className="mb-3 text-center text-xs font-black tracking-widest text-ink-faint uppercase">Aperçu</p>
              <div className="card-3d mx-auto flex w-full max-w-lg flex-col gap-4 self-center px-6 py-6">
                <header className="flex flex-col gap-3">
                  <span className={`h-1.5 w-10 rounded-full ${tone.accent}`} />
                  <h2 className="text-2xl leading-tight font-black text-balance">{title}</h2>
                </header>
                {passage?.text.trim() && (
                  <>
                    <PassageText text={passage.text} />
                    <p className={`text-xs font-black tracking-widest uppercase ${tone.eyebrow}`}>Explication</p>
                  </>
                )}
                <NoteBlocks notes={notes} tone={tone} />
              </div>
            </div>
          </div>
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

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg border-2 border-line bg-paper px-2.5 py-1.5 text-xs font-bold text-ink-soft transition hover:border-ink/20 hover:text-ink"
    >
      {children}
    </button>
  )
}

function SaveStatus({
  status,
  dirty,
  error,
}: {
  status: 'idle' | 'loading' | 'saving' | 'saved' | 'error'
  dirty: boolean
  error: string | null
}) {
  if (status === 'error') return <span className="font-bold text-error">Erreur : {error}</span>
  if (status === 'loading') return <span className="text-ink-faint">Chargement…</span>
  if (status === 'saving') return <span className="text-ink-faint">Enregistrement…</span>
  if (dirty) return <span className="font-bold text-amber-deep">Modifications non enregistrées</span>
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

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= points.length) return
    const next = points.slice()
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange(next)
  }

  // Dans une leçon de texte, les cartes-citation passent avant les cartes-explication
  // (tri stable : l'ordre au sein de chaque genre ne bouge pas).
  const citationsFirst = points.slice().sort((a, b) => Number(isCitation(b)) - Number(isCitation(a)))
  const sorted = citationsFirst.every((point, i) => point === points[i])

  function add() {
    onChange([...points, { id: nextPointId(lessonId, points), sentence: '', answer: '', alt: [] }])
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
      {points.map((point, index) => (
        <div key={point.id} className="card-3d flex flex-col gap-2 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-2 flex w-6 shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-black text-ink-faint">{index + 1}</span>
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
                  spellCheck={false}
                  rows={3}
                  placeholder={isText ? '« Citation avec ___ » (plusieurs trous possibles)' : 'Phrase avec ___'}
                  className="min-h-16 resize-y rounded-xl border-2 border-line bg-paper p-2.5 text-sm leading-snug text-ink outline-none focus:border-teal"
                />
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{isText ? 'Phrase à trous' : 'Terme'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <textarea
                  value={point.answer}
                  onChange={(event) => update(index, { answer: event.target.value })}
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
                title="Monter"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded-md px-1.5 py-0.5 text-ink-faint hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                title="Descendre"
                onClick={() => move(index, 1)}
                disabled={index === points.length - 1}
                className="rounded-md px-1.5 py-0.5 text-ink-faint hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
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
                placeholder="référence, complément…"
                className="min-w-32 flex-1 rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-teal"
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
      >
        + Ajouter une carte
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
