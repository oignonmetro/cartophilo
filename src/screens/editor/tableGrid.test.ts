import { describe, expect, it } from 'vitest'
import { noteTables } from '@/content/notes'
import { appendTable, formatTable, gridTable, removeTable, replaceTable, structureHint, tableSpans } from './tableGrid'

const NOTES = [
  '**Le plan.** Trois moments.',
  '',
  '| Moment | Lieu | Contenu |',
  '| introduction | 126a-128e | l’argument de **Zénon** |',
  '| discours | 128e-130a |',
  '',
  '- Une règle.',
  '|  | Société | Cité |',
  '| Fin | aucune | une seule |',
  '===',
  'Fin.',
].join('\n')

describe('tableaux du rappel en grille', () => {
  it('retrouve chaque tableau, ses lignes et ses cases, comme les lit l’application', () => {
    const spans = tableSpans(NOTES)
    expect(spans.map(({ start, end }) => [start, end])).toEqual([
      [2, 5],
      [7, 9],
    ])
    expect(spans[0]!.grid[2]).toEqual(['discours', '128e-130a', ''])
    expect(spans[1]!.grid[0]).toEqual(['', 'Société', 'Cité'])
    expect(spans.map((span) => gridTable(span.grid))).toEqual(noteTables(NOTES).map((table) => ({
      ...table,
      rows: table.rows.map((row) => ({ ...row, cells: [...row.cells, ...Array(2 - row.cells.length).fill('')] })),
    })))
  })

  it('réécrit un seul tableau, sans toucher au reste du rappel', () => {
    const grid = tableSpans(NOTES)[1]!.grid
    grid[1]![2] = 'une | seule'
    const next = replaceTable(NOTES, 1, [...grid, ['Démarche', '', 'holistique']])
    expect(next.split('\n').slice(7, 10)).toEqual(['| | Société | Cité |', '| Fin | aucune | une / seule |', '| Démarche | | holistique |'])
    expect(next.split('\n').slice(0, 7)).toEqual(NOTES.split('\n').slice(0, 7))
    expect(next.split('\n').slice(10)).toEqual(['===', 'Fin.'])
  })

  it('ajoute et retire un tableau avec sa ligne vide', () => {
    const added = appendTable(NOTES, [['A', 'B'], ['1', '2']])
    expect(added.endsWith('Fin.\n\n| A | B |\n| 1 | 2 |')).toBe(true)
    expect(removeTable(added, 2)).toBe(NOTES)
    expect(removeTable(NOTES, 0)).toBe(['**Le plan.** Trois moments.', '', '- Une règle.', ...NOTES.split('\n').slice(7)].join('\n'))
    expect(appendTable('', [['A']])).toBe('| A |')
    expect(formatTable([['', 'x']], '  ')).toEqual(['  | | x |'])
  })

  it('dit pourquoi un plan ne devient pas un repérage', () => {
    const plan = (lieux: string[]) => gridTable([['Moment', 'Lieu'], ...lieux.map((lieu, i) => [`m${i}`, lieu])])
    expect(structureHint(plan(['27c', '29d', '40d']))).toBeNull()
    expect(structureHint(plan(['27c', 'voir plus haut', '40d']))).toMatch(/Ligne 2 : « voir plus haut »/)
    expect(structureHint(plan(['27c', '', '40d']))).toMatch(/Ligne 2 : la colonne « Lieu » est vide/)
    expect(structureHint(plan(['27c', '40d', '29d']))).toMatch(/Ligne 3 : « 29d » vient avant « 40d »/)
    expect(structureHint(plan(['27c', '29d']))).toMatch(/trois lignes/)
    expect(structureHint(gridTable([['', 'A'], ['x', 'y'], ['z', 'w'], ['u', 'v']]))).toBeNull()
  })
})
