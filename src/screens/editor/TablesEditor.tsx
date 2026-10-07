import { useEffect, useMemo, useRef, useState } from 'react'
import { TableBank, TableCell, TableOrder } from '@/components/session/TableExercise'
import { tableIds, tableKey } from '@/content/course'
import { noteTables, plainInline, type NoteTableBlock } from '@/content/notes'
import type { LessonTableSettings, TableExerciseChoice } from '@/content/schema'
import { tableExercises, tableStructure, type Exercise } from '@/engine/exercises'
import { createRng } from '@/engine/rng'
import { formattingShortcut } from './formatting'
import {
  appendTable,
  autoChoices,
  cleanCell,
  gridTable,
  readSettings,
  removeTable,
  replaceTable,
  structureHint,
  tableSpans,
  writeSettings,
  type TableChoices,
} from './tableGrid'

/**
 * Onglet Tableaux de l'éditeur : chaque tableau du rappel (voir
 * `lessonTables`), édité en grille plutôt qu'en lignes `| … |`, avec ce que
 * l'application en fera — tableau à trous, ou repérage pour un plan (voir
 * `tableStructure`) — et un aperçu jouable de ses exercices. Les cases
 * s'écrivent dans le texte du rappel, que l'onglet Rappel montre tel quel ;
 * les exercices choisis, dans `tables:` (voir `lessonTableSchema`), que
 * l'onglet tient à jour quand un en-tête change ou qu'une colonne bouge.
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

const CHOICE_LABEL: Record<TableExerciseChoice['kind'], string> = {
  order: 'Remise en ordre',
  bank: 'Banque',
  cell: 'Case seule',
}

/** Ce que demande chaque exercice, et la colonne qu'il vise. */
const CHOICE_HELP: Record<TableExerciseChoice['kind'], string> = {
  order: 'les lignes à remettre dans l’ordre ; la case de cette colonne se révèle une fois la ligne placée',
  bank: 'cette colonne vidée, ses cases à replacer depuis une banque',
  cell: 'une case de cette colonne, à écrire ou à révéler',
}

/** Une case du tableau, la ligne comptée sous l'en-tête. */
type CellRef = { row: number; column: number }

/** Pourquoi un exercice choisi ne se joue pas. */
const CHOICE_EMPTY: Record<TableExerciseChoice['kind'], string> = {
  order: 'Il faut au moins deux lignes.',
  bank: 'Il faut au moins deux cases remplies dans cette colonne.',
  cell: 'Cette colonne est vide.',
}

export function TablesEditor({
  lessonId,
  title,
  notes,
  originalNotes,
  settings,
  onChange,
}: {
  lessonId: string
  title: string
  notes: string
  originalNotes: string
  settings: LessonTableSettings[]
  onChange: (notes: string, settings: LessonTableSettings[]) => void
}) {
  const spans = tableSpans(notes)
  const tables = spans.map((span) => gridTable(span.grid))
  const ids = tableIds(lessonId, tables)
  const { choices, orphans } = readSettings(lessonId, notes, settings)
  const originalIds = new Set(tableIds(lessonId, noteTables(originalNotes)))
  const [selected, setSelected] = useState(0)
  const current = Math.min(selected, spans.length - 1)
  // Tableaux dépliés pour être édités : repliés par défaut, ils se
  // retouchent d'ordinaire dans le rappel ; seul un tableau tout juste ajouté s'ouvre.
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set())
  const toggle = (index: number) =>
    setOpen((previous) => {
      const next = new Set(previous)
      if (!next.delete(index)) next.add(index)
      return next
    })

  // Entrée dans une case : le curseur descend d'une ligne, une fois la grille rendue.
  const pendingFocus = useRef<string | null>(null)
  useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    pendingFocus.current = null
    document.querySelector<HTMLTextAreaElement>(`[data-cell="${key}"]`)?.focus()
  }, [notes])

  /** Écrit le rappel et ses réglages ensemble : un réglage suit son tableau, d'un en-tête à l'autre. */
  function commit(nextNotes: string, nextChoices: TableChoices) {
    onChange(nextNotes, writeSettings(lessonId, nextNotes, nextChoices, orphans))
  }

  /**
   * Retouche la grille d'un tableau ; `column` et `row`, quand une colonne
   * ou une ligne bouge ou disparaît, disent où va chacune (`null` :
   * supprimée), pour que ses exercices choisis la suivent. Une case seule
   * dont la ligne disparaît se tire de nouveau au hasard.
   */
  function edit(
    index: number,
    change: (grid: string[][]) => string[][],
    column?: (from: number) => number | null,
    row?: (from: number) => number | null,
  ) {
    const grid = spans[index]!.grid.map((each) => each.slice())
    const next = choices.slice()
    const own = next[index]
    if (own && (column || row)) {
      next[index] = own.flatMap((choice) => {
        const to = column ? column(choice.column) : choice.column
        if (to === null) return []
        const line = row && choice.row !== undefined ? row(choice.row) : choice.row
        return [withRow({ ...choice, column: to }, line ?? undefined)]
      })
    }
    commit(replaceTable(notes, index, change(grid)), next)
  }

  /**
   * Fixe la case d'une case seule (`cell`), ou la rend au hasard (`null`).
   * `number` est le numéro de l'exo ; sur un tableau aux exercices
   * automatiques, choisir une case les fait passer en « Choisis ».
   */
  function pickCell(index: number, number: number, cell: CellRef | null) {
    const own = choices[index]
    const base = own ?? autoChoices(tables[index]!)
    const at = own ? number - 1 : base.findIndex((choice) => choice.kind === 'cell')
    if (at < 0 || !base[at]) return
    setChoices(
      index,
      base.map((choice, i) =>
        i === at ? withRow({ kind: 'cell', column: cell?.column ?? choice.column }, cell?.row) : choice,
      ),
    )
  }

  function setChoices(index: number, chosen: TableExerciseChoice[] | null) {
    const next = choices.slice()
    next[index] = chosen
    commit(notes, next)
  }

  function add(grid: string[][]) {
    commit(appendTable(notes, grid), [...choices, null])
    setSelected(spans.length)
    setOpen((previous) => new Set(previous).add(spans.length))
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

        {orphans.map((orphan) => (
          <div
            key={orphan.table}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-amber/15 px-3 py-2 text-xs text-amber-deep"
          >
            <span>
              Des exercices sont choisis pour un tableau d'en-tête « {orphan.table} », qui n'est plus dans le rappel (son
              en-tête a sans doute changé dans l'onglet Rappel) : ils sont ignorés.
            </span>
            <span className="flex-1" />
            <select
              value=""
              onChange={(event) => {
                const key = tableKey(lessonId, ids[Number(event.target.value)]!)
                const kept = settings.filter((entry) => entry !== orphan && entry.table !== key)
                onChange(notes, [...kept, { ...orphan, table: key }])
              }}
              className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-ink"
            >
              <option value="" disabled>
                Rattacher au tableau…
              </option>
              {ids.map((id, i) =>
                id ? (
                  <option key={i} value={i}>
                    Tableau {i + 1}
                  </option>
                ) : null,
              )}
            </select>
            <SmallButton
              title="Oublier ces exercices"
              danger
              onClick={() => onChange(notes, settings.filter((entry) => entry !== orphan))}
            >
              ✕
            </SmallButton>
          </div>
        ))}

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
                ) : choices[index]?.length === 0 ? (
                  <Badge tone="faint" title="Choisi : le tableau reste dans le rappel, sans exercice ni révision">
                    Sans exercice
                  </Badge>
                ) : choices[index] ? (
                  <Badge tone="teal" title="Les exercices de ce tableau sont choisis, voir plus bas">
                    Exercices choisis
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
                  onClick={() => toggle(index)}
                  title="Le tableau se retouche d'ordinaire dans le rappel ; le déplier permet de l'éditer en grille"
                  className="rounded-lg border-2 border-line px-2.5 py-1 text-xs font-bold text-ink-soft hover:text-teal-deep"
                >
                  {open.has(index) ? '▾ Replier le tableau' : '▸ Modifier le tableau'}
                </button>
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
                    if (window.confirm(`Supprimer le tableau ${index + 1} du rappel ?`)) {
                      commit(removeTable(notes, index), choices.filter((_, i) => i !== index))
                    }
                  }}
                  className="rounded-md px-1.5 py-0.5 text-error hover:bg-error/10"
                >
                  ✕
                </button>
              </header>

              {hint && <p className="rounded-lg bg-amber/15 px-3 py-2 text-xs text-amber-deep">{hint}</p>}

              {open.has(index) && (
              <>
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
                        onClick={() =>
                          edit(
                            index,
                            (grid) => grid.map((row) => swap(row, column, column - 1)),
                            (from) => (from === column ? column - 1 : from === column - 1 ? column : from),
                          )
                        }
                      >
                        ←
                      </SmallButton>
                      <SmallButton
                        title="Déplacer la colonne à droite"
                        disabled={column === width - 1}
                        onClick={() =>
                          edit(
                            index,
                            (grid) => grid.map((row) => swap(row, column, column + 1)),
                            (from) => (from === column ? column + 1 : from === column + 1 ? column : from),
                          )
                        }
                      >
                        →
                      </SmallButton>
                      <SmallButton
                        title="Supprimer la colonne"
                        disabled={width <= 2}
                        danger
                        onClick={() =>
                          edit(
                            index,
                            (grid) => grid.map((row) => row.filter((_, c) => c !== column)),
                            (from) => (from === column ? null : from > column ? from - 1 : from),
                          )
                        }
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
                              onClick={() =>
                                edit(index, (grid) => swap(grid, rowIndex, rowIndex - 1), undefined, (from) =>
                                  from === rowIndex - 1 ? rowIndex - 2 : from === rowIndex - 2 ? rowIndex - 1 : from,
                                )
                              }
                            >
                              ↑
                            </SmallButton>
                            <SmallButton
                              title="Descendre la ligne"
                              disabled={rowIndex === span.grid.length - 1}
                              onClick={() =>
                                edit(index, (grid) => swap(grid, rowIndex, rowIndex + 1), undefined, (from) =>
                                  from === rowIndex - 1 ? rowIndex : from === rowIndex ? rowIndex - 1 : from,
                                )
                              }
                            >
                              ↓
                            </SmallButton>
                            <SmallButton
                              title="Supprimer la ligne"
                              danger
                              onClick={() =>
                                edit(index, (grid) => grid.filter((_, r) => r !== rowIndex), undefined, (from) =>
                                  from === rowIndex - 1 ? null : from > rowIndex - 1 ? from - 1 : from,
                                )
                              }
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
              </>
              )}

              {id !== null && (
                <ChoicesPanel
                  table={table}
                  grid={span.grid}
                  title={title}
                  id={id}
                  chosen={choices[index] ?? null}
                  onChange={(chosen) => setChoices(index, chosen)}
                />
              )}
            </section>
          )
        })}
      </div>

      <aside className="flex w-[30rem] shrink-0 flex-col overflow-y-auto border-l-2 border-line bg-ink/3 px-5 py-5">
        <p className="mb-3 text-center text-xs font-black tracking-widest text-ink-faint uppercase">Aperçu</p>
        {current >= 0 && ids[current] ? (
          <TablePreview
            id={ids[current]!}
            title={title}
            table={tables[current]!}
            exercises={choices[current] ?? undefined}
            label={`Tableau ${current + 1}`}
            onPickCell={(number, cell) => pickCell(current, number, cell)}
          />
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
 * mais sans rien noter. Chaque exo a son propre tirage : « Nouveau tirage »
 * ne retire que celui qu'on regarde. Une case seule ne se tire pas : on y
 * choisit la case demandée, ou on la laisse au hasard.
 */
function TablePreview({
  id,
  title,
  table,
  exercises: chosen,
  label,
  onPickCell,
}: {
  id: string
  title: string
  table: NoteTableBlock
  exercises?: TableExerciseChoice[]
  label: string
  /** Fixe (ou rend au hasard, `null`) la case de l'exo `number`. */
  onPickCell: (number: number, cell: CellRef | null) => void
}) {
  // Tirages déjà refaits, par numéro d'exo ; `round` repart de zéro pour tous.
  const [draws, setDraws] = useState<Record<number, number>>({})
  const [round, setRound] = useState(0)
  const [step, setStep] = useState(0)
  const signature = JSON.stringify([table, chosen])
  const seedOf = (number: number) => 1 + (draws[number] ?? 0) + round * 1000
  // Chaque exercice garde le numéro de sa ligne dans la liste des choisis
  // (« Exo 3 » reste l'exo 3 même si l'exo 2 ne peut pas se jouer).
  const numbered = useMemo(
    () => {
      if (!chosen) {
        // Le nombre d'exos automatiques ne dépend que du tableau, pas du tirage.
        const count = tableExercises(title, [{ id, table }], createRng(1)).length
        return Array.from({ length: count }, (_, index) => {
          const exercise = tableExercises(title, [{ id, table }], createRng(seedOf(index + 1)))[index]
          return exercise ? [{ exercise, number: index + 1 }] : []
        }).flat()
      }
      return chosen.flatMap((choice, index) =>
        tableExercises(title, [{ id, table, exercises: [choice] }], createRng(seedOf(index + 1))).map((exercise) => ({
          exercise,
          number: index + 1,
        })),
      )
    },
    // `signature` suit le contenu du tableau et ses exercices, recréés à chaque rendu.
    [id, title, signature, draws, round],
  )
  const entry = numbered[step]
  const exercise: Exercise | undefined = entry?.exercise
  const next = () => setStep((n) => n + 1)
  const key = `${signature}:${entry ? seedOf(entry.number) : 0}:${step}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-black text-ink-faint">{label}</span>
        {numbered.map(({ exercise: each, number }, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setStep(index)}
            title={KIND_LABEL[each.kind] ?? each.kind}
            className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
              index === step ? 'bg-violet text-white' : 'border border-line text-ink-soft hover:text-violet'
            }`}
          >
            Exo {number}
          </button>
        ))}
      </div>

      <div className="card-3d flex h-[36rem] flex-col p-4">
        {!exercise && numbered.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">Aucun exercice à jouer.</div>
        )}
        {!exercise && numbered.length > 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-ink-faint">
            <p>Fin de l’aperçu.</p>
            <button
              type="button"
              onClick={() => {
                setRound((n) => n + 1)
                setStep(0)
              }}
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

      {entry && exercise && exercise.kind !== 'table-cell' && (
        <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-line px-3 py-2">
          <span className="text-xs text-ink-faint">
            Exo {entry.number} :{' '}
            {exercise.kind === 'table-order' ? 'lignes et ordre tirés au hasard' : 'cases tirées au hasard'}
          </span>
          <button
            type="button"
            onClick={() => setDraws((previous) => ({ ...previous, [entry.number]: (previous[entry.number] ?? 0) + 1 }))}
            title={`Tirer d'autres trous, un autre ordre, pour l'exo ${entry.number} seulement`}
            className="rounded-lg border-2 border-line px-2 py-0.5 text-xs font-bold text-ink-soft hover:text-teal-deep"
          >
            Nouveau tirage
          </button>
        </div>
      )}

      {entry && exercise?.kind === 'table-cell' && (
        <CellPicker
          table={table}
          hole={exercise.hole}
          number={entry.number}
          fixed={chosen?.[entry.number - 1]?.row !== undefined}
          automatic={!chosen}
          onPick={(cell) => onPickCell(entry.number, cell)}
        />
      )}
    </div>
  )
}

/**
 * La case que demande une case seule, choisie en touchant le tableau en
 * réduction : la case fixée en plein, celle du tirage en pointillé.
 */
function CellPicker({
  table,
  hole,
  number,
  fixed,
  automatic,
  onPick,
}: {
  table: NoteTableBlock
  hole: CellRef
  number: number
  fixed: boolean
  automatic: boolean
  onPick: (cell: CellRef | null) => void
}) {
  const headers = [table.corner, ...table.columns]
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-line px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-faint">
          Exo {number} :{' '}
          {fixed ? 'la case demandée, en violet ; touchez-en une autre pour la changer' : 'case tirée au hasard ; touchez une case pour la fixer'}
        </span>
        <button
          type="button"
          onClick={() => onPick(null)}
          disabled={!fixed}
          title="La case se tire au hasard, une autre à chaque fois"
          className="shrink-0 rounded-lg border-2 border-line px-2 py-0.5 text-xs font-bold text-ink-soft hover:text-teal-deep disabled:opacity-40"
        >
          Au hasard
        </button>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-[0.7rem]">
        <thead>
          <tr>
            {headers.map((header, column) => (
              <th key={column} className="truncate px-1 text-left font-black text-ink-faint">
                {plainInline(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {[row.label, ...row.cells].map((cell, column) => {
                const text = plainInline(cell).trim()
                const isHole = hole.row === rowIndex && hole.column === column
                return (
                  <td key={column}>
                    <button
                      type="button"
                      disabled={!text}
                      onClick={() => onPick({ row: rowIndex, column })}
                      title={text}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left disabled:opacity-30 ${
                        isHole
                          ? fixed
                            ? 'bg-violet font-bold text-white'
                            : 'border border-dashed border-violet text-violet'
                          : 'bg-ink/5 text-ink-soft hover:bg-violet/15'
                      }`}
                    >
                      {text || '·'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {automatic && (
        <p className="text-xs text-ink-faint">Fixer une case fait passer les exercices de ce tableau en « Choisis ».</p>
      )}
    </div>
  )
}

/** Un exercice choisi, sa ligne fixée ou non : jamais de `row: undefined` laissé dans l'objet. */
function withRow(choice: TableExerciseChoice, row: number | undefined): TableExerciseChoice {
  const { row: _drop, ...rest } = choice
  return row === undefined ? rest : { ...rest, row }
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

/**
 * Les exercices d'un tableau : ceux que l'application tire seule, ceux qu'on
 * choisit (genre et colonne, dans l'ordre où la leçon les joue ; la
 * révision les fait tourner), ou aucun.
 */
function ChoicesPanel({
  table,
  grid,
  title,
  id,
  chosen,
  onChange,
}: {
  table: NoteTableBlock
  grid: string[][]
  title: string
  id: string
  chosen: TableExerciseChoice[] | null
  onChange: (chosen: TableExerciseChoice[] | null) => void
}) {
  const mode = chosen === null ? 'auto' : chosen.length === 0 ? 'none' : 'chosen'
  const headers = grid[0] ?? []
  const columnName = (column: number) => plainInline(headers[column] ?? '').trim() || `colonne ${column + 1}`
  const auto = autoChoices(table)
  const playable = (choice: TableExerciseChoice) =>
    tableExercises(title, [{ id, table, exercises: [choice] }], createRng(1)).length > 0
  const modes = [
    { value: 'auto', label: 'Automatiques', select: () => onChange(null) },
    { value: 'chosen', label: 'Choisis', select: () => onChange(auto.length > 0 ? auto : [{ kind: 'cell', column: 1 }]) },
    { value: 'none', label: 'Aucun', select: () => onChange([]) },
  ] as const

  function update(at: number, patch: Partial<TableExerciseChoice>) {
    onChange(chosen!.map((choice, i) => (i === at ? withRow({ ...choice, ...patch }, 'row' in patch ? patch.row : choice.row) : choice)))
  }
  const rowName = (row: number) => plainInline(grid[row + 1]?.[0] ?? '').trim() || `ligne ${row + 1}`

  return (
    <div className="flex flex-col gap-2 border-t-2 border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black tracking-wide text-ink-faint uppercase">Exercices</span>
        <div className="flex gap-0.5 rounded-lg border-2 border-line p-0.5">
          {modes.map(({ value, label, select }) => (
            <button
              key={value}
              type="button"
              onClick={() => mode !== value && select()}
              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                mode === value ? 'bg-teal text-white' : 'text-ink-faint hover:text-ink-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'auto' && (
        <p className="text-xs text-ink-soft">
          {tableStructure(table)
            ? `Un plan : remise en ordre, banque, puis case seule, sur la colonne « ${columnName(auto[0]!.column)} ».`
            : 'Une colonne tirée au hasard à remplir depuis une banque, puis une case seule prise ailleurs ; elles changent d’une fois à l’autre.'}{' '}
          « Choisis » fixe les exercices et leurs colonnes.
        </p>
      )}

      {mode === 'none' && (
        <p className="text-xs text-ink-soft">
          Le tableau reste dans le rappel, mais ne donne ni exercice ni élément de révision.
        </p>
      )}

      {mode === 'chosen' && (
        <>
          <p className="text-xs text-ink-faint">
            Joués dans cet ordre avant les cartes de la leçon ; en révision, un à la fois, à tour de rôle (la banque
            s’efface une fois le tableau bien su).
          </p>
          {chosen!.map((choice, at) => (
            <div key={at} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-black whitespace-nowrap text-ink-faint">Exo {at + 1}</span>
              <select
                value={choice.kind}
                onChange={(event) => update(at, { kind: event.target.value as TableExerciseChoice['kind'] })}
                className="rounded-md border border-line bg-paper px-1.5 py-1 font-bold text-ink"
              >
                {(['order', 'bank', 'cell'] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {CHOICE_LABEL[kind]}
                  </option>
                ))}
              </select>
              <span className="text-ink-faint">{choice.kind === 'order' ? 'révèle :' : 'colonne :'}</span>
              <select
                value={choice.column}
                onChange={(event) => update(at, { column: Number(event.target.value) })}
                className="rounded-md border border-line bg-paper px-1.5 py-1 text-ink"
              >
                {headers.map((_, column) => (
                  <option key={column} value={column}>
                    {columnName(column)}
                  </option>
                ))}
              </select>
              {choice.kind === 'cell' && (
                <>
                  <span className="text-ink-faint">ligne :</span>
                  <select
                    value={choice.row ?? ''}
                    onChange={(event) =>
                      update(at, { row: event.target.value === '' ? undefined : Number(event.target.value) })
                    }
                    className="rounded-md border border-line bg-paper px-1.5 py-1 text-ink"
                  >
                    <option value="">au hasard</option>
                    {grid.slice(1).map((_, row) => (
                      <option key={row} value={row}>
                        {rowName(row)}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <span className="min-w-40 flex-1 text-ink-faint">{CHOICE_HELP[choice.kind]}</span>
              {!playable(choice) && (
                <span className="font-bold text-amber-deep">
                  {choice.kind === 'cell' && choice.row !== undefined ? 'Cette case est vide.' : CHOICE_EMPTY[choice.kind]}
                </span>
              )}
              <SmallButton title="Monter" disabled={at === 0} onClick={() => onChange(swap(chosen!, at, at - 1))}>
                ↑
              </SmallButton>
              <SmallButton
                title="Descendre"
                disabled={at === chosen!.length - 1}
                onClick={() => onChange(swap(chosen!, at, at + 1))}
              >
                ↓
              </SmallButton>
              <SmallButton
                title="Retirer l'exercice"
                danger
                disabled={chosen!.length === 1}
                onClick={() => onChange(chosen!.filter((_, i) => i !== at))}
              >
                ✕
              </SmallButton>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...chosen!, { kind: 'cell', column: chosen!.at(-1)?.column ?? 1 }])}
            className="self-start rounded-lg border-2 border-dashed border-line px-2.5 py-1 text-xs font-bold text-ink-soft hover:border-teal hover:text-teal-deep"
          >
            + Exercice
          </button>
        </>
      )}
    </div>
  )
}
