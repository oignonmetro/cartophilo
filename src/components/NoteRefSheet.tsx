import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCourse } from '@/content/CourseProvider'
import { findUnit } from '@/content/course'
import { leadSentence, plainInline } from '@/content/notes'
import type { TreatiseEntry, Unit } from '@/content/schema'
import { ENNEAD_NUMERALS } from '@/engine/treatises'
import { NoteBlocks, TONES, Rich } from '@/components/session/RuleNote'
import { NoteRefContext, treatiseChrono, type NoteRef, type NoteTarget } from './noteRef'

/**
 * Les renvois d'un rappel ouvrent leur cible en feuille depuis le bas,
 * par-dessus l'écran en cours : une leçon n'est pas sauvegardée en route, la
 * quitter pour lire une autre fiche en ferait perdre la séance. Un renvoi
 * `[[g-vie|la vie]]` ouvre l'entrée visée ; un renvoi `[[traite53|traité 53]]`
 * ouvre le résumé du traité, celui de sa fiche dans la piste Repérage, d'où
 * l'on peut ouvrir son cours. Un renvoi suivi depuis la feuille y remplace ce
 * qui est affiché ; « Retour » revient au précédent.
 */
export function NoteRefProvider({ children }: { children: ReactNode }) {
  const { course } = useCourse()
  const [stack, setStack] = useState<string[]>([])

  const treatises = useMemo(() => {
    const byChrono = new Map<number, TreatiseEntry>()
    if (course.layout === 'library') {
      for (const track of course.tracks) for (const entry of track.entries ?? []) byChrono.set(entry.chrono, entry)
    }
    return byChrono
  }, [course])

  const resolve = useCallback(
    (target: string): NoteTarget | null => {
      const chrono = treatiseChrono(target)
      const entry = chrono === null ? undefined : treatises.get(chrono)
      if (entry) return { kind: 'treatise', hint: treatiseLabel(entry) }
      const unit = findUnit(course, target)
      if (!unit) return null
      const notes = unit.lessons.find((lesson) => 'notes' in lesson && lesson.notes)
      // La définition est la première phrase du rappel ; à défaut, le sous-titre.
      const lead = notes && 'notes' in notes && notes.notes ? leadSentence(notes.notes) : ''
      return { kind: 'unit', hint: lead || plainInline(unit.subtitle ?? '') }
    },
    [course, treatises],
  )
  const open = useCallback((target: string) => setStack((current) => [...current, target]), [])
  const ref = useMemo<NoteRef>(() => ({ resolve, open }), [resolve, open])

  const top = stack[stack.length - 1]
  const chrono = top === undefined ? null : treatiseChrono(top)
  const entry = chrono === null ? undefined : treatises.get(chrono)
  const unit = top === undefined || entry ? null : findUnit(course, top)
  const back = () => setStack((current) => current.slice(0, -1))
  const close = () => setStack([])

  return (
    <NoteRefContext.Provider value={ref}>
      {children}
      <AnimatePresence>
        {(entry || unit) && (
          <Sheet key="note-ref" canGoBack={stack.length > 1} onBack={back} onClose={close}>
            {entry ? (
              <TreatiseView entry={entry} onOpenUnit={entry.unit ? () => open(entry.unit!) : undefined} />
            ) : (
              <UnitView unit={unit!} />
            )}
          </Sheet>
        )}
      </AnimatePresence>
    </NoteRefContext.Provider>
  )
}

/** « I, 1 : Qu'est-ce que le vivant ? », comme dans l'index des traités. */
function treatiseLabel(entry: TreatiseEntry): string {
  return `${ENNEAD_NUMERALS[entry.ennead - 1]}, ${entry.numberInEnnead} : ${entry.title}`
}

function Sheet({
  canGoBack,
  onBack,
  onClose,
  children,
}: {
  canGoBack: boolean
  onBack: () => void
  onClose: () => void
  children: ReactNode
}) {
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
        {children}
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

/** Le résumé d'un traité, tel que le montre sa fiche dans la piste Repérage. */
function TreatiseView({ entry, onOpenUnit }: { entry: TreatiseEntry; onOpenUnit?: () => void }) {
  const tone = TONES.grammar
  return (
    <>
      <h2 className="shrink-0 text-lg leading-tight font-extrabold text-ink">
        <span className={`font-black ${tone.eyebrow}`}>
          {ENNEAD_NUMERALS[entry.ennead - 1]}, {entry.numberInEnnead} [{entry.chrono}]
        </span>{' '}
        <span className="text-ink-faint">:</span> <em>{entry.title}</em>
      </h2>
      {/* La clé remet le défilement en haut quand un renvoi change de cible. */}
      <div key={entry.id} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {entry.summary ? (
          <NoteBlocks notes={entry.summary} tone={tone} />
        ) : (
          <p className="text-sm text-ink-faint">Résumé à venir.</p>
        )}
      </div>
      {onOpenUnit && (
        <button
          type="button"
          onClick={onOpenUnit}
          className="shrink-0 rounded-2xl border-2 border-violet-deep bg-violet py-3 text-center font-extrabold text-white"
        >
          Lire le cours
        </button>
      )}
    </>
  )
}

function UnitView({ unit }: { unit: Unit }) {
  const tone = TONES.grammar
  const notes = unit.lessons.flatMap((lesson) => ('notes' in lesson && lesson.notes ? [lesson.notes] : []))
  return (
    <>
      <header className="shrink-0">
        <h2 className="text-lg leading-tight font-extrabold text-ink"><Rich text={unit.title} /></h2>
        {unit.subtitle && <p className="mt-0.5 text-xs text-ink-soft"><Rich text={unit.subtitle} /></p>}
      </header>
      <div key={unit.id} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {unit.intro && <NoteBlocks notes={unit.intro} tone={tone} />}
        {notes.map((text, index) => (
          <div key={index} className={`flex flex-col gap-3 ${index > 0 ? 'border-t-2 border-line pt-4' : ''}`}>
            <NoteBlocks notes={text} tone={tone} />
          </div>
        ))}
      </div>
    </>
  )
}
