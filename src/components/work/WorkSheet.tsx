import { motion } from 'framer-motion'
import type { Unit, WorkNode } from '@/content/schema'
import type { CardState } from '@/engine/srs'
import { masteryOf } from '@/engine/progress'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { WorkTree } from './WorkTree'

/**
 * La carte d'une unité-œuvre, en feuille depuis le bas (même mécanique que le
 * texte intégral d'une unité de texte, voir `TextSheet`) : le plan de chaque
 * livre, consultable à tout moment hors de tout exercice.
 *
 * Chaque chapitre y prend la couleur de ce qui en est su : on voit d'un coup
 * d'œil quelle partie de l'œuvre tient et laquelle se confond encore.
 */
export function WorkSheet({
  unit,
  cards,
  onClose,
}: {
  unit: Unit
  cards: Record<string, CardState>
  onClose: () => void
}) {
  const isDesktop = useIsDesktop()
  const work = unit.work
  if (!work) return null

  const leafBorder = (node: WorkNode) => {
    const mastery = masteryOf(
      node.points.map((point) => point.id),
      cards,
    )
    if (mastery.total > 0 && mastery.known === mastery.total) return 'border-success'
    if (mastery.seen > 0) return 'border-amber'
    return undefined
  }

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
        className="flex max-h-[90dvh] w-full max-w-md flex-col gap-4 rounded-blob bg-paper p-5 md:max-w-5xl"
      >
        <header className="flex shrink-0 flex-col gap-2">
          <div>
            <h2 className="text-lg leading-tight font-extrabold text-ink">{unit.title}</h2>
            {unit.subtitle && <p className="mt-0.5 text-xs text-ink-soft">{unit.subtitle}</p>}
          </div>
          <Legend />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
          {work.parts.map((part) => (
            <section key={part.id} className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-black tracking-widest text-violet-deep uppercase">
                  {part.label}
                  {part.title && <span className="tracking-normal normal-case"> · {part.title}</span>}
                </p>
                {part.question && <p className="text-sm font-semibold text-ink-soft italic">{part.question}</p>}
              </div>
              <WorkTree work={work} root={part} layout={isDesktop ? 'chart' : 'vertical'} leafBorder={leafBorder} />
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

/**
 * La légende : les trois couleurs de maîtrise, et les deux traits du plan.
 * Le pointillé ne se devine pas seul : une ligne suffit à le dire une fois,
 * plutôt que de l'écrire sur chaque flèche.
 */
function Legend() {
  const items = [
    { className: 'border-success', label: 'su' },
    { className: 'border-amber', label: 'en cours' },
    { className: 'border-violet/40', label: 'pas encore vu' },
  ]
  return (
    <div className="flex flex-col gap-1.5 text-[0.7rem] font-bold text-ink-soft">
      <ul className="flex flex-wrap gap-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded border-2 ${item.className}`} />
            {item.label}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-3">
        <li className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden>
            <path d="M1 4 H20" className="stroke-violet" strokeWidth="2" />
          </svg>
          enchaînement
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden>
            <path d="M1 4 H20" className="stroke-violet" strokeWidth="1.8" strokeDasharray="5 4" />
          </svg>
          reprise d'une idée
        </li>
        <li>Touchez une case pour lire ses thèses.</li>
      </ul>
    </div>
  )
}
