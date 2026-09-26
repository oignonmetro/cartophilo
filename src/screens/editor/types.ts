/** Types échangés avec l'API de l'éditeur (`tools/content-editor/api-plugin.ts`). */

export interface TreeLesson {
  id: string
  title: string
  /** Repère d'une leçon de texte (« §1 », « Introduction ») ; `null` ailleurs. */
  label: string | null
}

export interface TreeUnit {
  id: string
  title: string
  group: string | null
  /** Unité de texte : au moins une de ses leçons porte un paragraphe cité. */
  isText: boolean
  lessons: TreeLesson[]
}

export type TrackKind = 'vocab' | 'grammar' | 'conjugation'

export interface TreeTrack {
  id: string
  title: string
  kind: TrackKind
  units: TreeUnit[]
}

export interface TreeCourse {
  id: string
  name: string
  tracks: TreeTrack[]
}

/** Même forme que `grammarPointSchema`, sans `options` ni `translation`. */
export interface PointDTO {
  id: string
  sentence: string
  answer: string
  alt: string[]
  explanation?: string
  /** Repère de fragment d'une carte-citation (« 1/3 »), leçons de texte seulement. */
  fragment?: string
}

/** Le paragraphe cité d'une leçon de texte ; `text` vide pour une leçon d'introduction. */
export interface PassageDTO {
  label: string
  text: string
  /** L'ouvrage cité, seulement utile dans une unité qui en articule plusieurs (voir `passageSchema.source`). */
  source?: string
}

/** Même forme que la réponse de `POST /api/import-text-cards` (voir `importTextUnitRows`). */
export interface ImportedTextCardDTO {
  sentence: string
  answer: string
  fragment?: string
  paragraph?: { number: string; heading: string }
  kind: 'citation' | 'explication'
  needsReview: boolean
  sourceLine: number
}

export interface SkippedRowDTO {
  line: number
  reason: string
  row: string
}

/** Une leçon à créer d'un coup, avec son contenu (voir `POST /api/lessons` et `POST /api/unit`). */
export interface NewLessonDTO {
  title: string
  notes?: string
  passage?: PassageDTO
  points: Omit<PointDTO, 'id'>[]
}

/**
 * Les réglages d'une unité pas encore créée, réunis par `NewUnitDialog` avant
 * de choisir comment lui donner ses premières leçons (écrites à la main, ou
 * importées — voir `ImportSplitDialog`).
 */
export interface NewUnitMeta {
  type: 'classic' | 'text'
  title: string
  subtitle: string
  group: string
  intro: string
}

/** Appel JSON à l'API de l'éditeur, qui lève l'erreur renvoyée par le serveur. */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data as T
}
