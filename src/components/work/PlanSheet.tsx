import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { isWorkUnit } from '@/content/course'
import type { Unit } from '@/content/schema'
import { nodesOf } from '@/content/work'
import { NoteBlocks, TONES } from '@/components/session/RuleNote'

/**
 * Les rappels d'une unité-œuvre (`recaps`, voir content/oeuvres.md), en
 * feuille depuis le bas (même mécanique que `TextSheet`) : la présentation,
 * puis chaque partie de premier niveau (un livre) et ses rappels, dans
 * l'ordre du plan.
 *
 * Consultable à tout moment depuis la bibliothèque : les leçons ne montrent
 * un rappel qu'à la découverte, alors que le plan d'une œuvre se révise aussi
 * en relisant ses résumés d'un trait.
 */
export function PlanSheet({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const tone = TONES.grammar
  const work = isWorkUnit(unit) ? unit.work : null
  const parts = (work?.parts ?? [])
    .map((part) => {
      const order = nodesOf(part).map((node) => node.id)
      const recaps = (work?.recaps ?? [])
        .filter((recap) => order.includes(recap.at))
        .sort((a, b) => order.indexOf(a.at) - order.indexOf(b.at))
      return { part, recaps }
    })
    .filter((entry) => entry.recaps.length > 0)

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
          {parts.map(({ part, recaps }) => (
            <Fragment key={part.id}>
              {/* Chaque livre s'annonce d'un repère, comme chaque ouvrage dans `TextSheet`. */}
              <p
                className={`-mb-2 border-t-2 border-line pt-4 text-xs font-black tracking-widest uppercase ${tone.eyebrow}`}
              >
                {part.title ? `${part.label} · ${part.title}` : part.label}
              </p>
              {recaps.map((recap) => (
                <section key={recap.at} className="flex flex-col gap-2">
                  <h3 className="text-sm leading-snug font-extrabold text-ink">
                    <span className={`font-black ${tone.eyebrow}`}>{recap.label}</span>{' '}
                    <span className="text-ink-faint">·</span> {recap.title}
                  </h3>
                  <NoteBlocks notes={recap.notes} tone={tone} />
                </section>
              ))}
            </Fragment>
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
