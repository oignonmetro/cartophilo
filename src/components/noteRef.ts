import { createContext, useContext } from 'react'

/**
 * Ce qu'un renvoi `[[id|texte]]` d'un rappel sait faire : dire ce qu'il vise
 * dans le cours ouvert (une unité, ou un traité de l'index quand l'identifiant
 * est `traiteN`, N étant son rang chronologique), avec le texte à montrer au
 * survol, et l'ouvrir en feuille (voir `NoteRefSheet`). Sans fournisseur,
 * comme dans un test, le renvoi s'affiche en texte simple.
 */
export interface NoteTarget {
  kind: 'unit' | 'treatise'
  /** Au survol : la définition d'une entrée, le titre d'un traité. */
  hint: string
}

export interface NoteRef {
  resolve: (target: string) => NoteTarget | null
  open: (target: string) => void
}

export const NoteRefContext = createContext<NoteRef | null>(null)

export const useNoteRef = (): NoteRef | null => useContext(NoteRefContext)

/** `traite53` → 53 ; tout autre identifiant → null. */
export function treatiseChrono(target: string): number | null {
  const match = /^traite(\d+)$/.exec(target)
  return match ? Number(match[1]) : null
}
