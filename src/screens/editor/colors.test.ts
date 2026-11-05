import { describe, expect, it } from 'vitest'
import { cellColor, toggleColor } from './colors'

const apply = (value: string, start: number, end: number, color: 'teal' | 'violet') => {
  const change = toggleColor(value, start, end, color)
  return value.slice(0, change.start) + change.text + value.slice(change.end)
}

describe('toggleColor', () => {
  it('colore la sélection', () => {
    expect(apply('la vie nue', 3, 6, 'teal')).toBe('la {teal}vie{/teal} nue')
  })
  it('colore toute la case sans sélection', () => {
    expect(apply(' la vie ', 2, 2, 'teal')).toBe(' {teal}la vie{/teal} ')
  })
  it('retire la couleur déjà posée, marques sélectionnées ou non', () => {
    expect(apply('a {teal}vie{/teal} b', 8, 11, 'teal')).toBe('a vie b')
    expect(apply('a {teal}vie{/teal} b', 2, 18, 'teal')).toBe('a vie b')
    expect(apply('{teal}vie{/teal}', 0, 0, 'teal')).toBe('vie')
  })
  it('change de couleur', () => {
    expect(apply('{teal}vie{/teal}', 6, 9, 'violet')).toBe('{violet}vie{/violet}')
  })
  it('lit la couleur de toute la case', () => {
    expect(cellColor(' {coral}x{/coral} ')).toBe('coral')
    expect(cellColor('a {coral}x{/coral}')).toBeNull()
  })
})
