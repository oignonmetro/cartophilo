import { useEffect, useMemo, useRef, useState } from 'react'
import { TableBank, TableCell, TableOrder } from '@/components/session/TableExercise'
import { tableIds } from '@/content/course'
import { noteTables, plainInline } from '@/content/notes'
import { tableExercises, tableStructure, type Exercise } from '@/engine/exercises'
import { createRng } from '@/engine/rng'
import { formattingShortcut } from './formatting'
import { appendTable, cleanCell, gridTable, removeTable, replaceTable, structureHint, tableSpans } from './tableGrid'

/**
 * Onglet Tableaux de l'éditeur : chaque tableau du rappel (voir
 * `lessonTables`), édité en grille plutôt qu'en lignes `| … |`, avec ce que
 * l'application en fera — tableau à trous, ou repérage pour un plan (voir
 * `tableStructure`) — et un aperçu jouable de ses exercices. Tout s'écrit
 * dans le texte du rappel, que l'onglet Rappel montre tel quel : les deux
 * onglets éditent la même chose.
 */

/** Gabarits proposés à l'ajout : un tableau croisé, un plan qui se jouera en repérage. */
const BLANK_TABLE = [
  ['', 'Colonne A', 'Colonne B'],
  ['Ligne 1', '', ''],
  ['Ligne 2', '', ''],
]
const BLANK_PLAN = [
  ['Moment', 'Lieu', 'Ce qui s’y joue'],
  ['', '', ''],
  ['', '', ''],
  ['', '', ''],
]

const KIND_LABEL: Record<string, string> = {
  'table-order': 'Remise en ordre',
  'table-bank': 'Banque',
  'table-cell': 'Case seule',
}

export function TablesEditor({
  lessonId,
  title,
  notes,
  originalNotes,
  onChange,
}: {
  lessonId: string
  title: string
  notes: string
  originalNotes: string
  onChange: (notes: string) => void
}) {
  const spans = tableSpans(notes)
  const tables = spans.map((span) => gridTable(span.grid))
  const ids = tableIds(lessonId, tables)
  const originalIds = new Set(tableIds(lessonId, noteTables(originalNotes)))
  const [selected, setSelected] = useState(0)
  const current = Math.min(selected, spans.length - 1)

  // Entrée dans une case : le curseur descend d'une ligne, une fois la grille rendue.
  const pendingFocus = useRef<string | null>(null)
  useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    pendingFocus.current = null
    document.querySelector<HTMLTextAreaElement>(`[data-cell="${key}"]`)?.focus()
  }, [notes])

  function edit(index: number, change: (grid: string[][]) => string[][]) {
    const grid = spans[index]!.grid.map((row) => row.slice())
    onChange(replaceTable(notes, index, change(grid)))
  }

  function add(grid: string[][]) {
    onChange(appendTable(notes, grid))
    setSelected(spans.length)
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => add(BLANK_TABLE)}
            className="rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
          >
            + Tableau
          </button>
          <button
            type="button"
            onClick={() => add(BLANK_PLAN)}
            title="Un plan : une colonne de repères (« 27c-29d », « II, 3 ») dans l'ordre du texte, joué en repérage"
            className="rounded-lg border-2 border-dashed border-line px-3 py-1.5 text-sm font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
          >
            + Plan (repérage)
          </button>
          <p className="text-xs text-ink-faint">
            Les tableaux s'ajoutent à la fin du rappel ; l'onglet Rappel permet de les déplacer dans le texte.
          </p>
        </div>

        {spans.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-faint">Aucun tableau dans le rappel de cette leçon.</p>
        )}

        {spans.map((span, index) => {
          const table = tables[index]!
          const id = ids[index]
          const structure = tableStructure(table)
          const hint = structureHint(table)
          const width = span.grid[0]?.length ?? 1
          const isSelected = index === current
          return (
            <section
              key={index}
              onFocusCapture={() => setSelected(index)}
              className={`card-3d flex flex-col gap-3 p-4 ${isSelected ? 'ring-2 ring-teal/50' : ''}`}
            >
              <header className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-ink-faint">Tableau {index + 1}</span>
                {id === null ? (
                  <Badge tone="faint" title="Aucune case remplie hors de l'en-tête : rien à demander">
                    Pas joué
                  </Badge>
                ) : structure ? (
                  <Badge tone="violet" title="Moments à remettre dans l'ordre, puis repères à replacer, puis un repère seul">
                    Repérage · {plainInline(columnTitle(span.grid, structure.column)) || `colonne ${structure.column + 1}`}
                  </Badge>
                ) : (
                  <Badge tone="teal" title="Une colonne à remplir depuis une banque, puis une case seule">
                    Tableau à trous
                  </Badge>
                )}
                {id !== null && !originalIds.has(id) && (
                  <Badge
                    tone="amber"
                    title={`En-tête nouveau ou modifié : à l'enregistrement, ce tableau devient un nouvel élément de révision, repris de zéro (${id})`}
                  >
                    Révision reprise de zéro
                  </Badge>
                )}
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    isSelected ? 'bg-teal text-white' : 'border-2 border-line text-ink-soft hover:text-teal-deep'
                  }`}
                >
                  Aperçu
                </button>
                <button
                  type="button"
                  title="Supprimer le tableau du rappel"
                  onClick={() => {
                    if (window.confirm(`Supprimer le tableau ${index + 1} du rappel ?`)) onChange(removeTable(notes, index))
                  }}
                  className="rounded-md px-1.5 py-0.5 text-error hover:bg-error/10"
                >
                  ✕
                </button>
              </header>

              {hint && <p className="rounded-lg bg-amber/15 px-3 py-2 text-xs text-amber-deep">{hint}</p>}

              <div className="overflow-x-auto">
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${width}, minmax(9rem, 1fr)) auto` }}
                >
                  {span.grid[0]!.map((_, column) => (
                    <div key={`move-${column}`} className="flex justify-center gap-0.5 text-xs">
                      <SmallButton
                        title="Déplacer la colonne à gauche"
                        disabled={column === 0}
                        onClick={() => edit(index, (grid) => grid.map((row) => swap(row, column, column - 1)))}
                      >
                        ←
                      </SmallButton>
                      <SmallButton
                        title="Déplacer la colonne à droite"
                        disabled={column === width - 1}
                        onClick={() => edit(index, (grid) => grid.map((row) => swap(row, column, column + 1)))}
                      >
                        →
                      </SmallButton>
                      <SmallButton
                        title="Supprimer la colonne"
                        disabled={width <= 2}
                        danger
                        onClick={() => edit(index, (grid) => grid.map((row) => row.filter((_, c) => c !== column)))}
                      >
                        ✕
                      </SmallButton>
                    </div>
                  ))}
                  <span />

                  {span.grid.map((row, rowIndex) => (
                    <GridRow key={rowIndex}>
                      {row.map((cell, column) => {
                        const header = rowIndex === 0
                        const located = structure && !header && column === structure.column
                        const key = `${index}-${rowIndex}-${column}`
                        return (
                          <textarea
                            key={key}
                            data-cell={key}
                            value={cell}
                            rows={header ? 1 : 2}
                            spellCheck={false}
                            placeholder={header ? (column === 0 ? 'Coin (souvent vide)' : 'En-tête') : ''}
                            onChange={(event) =>
                              edit(index, (grid) => {
                                grid[rowIndex]![column] = cleanCell(event.target.value)
                                return grid
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                // Un retour à la ligne couperait la rangée : on descend d'une ligne.
                                event.preventDefault()
                                const next = `${index}-${rowIndex + 1}-${column}`
                                if (rowIndex + 1 < span.grid.length) {
                                  document.querySelector<HTMLTextAreaElement>(`[data-cell="${next}"]`)?.focus()
                                } else {
                                  pendingFocus.current = next
                                  edit(index, (grid) => [...grid, Array<string>(width).fill('')])
                                }
                                return
                              }
                              formattingShortcut((value) =>
                                edit(index, (grid) => {
                                  grid[rowIndex]![column] = cleanCell(value)
                                  return grid
                                }),
                              )(event)
                            }}
                            title="Ctrl+B gras, Ctrl+I italique, Ctrl+U souligné ; Entrée : case du dessous"
                            className={`min-h-9 resize-y rounded-lg border-2 px-2 py-1 text-sm leading-snug text-ink outline-none focus:border-teal ${
                              header
                                ? 'border-line bg-ink/5 font-bold'
                                : located
                                  ? 'border-violet/30 bg-violet/8'
                                  : column === 0
                                    ? 'border-line bg-paper font-semibold'
                                    : 'border-line bg-paper'
                            }`}
                          />
                        )
                      })}
                      <div className="flex items-center gap-0.5 text-xs">
                        {rowIndex > 0 && (
                          <>
                            <SmallButton
                              title="Monter la ligne"
                              disabled={rowIndex === 1}
                              onClick={() => edit(index, (grid) => swap(grid, rowIndex, rowIndex - 1))}
                            >
                              ↑
                            </SmallButton>
                            <SmallButton
                              title="Descendre la ligne"
                              disabled={rowIndex === span.grid.length - 1}
                              onClick={() => edit(index, (grid) => swap(grid, rowIndex, rowIndex + 1))}
                            >
                              ↓
                            </SmallButton>
                            <SmallButton
                              title="Supprimer la ligne"
                              danger
                              onClick={() => edit(index, (grid) => grid.filter((_, r) => r !== rowIndex))}
                            >
                              ✕
                            </SmallButton>
                          </>
                        )}
                      </div>
                    </GridRow>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => edit(index, (grid) => [...grid, Array<string>(width).fill('')])}
                  className="rounded-lg border-2 border-dashed border-line px-2.5 py-1 text-xs font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
                >
                  + Ligne
                </button>
                <button
                  type="button"
                  onClick={() => edit(index, (grid) => grid.map((row) => [...row, '']))}
                  className="rounded-lg border-2 border-dashed border-line px-2.5 py-1 text-xs font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
                >
                  + Colonne
                </button>
              </div>
            </section>
          )
        })}
      </div>

      <aside className="flex w-[30rem] shrink-0 flex-col overflow-y-auto border-l-2 border-line bg-ink/3 px-5 py-5">
        <p className="mb-3 text-center text-xs font-black tracking-widest text-ink-faint uppercase">Aperçu</p>
        {current >= 0 && ids[current] ? (
          <TablePreview id={ids[current]!} title={title} table={tables[current]!} label={`Tableau ${current + 1}`} />
        ) : (
          <p className="text-center text-sm text-ink-faint">
            {spans.length === 0 ? 'Rien à jouer.' : 'Ce tableau n’a aucune case remplie : il ne se joue pas.'}
          </p>
        )}
      </aside>
    </div>
  )
}

/**
 * Les exercices d'un tableau tels qu'une leçon les tire, joués pour de vrai
 * mais sans rien noter : chaque retouche du tableau les retire.
 */
function TablePreview({
  id,
  title,
  table,
  label,
}: {
  id: string
  title: string
  table: ReturnType<typeof gridTable>
  label: string
}) {
  const [seed, setSeed] = useState(1)
  const [step, setStep] = useState(0)
  const signature = JSON.stringify(table)
  const exercises = useMemo(
    () => tableExercises(title, [{ id, table }], createRng(seed)),
    // `signature` suit le contenu du tableau, recréé à chaque rendu.
    [id, title, signature, seed],
  )
  useEffect(() => setStep(0), [signature, seed])
  const exercise: Exercise | undefined = exercises[step]
  const next = () => setStep((n) => n + 1)
  const key = `${signature}:${seed}:${step}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-black text-ink-faint">{label}</span>
        {exercises.map((entry, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
              index === step ? 'bg-violet text-white' : 'border border-line text-ink-soft hover:text-violet'
            }`}
          >
            {KIND_LABEL[entry.kind] ?? entry.kind}
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setSeed((n) => n + 1)}
          title="Tirer d'autres trous, un autre ordre"
          className="rounded-lg border-2 border-line px-2 py-0.5 text-xs font-bold text-ink-soft hover:text-teal-deep"
        >
          Nouveau tirage
        </button>
      </div>

      <div className="card-3d flex h-[36rem] flex-col p-4">
        {!exercise && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-ink-faint">
            <p>Fin de l’aperçu.</p>
            <button
              type="button"
              onClick={() => setSeed((n) => n + 1)}
              className="rounded-lg border-2 border-line px-3 py-1 font-bold text-ink-soft hover:text-teal-deep"
            >
              Rejouer
            </button>
          </div>
        )}
        {exercise?.kind === 'table-order' && <TableOrder key={key} exercise={exercise} onDone={next} />}
        {exercise?.kind === 'table-bank' && <TableBank key={key} exercise={exercise} onDone={next} />}
        {exercise?.kind === 'table-cell' && <TableCell key={key} exercise={exercise} onAnswer={next} />}
      </div>
    </div>
  )
}

function columnTitle(grid: string[][], column: number): string {
  return grid[0]?.[column] ?? ''
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = list.slice()
  ;[next[a], next[b]] = [next[b]!, next[a]!]
  return next
}

/** Une rangée de la grille : ses cases et ses boutons, à plat dans la grille CSS. */
function GridRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SmallButton({
  title,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-1.5 py-0.5 disabled:opacity-25 ${
        danger ? 'text-error hover:bg-error/10' : 'text-ink-faint hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

const BADGE_TONES = {
  violet: 'bg-violet/15 text-violet',
  teal: 'bg-teal/15 text-teal-deep',
  amber: 'bg-amber/20 text-amber-deep',
  faint: 'bg-ink/8 text-ink-faint',
} as const

function Badge({ tone, title, children }: { tone: keyof typeof BADGE_TONES; title: string; children: React.ReactNode }) {
  return (
    <span title={title} className={`rounded-md px-1.5 py-0.5 text-xs font-black ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  )
}
