import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { CloseIcon } from '@/components/icons'
import { SideHeading, SidePanel, SIDE_ITEM, SIDE_ITEM_IDLE } from '@/components/Sidebar'
import { Rich, RuleNote } from '@/components/session/RuleNote'
import { useCourse } from '@/content/CourseProvider'
import { findUnit } from '@/content/course'
import { unitFiches } from '@/engine/fiches'
import { useIsDesktop } from '@/lib/useIsDesktop'

/**
 * Lecteur de fiches : les rappels de cours d'une unité, un à un, dans l'ordre,
 * quelle que soit la progression — rien n'est verrouillé et rien n'est noté.
 * Flèches ← → au clavier sur ordinateur ; le menu (une liste dans le panneau
 * latéral sur ordinateur) saute directement à une fiche.
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

  // La liste du panneau suit la fiche affichée quand on avance au clavier.
  const current = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!unit) return <Navigate to="/" replace />

  const fiche = fiches[index]

  return (
    <div className="flex overflow-hidden" style={{ height: 'var(--app-vh, 100dvh)' }}>
      <SidePanel label="Fiches de l'unité">
        <button type="button" onClick={() => navigate(-1)} className={`${SIDE_ITEM} ${SIDE_ITEM_IDLE}`}>
          <span className="flex w-6 justify-center">
            <CloseIcon size={20} />
          </span>
          Fermer les fiches
        </button>
        <p className="px-3 text-base leading-tight font-black">
          <Rich text={unit.title} />
        </p>
        {fiches.length > 0 && (
          <nav aria-label="Fiches">
            <SideHeading>
              Fiche {index + 1} / {fiches.length}
            </SideHeading>
            {fiches.map((each, position) => (
              <button
                key={each.id}
                ref={position === index ? current : undefined}
                type="button"
                // Sans `blur`, Entrée ou les flèches resteraient pris par ce bouton.
                onClick={(event) => {
                  event.currentTarget.blur()
                  go(position)
                }}
                aria-current={position === index ? 'step' : undefined}
                className={`${SIDE_ITEM} items-baseline ${
                  position === index ? 'border-violet bg-violet/10 text-violet' : SIDE_ITEM_IDLE
                }`}
              >
                <span className="w-6 shrink-0 text-center text-xs">{position + 1}</span>
                <span className="flex-1 leading-snug">{each.title}</span>
              </button>
            ))}
          </nav>
        )}
      </SidePanel>
      <div className="mx-auto flex h-full w-full max-w-md min-w-0 flex-col overflow-hidden md:max-w-3xl lg:max-w-[52rem] lg:pt-6">
        <header className="flex items-center gap-3 px-4 py-3 md:py-5 lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Fermer les fiches"
            className="rounded-full p-2 text-ink-faint transition-colors hover:text-ink"
          >
            <CloseIcon size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-extrabold">
              <Rich text={unit.title} />
            </p>
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
    </div>
  )
}
