import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Fenêtre modale de l'éditeur : remplace les `window.prompt` en chaîne par un
 * seul formulaire, qu'on relit avant de valider. Échap ferme, Entrée valide
 * (sauf dans une zone de texte, où elle passe à la ligne), et le premier champ
 * reçoit le focus à l'ouverture.
 */
export function Modal({
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitDisabled,
  busy,
  error,
  wide,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  onSubmit?: () => void
  submitLabel?: string
  submitDisabled?: boolean
  busy?: boolean
  error?: string | null
  /** Fenêtre large, pour le découpage d'une liste. */
  wide?: boolean
  children: ReactNode
  /** Contenu à gauche des boutons, dans le pied de la fenêtre. */
  footer?: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true })
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault()
          if (!submitDisabled && !busy) onSubmit?.()
        }}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-2xl border-2 border-line bg-paper shadow-2xl ${
          wide ? 'h-[88vh] max-w-6xl' : 'max-w-xl'
        }`}
      >
        <header className="flex items-center justify-between border-b-2 border-line px-5 py-3">
          <h2 className="text-base font-black">{title}</h2>
          <button type="button" onClick={onClose} title="Fermer (Échap)" className="px-1 text-ink-faint hover:text-ink">
            ✕
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex items-center gap-3 border-t-2 border-line px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-xs text-ink-soft">
            {error ? <span className="font-bold text-error">Erreur : {error}</span> : footer}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-line px-3 py-1.5 text-sm font-bold text-ink-soft"
          >
            Annuler
          </button>
          {onSubmit && (
            <button
              type="submit"
              disabled={submitDisabled || busy}
              className="rounded-lg border-2 border-teal-deep bg-teal px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? '…' : submitLabel ?? 'Valider'}
            </button>
          )}
        </footer>
      </form>
    </div>
  )
}

/** Un champ étiqueté, avec une aide facultative en dessous. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-black tracking-wide text-ink-soft uppercase">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'rounded-lg border-2 border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-teal'
