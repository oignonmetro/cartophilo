import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GrammarPoint } from '@/content/schema'
import type { WorkPlanExercise } from '@/engine/exercises'
import { findNode, pointsOf } from '@/content/work'
import { Button } from '@/components/Button'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useSessionSounds } from '@/components/session/useSessionSounds'
import { ThesisText, WorkTree } from './WorkTree'

/**
 * Plan à trous : le plan d'une partie de l'œuvre, certaines thèses retirées,
 * à replacer depuis la banque du bas.
 *
 * On touche une case vide, puis la thèse qui lui revient ; jamais de
 * glisser-déposer, peu fiable au doigt sur un plan qui défile. Une case est
 * toujours active (la première vide, par défaut, puis la suivante dans
 * l'ordre du plan) : le plus souvent, on n'a qu'à toucher des thèses. Une
 * erreur se signale aussitôt, comme dans l'association de paires (voir
 * `PairBoard`) : la thèse refusée tremble, et la case comme la thèse sont
 * comptées manquées pour la révision espacée. Une fois tout replacé, le plan
 * complet reste affiché : c'est le moment de le relire d'un trait.
 */
export function WorkPlan({
  exercise,
  onDone,
}: {
  exercise: WorkPlanExercise
  onDone: (result: { missedIds: string[] }) => void
}) {
  const isDesktop = useIsDesktop()
  const sounds = useSessionSounds()
  const root = findNode(exercise.work, exercise.rootId)
  const points = useMemo(() => new Map((root ? pointsOf(root) : []).map((point) => [point.id, point])), [root])
  const holes = useMemo(() => new Set(exercise.holes), [exercise.holes])

  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<string | null>(exercise.holes[0] ?? null)
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string | null>(null)
  const slots = useRef(new Map<string, HTMLElement>())

  const done = solved.size === exercise.holes.length

  // La case active doit rester à l'écran : sur un plan long, la suivante peut
  // tomber hors de la partie visible.
  useEffect(() => {
    if (active) slots.current.get(active)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])

  function nextHole(after: string, solvedNow: Set<string>): string | null {
    const order = exercise.holes
    const start = order.indexOf(after)
    const rotated = [...order.slice(start + 1), ...order.slice(0, start + 1)]
    return rotated.find((id) => !solvedNow.has(id)) ?? null
  }

  function place(cardId: string) {
    if (!active || done) return
    if (cardId === active) {
      const next = new Set(solved).add(cardId)
      setSolved(next)
      sounds.note(Math.min(next.size - 1, 7))
      setActive(nextHole(cardId, next))
      return
    }
    setMissed((current) => new Set(current).add(active).add(cardId))
    setWrong(cardId)
    window.setTimeout(() => setWrong(null), 350)
  }

  function renderPoint(point: GrammarPoint) {
    if (!holes.has(point.id) || solved.has(point.id)) {
      const justPlaced = holes.has(point.id)
      return (
        <span className={justPlaced ? 'rounded-md bg-success/12 px-1 py-0.5' : undefined}>
          <ThesisText point={point} />
        </span>
      )
    }
    const isActive = active === point.id
    return (
      <button
        type="button"
        ref={(element) => {
          if (element) slots.current.set(point.id, element)
          else slots.current.delete(point.id)
        }}
        onClick={() => setActive(point.id)}
        aria-label="Case vide"
        aria-pressed={isActive}
        className={`block min-h-9 w-full rounded-xl border-2 border-dashed text-center text-xs font-black transition-colors ${
          isActive ? 'border-violet bg-violet/12 text-violet-deep' : 'border-line bg-cream/60 text-ink-faint'
        }`}
      >
        {isActive ? 'Quelle thèse ici ?' : '?'}
      </button>
    )
  }

  if (!root) return null
  const remaining = exercise.bank.filter((id) => !solved.has(id))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-center text-sm font-bold tracking-wide text-ink-faint uppercase">
        {done ? 'Le plan complet' : 'Replacez les thèses'}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-blob border-2 border-line bg-paper px-3 py-3 md:px-5">
        <p className="mb-2 text-xs font-black tracking-widest text-violet-deep uppercase">
          {root.label}
          {root.title && <span className="tracking-normal normal-case"> · {root.title}</span>}
        </p>
        <WorkTree
          work={exercise.work}
          root={root}
          layout={isDesktop ? 'chart' : 'vertical'}
          mode="plan"
          renderPoint={renderPoint}
        />
      </div>

      {done ? (
        <div className="shrink-0">
          <Button block tone={missed.size === 0 ? 'success' : 'violet'} onClick={() => onDone({ missedIds: [...missed] })}>
            Continuer
          </Button>
        </div>
      ) : (
        <div className="flex max-h-[38%] shrink-0 flex-col gap-2 overflow-y-auto md:max-h-[34%]">
          {remaining.map((id) => {
            const point = points.get(id)
            if (!point) return null
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => place(id)}
                animate={wrong === id ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-2xl border-2 px-3 py-2 text-left text-sm leading-snug transition-colors ${
                  wrong === id ? 'border-error bg-error/10' : 'border-line bg-paper hover:border-violet/60'
                }`}
              >
                <ThesisText point={point} />
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
