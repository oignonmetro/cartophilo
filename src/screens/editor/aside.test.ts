import { describe, expect, it } from 'vitest'
import { asideCompanions, asideKeyFor } from './aside'
import type { TreeLesson } from './types'

const lesson = (id: string, aside: string | null = null): TreeLesson => ({ id, title: id, label: null, aside })

describe('asideKeyFor', () => {
  const lessons = [lesson('a'), lesson('b', 'p'), lesson('c'), lesson('d'), lesson('e', 'q')]

  it('rejoint la parenthèse de la leçon d’avant', () => {
    expect(asideKeyFor(lessons, 'c')).toBe('p')
  })

  it('sinon celle de la leçon d’après', () => {
    expect(asideKeyFor(lessons, 'd')).toBe('q')
  })

  it('sinon ouvre une parenthèse neuve', () => {
    expect(asideKeyFor([lesson('a'), lesson('b')], 'a')).toBe('a')
  })
})

describe('asideCompanions', () => {
  const lessons = [lesson('a'), lesson('b', 'p'), lesson('c', 'p'), lesson('d', 'p'), lesson('e'), lesson('f', 'p')]

  it('rend les voisines de même clé, de proche en proche', () => {
    expect(asideCompanions(lessons, 'c', 'p').map((l) => l.id)).toEqual(['b', 'd'])
  })

  it('compte la clé choisie pour la leçon même si elle n’est pas encore enregistrée', () => {
    expect(asideCompanions(lessons, 'e', 'p').map((l) => l.id)).toEqual(['b', 'c', 'd', 'f'])
  })

  it('ne franchit pas une leçon hors parenthèse', () => {
    expect(asideCompanions(lessons, 'f', 'p')).toEqual([])
  })
})
