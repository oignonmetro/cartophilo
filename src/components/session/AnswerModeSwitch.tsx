import type { AnswerMode } from '@/store/progressStore'

/**
 * Choix entre écrire la réponse et la révéler puis s'auto-évaluer, partagé
 * par toute carte à trou qui offre les deux (voir `PassageCard`,
 * `GrammarGap`). Désactivé une fois la carte répondue : changer d'avis après
 * coup n'aurait plus de sens.
 */
export function AnswerModeSwitch({
  mode,
  disabled,
  onChange,
}: {
  mode: AnswerMode
  disabled: boolean
  onChange: (mode: AnswerMode) => void
}) {
  const options = [
    { id: 'reveal', label: 'Révéler' },
    { id: 'write', label: 'Écrire' },
  ] as const
  return (
    <div role="radiogroup" aria-label="Mode de réponse" className="flex shrink-0 rounded-full border-2 border-line p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={mode === option.id}
          disabled={disabled}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors disabled:opacity-60 ${
            mode === option.id ? 'bg-violet text-white' : 'text-ink-faint hover:text-ink-soft'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
