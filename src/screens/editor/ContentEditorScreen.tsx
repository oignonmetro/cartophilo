import { useCallback, useEffect, useRef, useState } from 'react'
import { NoteBlocks, TONES } from '@/components/session/RuleNote'
import type { UnitColor } from '@/content/schema'

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

interface TreeLesson {
  id: string
  title: string
}

interface TreeUnit {
  id: string
  title: string
  group: string | null
  lessons: TreeLesson[]
}

type TrackKind = 'vocab' | 'grammar' | 'conjugation'

interface TreeTrack {
  id: string
  title: string
  kind: TrackKind
  units: TreeUnit[]
}

interface TreeCourse {
  id: string
  name: string
  tracks: TreeTrack[]
}

interface Selection {
  course: string
  unit: string
  lesson: string
}

/** Même forme que `grammarPointSchema` (`src/content/schema.ts`), sans `options` ni `translation`. */
interface PointDTO {
  id: string
  sentence: string
  answer: string
  alt: string[]
  explanation?: string
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
  const [view, setView] = useState<'notes' | 'points'>('notes')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [original, setOriginal] = useState('')
  const [points, setPoints] = useState<PointDTO[] | null>(null)
  const [originalPoints, setOriginalPoints] = useState<PointDTO[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const dirty = notes !== original || JSON.stringify(points) !== JSON.stringify(originalPoints)

  useEffect(() => {
    fetch('/api/tree')
      .then((res) => res.json())
      .then(setTree)
      .catch((err) => setTreeError(String(err)))
  }, [])

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
      setNotes(data.notes)
      setOriginal(data.notes)
      setPoints(data.points)
      setOriginalPoints(data.points)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(String((err as Error).message))
    }
  }, [])

  const save = useCallback(async () => {
    if (!selection) return
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch(`/api/lesson?course=${selection.course}&unit=${selection.unit}&lesson=${selection.lesson}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, points: points ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setOriginal(notes)
      setOriginalPoints(points)
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      setError(String((err as Error).message))
    }
  }, [selection, notes, points])

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
                setNotes(original)
                setPoints(originalPoints)
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
                      {groupUnits(track.units).map((entry, index) => (
                        <div key={index} className="mb-0.5">
                          {entry.label && <p className="px-2 py-1 text-xs font-black text-ink-faint">{entry.label}</p>}
                          {entry.units.map((unit) => (
                            <details key={unit.id} className="mb-0.5">
                              <summary className="cursor-pointer rounded-lg px-2 py-1 text-xs font-bold">
                                {unit.title}
                              </summary>
                              <div className="ml-2 flex flex-col border-l-2 border-line pl-2">
                                {unit.lessons.map((lesson) => {
                                  const active =
                                    selection?.course === course.id &&
                                    selection?.unit === unit.id &&
                                    selection?.lesson === lesson.id
                                  return (
                                    <button
                                      key={lesson.id}
                                      type="button"
                                      onClick={() => openLesson(course.id, track, unit.id, lesson.id)}
                                      className={`rounded-lg px-2 py-1 text-left text-xs ${
                                        active ? 'bg-teal/15 font-bold text-teal-deep' : 'text-ink-soft hover:bg-ink/5'
                                      }`}
                                    >
                                      {lesson.title}
                                    </button>
                                  )
                                })}
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

        {selection && view === 'points' && points && (
          <PointsEditor lessonId={selection.lesson} points={points} onChange={setPoints} />
        )}

        {selection && view === 'notes' && (
          <div className="flex min-h-0 flex-1">
            <div className="flex min-h-0 flex-1 flex-col gap-2 border-r-2 border-line px-4 py-3">
              <p className="text-sm font-black text-ink">{title}</p>
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
                <NoteBlocks notes={notes} tone={tone} />
              </div>
            </div>
          </div>
        )}
      </div>
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
}: {
  lessonId: string
  points: PointDTO[]
  onChange: (points: PointDTO[]) => void
}) {
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

  function add() {
    onChange([...points, { id: nextPointId(lessonId, points), sentence: '', answer: '', alt: [] }])
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {points.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-faint">Aucune carte pour l'instant.</p>
      )}
      {points.map((point, index) => (
        <div key={point.id} className="card-3d flex flex-col gap-2 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-2 w-6 shrink-0 text-right text-sm font-black text-ink-faint">{index + 1}</span>
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <textarea
                  value={point.sentence}
                  onChange={(event) => update(index, { sentence: event.target.value })}
                  spellCheck={false}
                  rows={3}
                  placeholder="Phrase avec ___"
                  className="min-h-16 resize-y rounded-xl border-2 border-line bg-paper p-2.5 text-sm leading-snug text-ink outline-none focus:border-teal"
                />
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Terme</span>
              </div>
              <div className="flex flex-col gap-1">
                <textarea
                  value={point.answer}
                  onChange={(event) => update(index, { answer: event.target.value })}
                  spellCheck={false}
                  rows={3}
                  placeholder="Réponse"
                  className="min-h-16 resize-y rounded-xl border-2 border-line bg-paper p-2.5 text-sm leading-snug text-ink outline-none focus:border-teal"
                />
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Définition</span>
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
            <label className="flex items-center gap-1.5 text-ink-faint">
              <span className="font-bold uppercase tracking-wide">Autres réponses</span>
              <input
                value={point.alt.join('; ')}
                onChange={(event) =>
                  update(index, {
                    alt: event.target.value
                      .split(';')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="séparées par ;"
                className="w-48 rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-teal"
              />
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
