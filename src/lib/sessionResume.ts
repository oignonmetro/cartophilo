/**
 * Reprise d'une leçon quittée en cours de route.
 *
 * Les notes de révision espacée sont déjà enregistrées à chaque réponse (voir
 * `gradeItem`), mais la session elle-même — file d'exercices, position,
 * réussis — ne vivait qu'en mémoire : quitter la leçon, ou la laisser une
 * pause, la rejouait depuis le premier exercice. Cet instantané la retient,
 * par leçon, jusqu'à la fin de la session ou jusqu'à « Recommencer ».
 *
 * La file se reconstruit à l'identique depuis la graine et la difficulté
 * enregistrées (le moteur est déterministe) ; l'instantané ne garde donc que
 * des identifiants d'exercices.
 */

export interface SessionSnapshot {
  seed: number
  level: number
  /** Identifiants de la file, reprises comprises, dans son ordre courant. */
  queue: string[]
  position: number
  seen: string[]
  passed: string[]
  answers: number
  correct: number
  total: number
  batchStart: number
}

const KEY = 'cartophilo.sessionResume.v1'

type Store = Record<string, SessionSnapshot>

function read(): Store {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {}
  } catch {
    return {}
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Stockage plein ou indisponible : la reprise est un confort, pas un dû.
  }
}

const keyOf = (courseId: string, lessonId: string) => `${courseId}:${lessonId}`

export function loadSnapshot(courseId: string, lessonId: string): SessionSnapshot | null {
  const snapshot = read()[keyOf(courseId, lessonId)]
  if (!snapshot || !Array.isArray(snapshot.queue) || typeof snapshot.seed !== 'number') return null
  return snapshot
}

export function saveSnapshot(courseId: string, lessonId: string, snapshot: SessionSnapshot) {
  write({ ...read(), [keyOf(courseId, lessonId)]: snapshot })
}

export function clearSnapshot(courseId: string, lessonId: string) {
  const store = read()
  if (!(keyOf(courseId, lessonId) in store)) return
  delete store[keyOf(courseId, lessonId)]
  write(store)
}
