import { motion } from 'framer-motion'
import { isPassageLesson } from '@/content/course'
import type { Unit } from '@/content/schema'
import { PassageText } from '@/components/PassageText'
import { NoteBlocks, TONES } from '@/components/session/RuleNote'

/**
 * Le texte intégral d'une unité de texte, en feuille depuis le bas (même
 * mécanique que la fiche d'un traité, voir `TreatiseSheet`) : l'introduction,
 * puis chaque paragraphe avec son repère et son intitulé, dans l'ordre.
 *
 * Consultable à tout moment depuis la bibliothèque, hors de tout exercice :
 * les leçons ne montrent un paragraphe qu'à sa découverte, alors qu'une
 * explication de texte se prépare aussi en relisant le texte d'un trait.
 */
export function TextSheet({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const tone = TONES.grammar
  // Les leçons d'introduction n'ont pas de paragraphe cité : le texte
  // intégral ne reprend que les autres.
  const passages = unit.lessons.filter(isPassageLesson).filter((lesson) => lesson.passage.text)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-end justify-center bg-scrim/40 p-4"
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
          <h2 className="text-lg leading-tight font-extrabold text-ink">{unit.title}</h2>
          {unit.subtitle && <p className="mt-0.5 text-xs text-ink-soft">{unit.subtitle}</p>}
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
          {unit.intro && (
            <section className="flex flex-col gap-3">
              <p className={`text-xs font-black tracking-widest uppercase ${tone.eyebrow}`}>Présentation</p>
              <NoteBlocks notes={unit.intro} tone={tone} />
            </section>
          )}
          {passages.map((lesson) => (
            <section key={lesson.id} className="flex flex-col gap-2">
              <h3 className="text-sm leading-snug font-extrabold text-ink">
                <span className={`font-black ${tone.eyebrow}`}>{lesson.passage.label}</span>{' '}
                <span className="text-ink-faint">·</span> {lesson.title}
              </h3>
              <PassageText text={lesson.passage.text ?? ''} />
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-2xl border-2 border-line py-3 text-center font-extrabold text-ink-soft"
        >
          Fermer
        </button>
      </motion.div>
    </motion.div>
  )
}
