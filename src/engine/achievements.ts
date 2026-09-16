import type { CourseBucket } from '@/store/progressStore'
import type { LessonProgressMap } from './progress'
import type { CardState } from './srs'

/**
 * Succès : des paliers qu'on débloque une fois pour toutes, à côté de la
 * série et du combo qui ne récompensent que l'instant présent. Trois natures
 * d'effort, chacune avec cinq paliers — éléments rencontrés, série la plus
 * longue jamais tenue, leçons menées à leur terme.
 *
 * Communs à tous les cours plutôt que propres au cours actif : Cartophilo
 * juxtapose plusieurs cours d'une même préparation (hors-programme, la vie,
 * Plotin, Marx) plutôt que plusieurs langues sans rapport entre elles — un
 * même tableau de succès a donc plus de sens qu'un par cours, qui
 * repartirait de zéro à chaque changement d'onglet. `itemsLearnedCount` et
 * `lessonsCompletedCount` somment donc `ProgressSnapshot.cards`/`.lessons`
 * sur tous les cours du bocal (`CourseBucket`), pas seulement le cours
 * actif — ce qui suppose de renoncer à ne compter que le vocabulaire
 * (`kind: 'vocab'`) : le contenu d'un cours non actif n'est pas chargé (voir
 * `CourseProvider`), impossible donc de savoir quelle nature a chacune de
 * ses cartes. La série fait exception de longue date : elle porte sur les
 * jours pratiqués, pas sur un cours en particulier (voir
 * `ProgressSnapshot.streak`).
 *
 * Les seuils datent de Cartolang (calés sur un seul cours à la fois) et
 * n'ont pas été recalibrés pour une somme sur plusieurs cours : à revoir une
 * fois le contenu réel de Cartophilo écrit.
 */
export interface AchievementTier {
  threshold: number
  label: string
}

export type AchievementId = 'items' | 'streak' | 'lessons'

export interface AchievementFamily {
  id: AchievementId
  title: string
  /** Unité affichée dans le texte de progression : « éléments », « jours »… */
  unit: string
  /** Croissants : `achievementStatus` s'arrête au premier seuil non atteint. */
  tiers: readonly AchievementTier[]
}

export const ACHIEVEMENTS: readonly AchievementFamily[] = [
  {
    id: 'items',
    title: 'Éléments appris',
    unit: 'éléments',
    tiers: [
      { threshold: 10, label: 'Premiers acquis' },
      { threshold: 50, label: 'Ça prend racine' },
      { threshold: 150, label: 'Bon bagage' },
      { threshold: 300, label: 'Solide bagage' },
      { threshold: 600, label: 'Mémoire d’éléphant' },
    ],
  },
  {
    id: 'streak',
    title: 'Série la plus longue',
    unit: 'jours',
    tiers: [
      { threshold: 3, label: 'Bon départ' },
      { threshold: 7, label: 'Une semaine tenue' },
      { threshold: 14, label: 'Ancré dans la routine' },
      { threshold: 30, label: 'Un mois sans faillir' },
      { threshold: 100, label: 'Increvable' },
    ],
  },
  {
    id: 'lessons',
    title: 'Leçons terminées',
    unit: 'leçons',
    tiers: [
      { threshold: 5, label: 'Premiers pas' },
      { threshold: 15, label: 'Bonne cadence' },
      { threshold: 40, label: 'Grand chemin' },
      { threshold: 80, label: 'Marathonien' },
      { threshold: 150, label: 'Tout un parcours' },
    ],
  },
]

export interface AchievementStatus {
  family: AchievementFamily
  value: number
  /** Nombre de paliers débloqués, 0 si aucun. */
  unlocked: number
  /** Premier palier non débloqué, `null` une fois l'échelle épuisée. */
  next: AchievementTier | null
}

/** Où en est un cours sur une échelle de paliers, `value` déjà calculée. */
export function achievementStatus(family: AchievementFamily, value: number): AchievementStatus {
  let unlocked = 0
  for (const tier of family.tiers) {
    if (value < tier.threshold) break
    unlocked += 1
  }
  return { family, value, unlocked, next: family.tiers[unlocked] ?? null }
}

/**
 * Éléments effectivement rencontrés, tous cours confondus — mot de
 * vocabulaire, point de grammaire ou forme de conjugaison sans distinction
 * (voir la remarque en tête de fichier sur pourquoi ce n'est plus filtré
 * par nature).
 */
export function itemsLearnedCount(cards: CourseBucket<Record<string, CardState>>): number {
  let count = 0
  for (const bucket of Object.values(cards)) count += Object.keys(bucket).length
  return count
}

/** Leçons menées à leur terme au moins une fois, tous cours confondus. */
export function lessonsCompletedCount(lessons: CourseBucket<LessonProgressMap>): number {
  let count = 0
  for (const bucket of Object.values(lessons)) {
    count += Object.values(bucket).filter((entry) => entry.level >= 1).length
  }
  return count
}
