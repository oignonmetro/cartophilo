import type { Track } from '@/content/schema'
import { isTextUnit } from '@/content/course'

/**
 * Onglet ouvert par défaut : la première piste qui a effectivement une liste
 * à montrer.
 *
 * Une piste à une seule unité (voir `selectTrack`) n'affiche jamais rien en
 * elle-même — son clic redirige aussitôt vers l'unité. La retenir comme
 * onglet par défaut laisserait l'écran s'ouvrir sur une liste à un seul
 * élément que le clic lui-même ne montre jamais.
 */
const ACTIVE_TRACK_KEY = 'cartophilo.active-tracks.v1'

/**
 * Piste ouverte, retenue par cours : l'écran se remonte à chaque retour d'une
 * leçon ou d'une étape (quitter y ramène par l'historique), et sans cette
 * mémoire il retombait toujours sur la première piste du cours.
 */
export function rememberedTrack(courseId: string, tracks: readonly Track[]): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_TRACK_KEY) ?? '{}')[courseId]
    return typeof saved === 'string' && tracks.some((track) => track.id === saved && !opensUnitDirectly(track)) ? saved : null
  } catch {
    return null
  }
}

export function rememberTrack(courseId: string, trackId: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(ACTIVE_TRACK_KEY) ?? '{}')
    localStorage.setItem(ACTIVE_TRACK_KEY, JSON.stringify({ ...all, [courseId]: trackId }))
  } catch {
    // Mémoire facultative : sans elle, on retombe sur la piste par défaut.
  }
}

export function defaultTrackId(tracks: readonly Track[]): string {
  return (tracks.find((track) => !opensUnitDirectly(track)) ?? tracks[0]!).id
}

/**
 * Une piste à une seule unité mène droit à elle (voir `selectTrack`), sauf
 * si c'est une unité de texte : sa carte porte aussi « Lire le texte », que
 * le raccourci rendrait inaccessible.
 */
export function opensUnitDirectly(track: Track): boolean {
  // Une piste-index montre son index, même quand un seul traité a son cours.
  return track.units.length === 1 && !isTextUnit(track.units[0]!) && !track.entries && !track.subjects
}
