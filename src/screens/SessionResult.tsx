import { useEffect } from 'react'
import { Button } from '@/components/Button'
import { BoltIcon } from '@/components/icons'
import { accuracyOf, type SessionOutcome } from '@/engine/progress'
import { useIsDesktop } from '@/lib/useIsDesktop'

/** Écran de fin de session : score et XP gagnés. */
export function SessionResult({
  outcome,
  passed,
  xp,
  deferred = 0,
  onContinue,
  onNext,
  onRetry,
}: {
  outcome: SessionOutcome
  passed: boolean
  xp: number
  /** Cartes remises à plus tard pendant la séance : rappelées ici, pour qu'on sache où les retrouver. */
  deferred?: number
  onContinue: () => void
  /** Enchaîne sur l'étape suivante, quand il y en a une dans le parcours. */
  onNext?: () => void
  onRetry: () => void
}) {
  const accuracy = Math.round(accuracyOf(outcome) * 100)
  const isDesktop = useIsDesktop()

  // Même raccourci que `RuleNote`/`SessionPause` : Entrée déclenche l'action
  // principale (« Étape suivante » si elle existe, sinon « Continuer »),
  // réservé à l'ordinateur.
  const primary = passed && onNext ? onNext : onContinue
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      event.preventDefault()
      primary()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, primary])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10 text-center [&>*]:shrink-0">
      <h1 className="text-3xl font-black">{passed ? 'Bien joué !' : 'Presque…'}</h1>
      <p className="max-w-xs text-sm text-ink-soft">
        {passed
          ? 'Ces mots reviendront au bon moment dans vos révisions.'
          : `${accuracy} % de bonnes réponses au premier essai.`}
      </p>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <Stat label="Réussite" value={`${accuracy} %`} tone="text-teal" />
        <Stat label="XP gagnés" value={`+${xp}`} tone="text-amber" icon />
      </div>

      {deferred > 0 && (
        <p className="max-w-xs text-sm font-bold text-ink-soft">
          {deferred === 1
            ? "Une carte remise à plus tard : elle vous attend au rattrapage, avant la séance finale de l'unité."
            : `${deferred} cartes remises à plus tard : elles vous attendent au rattrapage, avant la séance finale de l'unité.`}
        </p>
      )}

      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        {/* Enchaîner est l'envie naturelle après une session réussie : c'est
            donc l'action principale, et non un retour à la liste où il
            faudrait retrouver sa place à la main. « Étape » et non « leçon » :
            la suite du parcours peut être une révision. */}
        {passed && onNext ? (
          <>
            <Button block onClick={onNext}>
              Étape suivante
            </Button>
            <Button block tone="neutral" onClick={onContinue}>
              Retour à l'accueil
            </Button>
          </>
        ) : (
          <Button block onClick={onContinue}>
            Continuer
          </Button>
        )}
        {!passed && (
          <Button block tone="neutral" onClick={onRetry}>
            Recommencer
          </Button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone: string; icon?: boolean }) {
  return (
    <div className="card-3d flex flex-col items-center gap-1 px-4 py-4">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</span>
      <span className={`flex items-center gap-1 text-2xl font-black ${tone}`}>
        {icon && <BoltIcon size={20} />}
        {value}
      </span>
    </div>
  )
}
