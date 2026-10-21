import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCourse } from '@/content/CourseProvider'
import { findUnit } from '@/content/course'
import type { Unit } from '@/content/schema'
import { NoteBlocks, TONES, Rich } from '@/components/session/RuleNote'
import { NoteRefContext, type NoteRef } from './noteRef'

/**
 * Les renvois du glossaire (`[[g-vie|la vie]]` dans un rappel) ouvrent
 * l'entrée visée en feuille depuis le bas, par-dessus l'écran en cours :
 * une leçon n'est pas sauvegardée en route, la quitter pour lire une autre
 * fiche en ferait perdre la séance. Un renvoi suivi depuis la feuille y
 * remplace l'entrée affichée ; « Retour » revient à la précédente.
 */
export function NoteRefProvider({ children }: { children: ReactNode }) {
  const { course } = useCourse()
  const [stack, setStack] = useState<string[]>([])

  const exists = useCallback((unitId: string) => findUnit(course, unitId) !== null, [course])
  const open = useCallback((unitId: string) => setStack((current) => [...current, unitId]), [])
  const ref = useMemo<NoteRef>(() => ({ exists, open }), [exists, open])

  const unit = stack.length ? findUnit(course, stack[stack.length - 1]!) : null

  return (
    <NoteRefContext.Provider value={ref}>
      {children}
      <AnimatePresence>
        {unit && (
          <NoteRefSheet
            unit={unit}
            canGoBack={stack.length > 1}
            onBack={() => setStack((current) => current.slice(0, -1))}
            onClose={() => setStack([])}
          />
        )}
      </AnimatePresence>
    </NoteRefContext.Provider>
  )
}

function NoteRefSheet({
  unit,
  canGoBack,
  onBack,
  onClose,
}: {
  unit: Unit
  canGoBack: boolean
  onBack: () => void
  onClose: () => void
}) {
  const tone = TONES.grammar
  const notes = unit.lessons.flatMap((lesson) => ('notes' in lesson && lesson.notes ? [lesson.notes] : []))

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end justify-center bg-scrim/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-md flex-col gap-4 rounded-blob bg-paper p-5 md:max-w-2xl"
      >
        <header className="shrink-0">
          <h2 className="text-lg leading-tight font-extrabold text-ink"><Rich text={unit.title} /></h2>
          {unit.subtitle && <p className="mt-0.5 text-xs text-ink-soft"><Rich text={unit.subtitle} /></p>}
        </header>

        {/* La clé remet le défilement en haut quand un renvoi change d'entrée. */}
        <div key={unit.id} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {unit.intro && <NoteBlocks notes={unit.intro} tone={tone} />}
          {notes.map((text, index) => (
            <div key={index} className={`flex flex-col gap-3 ${index > 0 ? 'border-t-2 border-line pt-4' : ''}`}>
              <NoteBlocks notes={text} tone={tone} />
            </div>
          ))}
        </div>

        <div className="flex shrink-0 gap-3">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-2xl border-2 border-line py-3 text-center font-extrabold text-ink-soft"
            >
              Retour
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-line py-3 text-center font-extrabold text-ink-soft"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
