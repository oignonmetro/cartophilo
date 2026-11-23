import { describe, expect, it } from 'vitest'
import { moveUnit } from './unitGroups'

const units = [
  { id: 'a', group: null },
  { id: 'b', group: 'G' },
  { id: 'c', group: 'G' },
  { id: 'd', group: null },
]

describe('rangement des unités par glisser-déposer', () => {
  it('pose une unité à côté d’une autre et lui en donne le groupe', () => {
    expect(moveUnit(units, 'd', { kind: 'unit', unit: 'b', side: 'after' })).toEqual([
      { id: 'a', group: null },
      { id: 'b', group: 'G' },
      { id: 'd', group: 'G' },
      { id: 'c', group: 'G' },
    ])
    expect(moveUnit(units, 'b', { kind: 'unit', unit: 'a', side: 'before' })[0]).toEqual({ id: 'b', group: null })
  })

  it('range une unité à la fin d’un groupe, ou à la fin de la piste pour un groupe neuf', () => {
    expect(moveUnit(units, 'a', { kind: 'group', label: 'G' }).map((unit) => unit.id)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveUnit(units, 'a', { kind: 'group', label: 'Neuf' }).at(-1)).toEqual({ id: 'a', group: 'Neuf' })
  })

  it('sort une unité de son groupe, à la fin de la piste', () => {
    expect(moveUnit(units, 'b', { kind: 'loose' }).at(-1)).toEqual({ id: 'b', group: null })
  })
})
