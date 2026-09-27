import { useEffect } from 'react'
import { Button } from '@/components/Button'
import { useIsDesktop } from '@/lib/useIsDesktop'

/**
 * Écran de pause en milieu de session (voir `BATCH_SIZE` dans
 * `SessionScreen`) : la file d'exercices n'est pas terminée, seulement
 * interrompue à un point régulier pour qu'une longue leçon ne décourage pas
 * d'un bloc. « Continuer » reprend exactement où elle s'est arrêtée — la
 * file et les réponses déjà données restent en mémoire, rien n'est rejoué.
 */
export function SessionPause({
  done,
  graded,
  correct,
  onContinue,
  onQuit,
}: {
  /** Exercices distincts déjà faits dans la leçon, tous lots confondus. */
  done: number
  /** Total d'exercices notés de la leçon (voir `graded` dans `SessionScreen`). */
  graded: number
  correct: number
  onContinue: () => void
  onQuit: () => void
}) {
  const isDesktop = useIsDesktop()
  const remaining = graded - done
  const toReview = done - correct

  // Même raccourci que `RuleNote` : Entrée enchaîne, réservé à l'ordinateur.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      event.preventDefault()
      onContinue()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, onContinue])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10 text-center [&>*]:shrink-0">
      <h1 className="text-3xl font-black">Petite pause ?</h1>
      <p className="max-w-xs text-sm text-ink-soft">
        {done} exercices faits, encore {remaining} dans cette leçon. Rien n'est perdu : reprenez quand vous voulez.
      </p>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <Stat label="Réussis" value={String(correct)} />
        <Stat label="À revoir" value={String(toReview)} />
      </div>

      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        <Button block onClick={onContinue}>
          Continuer
        </Button>
        <Button block tone="neutral" onClick={onQuit}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-3d flex flex-col items-center gap-1 px-4 py-4">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="text-2xl font-black text-teal">{value}</span>
    </div>
  )
}
