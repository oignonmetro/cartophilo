import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  achievementStatus,
  itemsLearnedCount,
  lessonsCompletedCount,
  type AchievementFamily,
} from './achievements'
import type { CardState } from './srs'
import { createCard } from './srs'

const FAMILY: AchievementFamily = {
  id: 'items',
  title: 'Test',
  unit: 'éléments',
  tiers: [
    { threshold: 10, label: 'A' },
    { threshold: 50, label: 'B' },
    { threshold: 150, label: 'C' },
  ],
}

describe('statut d’une échelle de paliers', () => {
  it('ne débloque rien avant le premier seuil', () => {
    expect(achievementStatus(FAMILY, 0)).toMatchObject({ unlocked: 0, next: { threshold: 10, label: 'A' } })
    expect(achievementStatus(FAMILY, 9)).toMatchObject({ unlocked: 0 })
  })

  it('débloque un palier pile à son seuil', () => {
    expect(achievementStatus(FAMILY, 10)).toMatchObject({ unlocked: 1, next: { threshold: 50, label: 'B' } })
  })

  it('débloque plusieurs paliers d’un coup', () => {
    expect(achievementStatus(FAMILY, 200)).toMatchObject({ unlocked: 3, next: null })
  })

  it('reste cohérent pour chaque échelle vraiment servie par l’écran', () => {
    // Régression : des seuils mal ordonnés casseraient l'arrêt au premier
    // manquant (voir `achievementStatus`).
    for (const family of ACHIEVEMENTS) {
      const thresholds = family.tiers.map((tier) => tier.threshold)
      expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b))
      expect(new Set(thresholds).size).toBe(thresholds.length)
    }
  })
})

describe('éléments appris', () => {
  it('somme les cartes de tous les cours', () => {
    const cards: Record<string, Record<string, CardState>> = {
      'cours-a': { v1: createCard('v1', 0), v2: createCard('v2', 0) },
      'cours-b': { g1: createCard('g1', 0) },
    }
    expect(itemsLearnedCount(cards)).toBe(3)
  })

  it('vaut zéro sans aucun cours', () => {
    expect(itemsLearnedCount({})).toBe(0)
  })
})

describe('leçons terminées', () => {
  it('ne compte que les leçons réussies au moins une fois, tous cours confondus', () => {
    const lessons = {
      'cours-a': {
        l1: { level: 1, completions: 3, lastAt: 0, bestAccuracy: 1 },
        l2: { level: 0, completions: 1, lastAt: 0, bestAccuracy: 0.4 },
      },
      'cours-b': {
        l3: { level: 1, completions: 1, lastAt: 0, bestAccuracy: 0.8 },
      },
    }
    expect(lessonsCompletedCount(lessons)).toBe(2)
  })

  it('vaut zéro sans progression', () => {
    expect(lessonsCompletedCount({})).toBe(0)
  })
})
