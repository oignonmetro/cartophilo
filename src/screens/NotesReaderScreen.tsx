import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { CloseIcon } from '@/components/icons'
import { RuleNote } from '@/components/session/RuleNote'
import { useCourse } from '@/content/CourseProvider'
import { findUnit } from '@/content/course'
import { unitFiches } from '@/engine/fiches'
import { useIsDesktop } from '@/lib/useIsDesktop'

/**
 * Lecteur de fiches : les rappels de cours d'une unité, un à un, dans l'ordre,
 * quelle que soit la progression — rien n'est verrouillé et rien n'est noté.
 * Flèches ← → au clavier sur ordinateur ; le menu saute directement à une fiche.
 */
export function NotesReaderScreen() {
  const { unitId = '' } = useParams()
  const navigate = useNavigate()
  const { course } = useCourse()
  const isDesktop = useIsDesktop()

  const unit = useMemo(() => findUnit(course, unitId), [course, unitId])
  const fiches = useMemo(() => (unit ? unitFiches(unit) : []), [unit])
  const [index, setIndex] = useState(0)
  const last = fiches.length - 1

  const go = (to: number) => setIndex(Math.min(last, Math.max(0, to)))

  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'SELECT' || target.tagName === 'INPUT')) return
      if (event.key === 'ArrowRight') setIndex((n) => Math.min(last, n + 1))
      else if (event.key === 'ArrowLeft') setIndex((n) => Math.max(0, n - 1))
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, last])

  if (!unit) return <Navigate to="/" replace />

  const fiche = fiches[index]

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col overflow-hidden md:max-w-3xl"
      style={{ height: 'var(--app-vh, 100dvh)' }}
    >
      <header className="flex items-center gap-3 px-4 py-3 md:py-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Fermer les fiches"
          className="rounded-full p-2 text-ink-faint transition-colors hover:text-ink"
        >
          <CloseIcon size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-extrabold">{unit.title}</p>
          {fiches.length > 0 && (
            <select
              value={index}
              onChange={(event) => go(Number(event.target.value))}
              aria-label="Aller à une fiche"
              className="mt-0.5 w-full max-w-full truncate bg-transparent text-xs text-ink-soft outline-none"
            >
              {fiches.map((each, position) => (
                <option key={each.id} value={position}>
                  {position + 1}. {each.title}
                </option>
              ))}
            </select>
          )}
        </div>
        {fiches.length > 0 && (
          <span className="shrink-0 text-xs font-black text-ink-faint">
            {index + 1} / {fiches.length}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
        {fiche ? (
          <RuleNote
            key={fiche.id}
            exercise={fiche}
            onNext={() => go(index + 1)}
            footer={
              <div className="flex gap-3">
                <Button tone="neutral" disabled={index === 0} onClick={() => go(index - 1)} className="flex-1">
                  Précédente
                </Button>
                <Button
                  tone="violet"
                  onClick={() => (index === last ? navigate(-1) : go(index + 1))}
                  className="flex-1"
                >
                  {index === last ? 'Terminer' : 'Suivante'}
                </Button>
              </div>
            }
          />
        ) : (
          <p className="py-16 text-center text-sm text-ink-faint">Cette unité n'a pas de fiche à lire.</p>
        )}
      </div>
    </div>
  )
}
