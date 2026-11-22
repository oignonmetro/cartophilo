import { createContext, useContext, useMemo, useRef } from 'react'
import type { Exercise } from '@/engine/exercises'
import type { SessionOutcome } from '@/engine/progress'
import { afterAnswer, effortOf, endBuzz, NO_COMBO, type Combo } from '@/engine/combo'
import { vibrate } from '@/lib/haptics'
import { useProgress } from '@/store/progressStore'

/**
 * Le retour haptique d'une session, déjà filtré par le réglage.
 *
 * Contrairement aux sons, la série a une mémoire : elle court d'un exercice
 * à l'autre, alors que le moment où elle doit se sentir est *dans*
 * l'exercice, à la validation de la réponse — pas à l'appui sur
 * « Continuer », une ou deux secondes plus tard, où la sensation ne se
 * rattacherait plus à rien (voir `useSessionSounds`, même argument). D'où le
 * contexte : `SessionScreen` tient le compteur pour toute la session, chaque
 * exercice le déclenche au bon instant.
 *
 * Les manches d'association font exception et se signalent depuis
 * `SessionScreen` : leur dernière paire trouvée *est* la fin de la manche,
 * il n'y a pas de « Continuer » à attendre.
 */

export interface SessionHaptics {
  /** Un exercice validé : fait avancer la série, ou la rompt. */
  answered: (exercise: Exercise, correct: boolean) => void
  /** Fin de session : un seul retour, gradué par le résultat. */
  finished: (outcome: SessionOutcome) => void
}

/** Hors session, il n'y a pas de série à suivre : tout est sans effet. */
const SILENT: SessionHaptics = { answered: () => {}, finished: () => {} }

const SessionHapticsContext = createContext<SessionHaptics>(SILENT)

export const SessionHapticsProvider = SessionHapticsContext.Provider

/**
 * Crée le suiveur de série d'une session. Appelé par `SessionScreen`, seul,
 * qui partage `haptics` aux exercices par le contexte.
 *
 * L'élan vit dans une `ref` et non dans un état : rien ne l'affiche, il ne
 * sert qu'aux vibrations (le badge de série et le réglage « Encouragements »
 * ont été retirés le 2026-11-22).
 */
export function useHaptics(): { haptics: SessionHaptics } {
  const enabled = useProgress((state) => state.haptics)
  const combo = useRef<Combo>(NO_COMBO)

  const haptics = useMemo<SessionHaptics>(
    () => ({
      answered: (exercise, correct) => {
        // Le compteur avance même réglage éteint : la série reste juste si
        // l'apprenant rallume les vibrations en cours de session.
        const result = afterAnswer(combo.current, effortOf(exercise), correct)
        combo.current = result.combo
        if (enabled && result.buzz) vibrate(result.buzz)
      },
      finished: (outcome) => {
        combo.current = NO_COMBO
        const buzz = endBuzz(outcome)
        if (enabled && buzz) vibrate(buzz)
      },
    }),
    [enabled],
  )

  return { haptics }
}

/** Le suiveur de la session en cours, pour un exercice. */
export function useSessionHaptics(): SessionHaptics {
  return useContext(SessionHapticsContext)
}
