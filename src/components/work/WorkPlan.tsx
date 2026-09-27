import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { WorkNode } from '@/content/schema'
import type { WorkPlanExercise } from '@/engine/exercises'
import { workNodeItems } from '@/engine/exercises'
import { findNode, planTextOf } from '@/content/work'
import { Button } from '@/components/Button'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useSessionSounds } from '@/components/session/useSessionSounds'
import { WorkTree } from './WorkTree'

/**
 * Plan à trous : le schéma d'une partie de l'œuvre, vidé de son texte (restent
 * les bulles, leurs questions, les numéros des chapitres), où replacer ce que
 * disent les chapitres d'un même niveau (voir `planRoundsOf`). Ce qu'on
 * replace est l'argument de chaque chapitre (« car … », voir `planTextOf`) :
 * plus court que ses thèses, et ce qui compte pour suivre le raisonnement.
 *
 * On touche une case vide, puis le texte qui lui revient ; jamais de
 * glisser-déposer, peu fiable au doigt sur un schéma qui défile. Une case est
 * toujours active (la première vide, par défaut, puis la suivante dans
 * l'ordre du plan) : le plus souvent, on n'a qu'à toucher des textes. Une
 * erreur se signale aussitôt, comme dans l'association de paires (voir
 * `PairBoard`) : le texte refusé tremble, et la case comme le chapitre du
 * texte sont comptés manqués pour la révision espacée. Une fois tout replacé,
 * le schéma reste affiché, à relire d'un trait.
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
  const holes = new Set(exercise.holes)

  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<string | null>(exercise.holes[0] ?? null)
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string | null>(null)
  const slots = useRef(new Map<string, HTMLElement>())

  const done = solved.size === exercise.holes.length

  // La case active doit rester à l'écran : sur un schéma long, elle peut
  // tomber hors de la partie visible.
  useEffect(() => {
    if (active) slots.current.get(active)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
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

  function renderLeaf(node: WorkNode) {
    if (!holes.has(node.id)) return null
    if (solved.has(node.id)) {
      return <p className="rounded-md bg-success/12 px-1 py-0.5 text-sm leading-snug text-ink-soft">{planTextOf(node)}</p>
    }
    const isActive = active === node.id
    return (
      <button
        type="button"
        ref={(element) => {
          if (element) slots.current.set(node.id, element)
          else slots.current.delete(node.id)
        }}
        onClick={() => setActive(node.id)}
        aria-label="Case vide"
        aria-pressed={isActive}
        className={`flex min-h-10 w-full max-w-60 items-center justify-center rounded-lg border-2 border-dashed px-3 py-2 text-center text-xs font-black transition-colors ${
          isActive ? 'border-violet bg-violet/12 text-violet-deep' : 'border-line bg-cream/60 text-ink-faint'
        }`}
      >
        {isActive ? 'Que dit ce chapitre ?' : '?'}
      </button>
    )
  }

  if (!root) return null
  const remaining = exercise.bank.filter((id) => !solved.has(id))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-center text-sm font-bold tracking-wide text-ink-faint uppercase">
        {done ? 'Le schéma complété' : 'Replacez ce que disent les chapitres'}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-blob border-2 border-line bg-paper px-3 py-3 md:px-5">
        <p className="mb-3 text-center text-xs font-black tracking-widest text-violet-deep uppercase">{root.label}</p>
        <WorkTree
          work={exercise.work}
          root={root}
          layout={isDesktop ? 'chart' : 'vertical'}
          mode="plan"
          renderLeaf={renderLeaf}
        />
      </div>

      {done ? (
        <div className="shrink-0">
          <Button
            block
            tone={missed.size === 0 ? 'success' : 'violet'}
            onClick={() => onDone({ missedIds: workNodeItems(exercise.work, [...missed]) })}
          >
            Continuer
          </Button>
        </div>
      ) : (
        <div className="flex max-h-[38%] shrink-0 flex-col gap-2 overflow-y-auto md:max-h-[34%]">
          {remaining.map((id) => {
            const node = findNode(exercise.work, id)
            if (!node) return null
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => place(id)}
                animate={wrong === id ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-2xl border-2 px-3 py-2 text-center text-sm leading-snug text-ink transition-colors ${
                  wrong === id ? 'border-error bg-error/10' : 'border-line bg-paper hover:border-violet/60'
                }`}
              >
                {planTextOf(node)}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
