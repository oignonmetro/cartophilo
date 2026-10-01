import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BoltIcon } from '@/components/icons'
import { useProgress } from '@/store/progressStore'
import type { SessionCombo } from './useSessionHaptics'

/**
 * Ce que dit le badge à chaque palier. Trois messages, à l'image des trois
 * intensités de vibration qu'ils accompagnent — au-delà, le vocabulaire n'a
 * rien de plus fort à offrir (même plafond que `IMPACTS`, combo.ts).
 *
 * Le chiffre affiché à côté (voir plus bas, `combo.momentum`) est l'élan
 * réellement accumulé, pas un décompte de bonnes réponses consécutives :
 * l'élan pondère l'effort de chaque exercice (voir `effortOf`, combo.ts), si
 * bien qu'il peut monter de plusieurs points sur une seule réponse, ou
 * rester muet sur une présentation qui ne compte pour rien. Écrit `x5`,
 * comme un multiplicateur de jeu — plus court à lire d'un coup d'œil qu'« 5
 * pts », pour un badge qui ne reste affiché qu'un instant.
 *
 * Exportés : `SessionResult` reprend les mêmes mots pour son rappel de
 * meilleure série, plutôt que d'en inventer d'autres pour la même chose.
 */
export const COMBO_TIER_LABELS = ['En pleine lancée', 'Ça chauffe', 'Imparable'] as const
const MESSAGES = COMBO_TIER_LABELS

const VISIBLE_MS = 1400

/**
 * Le pendant visible d'un palier de série franchi : même instant, même
 * rareté que la vibration (voir `useSessionHaptics`), juste dans le canal
 * qu'on peut regarder plutôt que sentir. Ne réagit qu'aux montées — casser
 * une série n'a pas plus droit à l'écran qu'à la main, pour la même raison
 * (voir `combo.ts`). Se coupe avec le réglage `encouragements` (voir
 * `ProfileScreen`) : la série elle-même continue de compter, seul cet écran
 * disparaît.
 *
 * Un premier essai le posait en badge, par-dessus l'exercice en cours (une
 * pilule dans l'en-tête, puis sous l'en-tête) : ça se lisait comme une
 * notification qui dérange ce qu'on est en train de lire, plutôt qu'une
 * vraie célébration. Un bref écran plein, à la place — le même geste qu'un
 * écran de résultat, mais trop court pour qu'on ait besoin d'un bouton pour
 * le quitter : il se referme de lui-même, ou au premier appui si on est
 * pressé.
 */
export function ComboBadge({ combo }: { combo: SessionCombo }) {
  const enabled = useProgress((state) => state.encouragements)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled || combo.bump === 0) return
    setVisible(true)
    const timeout = setTimeout(() => setVisible(false), VISIBLE_MS)
    return () => clearTimeout(timeout)
  }, [enabled, combo.bump])

  const tier = Math.min(combo.tier, MESSAGES.length)

  return (
    <AnimatePresence>
      {visible && tier > 0 && (
        <motion.div
          key={combo.bump}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-coral text-white"
        >
          <span className="flex gap-2">
            {Array.from({ length: tier }, (_, index) => (
              <BoltIcon key={index} size={36} />
            ))}
          </span>
          <span className="text-3xl font-black">{MESSAGES[tier - 1]}</span>
          <span className="text-lg font-extrabold opacity-80">x{combo.momentum}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
