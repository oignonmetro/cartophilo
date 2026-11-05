import { useRef, useState } from 'react'
import { Rich, type Tone } from '@/components/session/RuleNote'
import { COLORS, SWATCH, cellColor, toggleColor } from './colors'
import { replaceRange } from './editText'
import { formattingShortcut } from './formatting'
import { cleanCell, formatTable, tableSpans } from './tableGrid'

/**
 * Un tableau du rappel, édité sur place dans son rendu : on touche une case
 * pour la réécrire (son texte brut, avec ses `**` et ses `*`), Entrée passe à
 * la case du dessous, Tab à la suivante ; au survol, des poignées déplacent
 * ou suppriment une colonne ou une ligne, et deux boutons en ajoutent ; la
 * palette du rappel colore la sélection de la case en cours (toute la case
 * à défaut de sélection), en `{teal}…{/teal}` comme ailleurs. Les
 * exercices du tableau se règlent toujours dans l'onglet Tableaux (voir
 * `TablesEditor`), qui édite aussi la grille en entier.
 *
 * Le tableau ne garde pas d'état : il relit `src` (les lignes `| … |`) à
 * chaque rendu et rend le texte retouché par `onChange`.
 */

type Cell = { row: number; column: number }

const HANDLE =
  'rounded-md px-1.5 py-0.5 text-[0.7rem] font-bold text-ink-faint hover:bg-ink/8 hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent'
const ADD =
  'rounded-lg border-2 border-dashed border-line px-2 py-0.5 text-[0.7rem] font-bold text-ink-soft hover:border-teal hover:text-teal-deep'

export function EditableTable({
  src,
  tone,
  onChange,
}: {
  src: string
  tone: Tone
  onChange: (src: string) => void
}) {
  const span = tableSpans(src)[0]
  const [editing, setEditing] = useState<Cell | null>(null)
  const field = useRef<HTMLTextAreaElement | null>(null)
  if (!span) return <pre className="text-xs">{src}</pre>
  const grid = span.grid
  const width = grid[0]!.length
  const height = grid.length

  const write = (next: string[][]) => onChange(formatTable(next, span.indent).join('\n'))
  /** Retouche une copie de la grille ; la case en cours d'écriture ne suit pas une ligne ou une colonne qui bouge. */
  const edit = (change: (copy: string[][]) => string[][], focus: Cell | null = null) => {
    write(change(grid.map((row) => row.slice())))
    setEditing(focus)
  }
  const blank = () => Array<string>(width).fill('')
  const swap = <T,>(list: T[], a: number, b: number): T[] => {
    const next = list.slice()
    ;[next[a], next[b]] = [next[b]!, next[a]!]
    return next
  }

  /** Entrée et Tab : la case voisine, une ligne ajoutée s'il n'y en a plus. */
  const go = (row: number, column: number) => {
    if (row < height) setEditing({ row, column })
    else edit((copy) => [...copy, blank()], { row, column })
  }

  const cellClass = (row: number, column: number) => {
    const head = row === 0
    return `px-2 py-1.5 md:px-3 text-center ${head ? 'align-bottom font-black' : 'align-top'} ${
      head || column === 0 ? `font-black ${tone.label}` : 'text-ink-soft'
    } text-sm leading-snug`
  }

  const renderCell = (row: number, column: number) => {
    const text = grid[row]![column]!
    if (editing?.row === row && editing.column === column) {
      return (
        <textarea
          key={`${row}-${column}`}
          autoFocus
          value={text}
          rows={1}
          spellCheck={false}
          ref={(el) => {
            field.current = el
            if (!el) return
            el.style.height = 'auto'
            // Boîte « border-box » : la hauteur du contenu, plus les bordures.
            el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`
          }}
          onFocus={(event) => event.currentTarget.setSelectionRange(text.length, text.length)}
          onBlur={() => setEditing((current) => (current?.row === row && current.column === column ? null : current))}
          onChange={(event) => {
            const copy = grid.map((line) => line.slice())
            copy[row]![column] = cleanCell(event.target.value)
            write(copy)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setEditing(null)
            } else if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              go(row + 1, column)
            } else if (event.key === 'Tab') {
              event.preventDefault()
              const at = row * width + column + (event.shiftKey ? -1 : 1)
              if (at >= 0) go(Math.floor(at / width), at % width)
            } else formattingShortcut()(event)
          }}
          title="Ctrl+B gras, Ctrl+I italique, Ctrl+U souligné ; Entrée : case du dessous, Tab : case suivante, Échap : fermer"
          className="block w-full resize-none rounded-lg border-2 border-teal bg-paper px-1.5 py-0.5 text-center text-sm leading-snug font-normal text-ink outline-none"
        />
      )
    }
    return (
      <div
        role="button"
        tabIndex={0}
        title="Modifier la case"
        onClick={() => setEditing({ row, column })}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setEditing({ row, column })
          }
        }}
        className="-mx-1 min-h-[1.5rem] cursor-text rounded-lg px-1 py-0.5 hover:bg-ink/6 focus:bg-ink/6 focus:outline-none"
      >
        {text.trim() ? <Rich text={text} /> : <span className="text-ink-faint/60">·</span>}
      </div>
    )
  }

  // Les poignées gardent le focus de la case en cours d'écriture : elles agissent sans le prendre.
  const keep = (event: React.MouseEvent) => event.preventDefault()

  /** Comme le bouton de couleur du rappel, sur la sélection de la case en cours. */
  const paint = (color: (typeof COLORS)[number]) => {
    const el = field.current
    if (!el) return
    const change = toggleColor(el.value, el.selectionStart ?? 0, el.selectionEnd ?? 0, color)
    replaceRange(el, change.start, change.end, change.text)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(change.selectStart, change.selectEnd)
    })
  }
  const current = editing ? cellColor(grid[editing.row]?.[editing.column] ?? '') : null

  return (
    <div className="group/table flex flex-col gap-1.5">
      <div className={`overflow-x-auto rounded-2xl ${tone.panel}`}>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="opacity-0 transition-opacity group-hover/table:opacity-100 focus-within:opacity-100">
              {grid[0]!.map((_, column) => (
                <th key={column} className="px-1 pt-1 font-normal">
                  <span className="inline-flex gap-0.5" onMouseDown={keep}>
                    <button
                      type="button"
                      title="Colonne à gauche"
                      disabled={column === 0}
                      onClick={() =>
                        edit((copy) => copy.map((row) => swap(row, column, column - 1)))
                      }
                      className={HANDLE}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      title="Colonne à droite"
                      disabled={column === width - 1}
                      onClick={() =>
                        edit((copy) => copy.map((row) => swap(row, column, column + 1)))
                      }
                      className={HANDLE}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      title="Supprimer la colonne"
                      disabled={width <= 2}
                      onClick={() => edit((copy) => copy.map((row) => row.filter((_, c) => c !== column)))}
                      className={`${HANDLE} hover:!text-error`}
                    >
                      ✕
                    </button>
                  </span>
                </th>
              ))}
              <th />
            </tr>
            <tr>
              {grid[0]!.map((_, column) => (
                <th key={column} className={cellClass(0, column)}>
                  {renderCell(0, column)}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {grid.slice(1).map((line, offset) => {
              const row = offset + 1
              return (
                <tr key={row} className="group/row border-t border-ink/8">
                  {line.map((_, column) =>
                    column === 0 ? (
                      <th key={column} className={cellClass(row, column)}>
                        {renderCell(row, column)}
                      </th>
                    ) : (
                      <td key={column} className={cellClass(row, column)}>
                        {renderCell(row, column)}
                      </td>
                    ),
                  )}
                  <td className="w-0 pr-1 align-top whitespace-nowrap">
                    <span
                      className="inline-flex flex-col opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100"
                      onMouseDown={keep}
                    >
                      <span className="inline-flex">
                        <button
                          type="button"
                          title="Monter la ligne"
                          disabled={row === 1}
                          onClick={() => edit((copy) => swap(copy, row, row - 1))}
                          className={HANDLE}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          title="Descendre la ligne"
                          disabled={row === height - 1}
                          onClick={() => edit((copy) => swap(copy, row, row + 1))}
                          className={HANDLE}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          title="Supprimer la ligne"
                          disabled={height <= 2}
                          onClick={() => edit((copy) => copy.filter((_, r) => r !== row))}
                          className={`${HANDLE} hover:!text-error`}
                        >
                          ✕
                        </button>
                      </span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="flex flex-wrap items-center gap-1.5" onMouseDown={keep}>
          <span className="text-[0.7rem] font-bold text-ink-faint">Couleur (la sélection, ou toute la case) :</span>
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={current === color ? `${color} (retirer)` : color}
              onClick={() => paint(color)}
              className={`h-5 w-5 shrink-0 rounded-full border-2 border-paper shadow ${SWATCH[color]} ${
                current === color ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''
              }`}
            />
          ))}
        </div>
      )}
      <div className="flex gap-1.5 opacity-0 transition-opacity group-hover/table:opacity-100 focus-within:opacity-100" onMouseDown={keep}>
        <button
          type="button"
          onClick={() => edit((copy) => [...copy, blank()], { row: height, column: 0 })}
          className={ADD}
        >
          + Ligne
        </button>
        <button
          type="button"
          onClick={() => edit((copy) => copy.map((row) => [...row, '']), { row: 0, column: width })}
          className={ADD}
        >
          + Colonne
        </button>
      </div>
    </div>
  )
}
