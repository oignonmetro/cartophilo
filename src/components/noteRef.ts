import { createContext, useContext } from 'react'

/**
 * Ce qu'un renvoi `[[id|texte]]` d'un rappel sait faire : vérifier que
 * l'unité visée existe dans le cours ouvert, et l'ouvrir en feuille (voir
 * `NoteRefSheet`). Sans fournisseur, comme dans un test, le renvoi s'affiche
 * en texte simple.
 */
export interface NoteRef {
  exists: (unitId: string) => boolean
  open: (unitId: string) => void
}

export const NoteRefContext = createContext<NoteRef | null>(null)

export const useNoteRef = (): NoteRef | null => useContext(NoteRefContext)
