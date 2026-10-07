import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { WorkNode } from '@/content/schema'
import type { WorkOrderExercise } from '@/engine/exercises'
import { workOrderItems } from '@/engine/exercises'
import { findNode, headlineOf, shortLabel } from '@/content/work'
import { Button } from '@/components/Button'
import { useSessionSounds } from '@/components/session/useSessionSounds'

/**
 * Remise en ordre : les étapes du raisonnement d'un livre, mélangées dans la
 * banque du bas, à toucher dans l'ordre. Chaque étape ne montre que ce
 * qu'elle affirme ; son emplacement (« chap. 4 ») ne se révèle qu'une fois
 * placée, sans quoi il suffirait de ranger des numéros.
 *
 * Même mécanique que le tableau à trous (voir `TableBank`) : pas de
 * glisser-déposer, et une erreur se signale aussitôt, la carte refusée
 * tremblant ; l'étape attendue compte alors manquée. Une fois tout placé, le
 * fil complet reste affiché, à relire d'un trait.
 */
export function WorkOrder({
  exercise,
  onDone,
}: {
  exercise: WorkOrderExercise
  onDone: (result: { missedIds: string[] }) => void
}) {
  const sounds = useSessionSounds()
  const [placed, setPlaced] = useState(0)
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<number | null>(null)
  const end = useRef<HTMLDivElement>(null)

  const steps = exercise.steps.map((ids) => ids.map((id) => findNode(exercise.work, id)).filter((node): node is WorkNode => node !== null))
  const root = findNode(exercise.work, exercise.rootId)
  const done = placed === steps.length

  // La dernière étape placée reste en vue, au-dessus de la banque.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [placed])

  function pick(index: number) {
    if (done) return
    if (index === placed) {
      setPlaced(placed + 1)
      sounds.note(Math.min(placed, 7))
      return
    }
    setMissed((current) => new Set(current).add(placed))
    setWrong(index)
    window.setTimeout(() => setWrong(null), 350)
  }

  const remaining = exercise.bank.filter((index) => index >= placed)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-center text-sm font-bold tracking-wide text-ink-faint uppercase">
        {done ? 'Le fil du raisonnement' : 'Remettez le raisonnement dans l’ordre'}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-blob border-2 border-line bg-paper px-3 py-3 md:px-5">
        {root && <p className="mb-3 text-center text-xs font-black tracking-widest text-violet-deep uppercase">{root.label}</p>}
        {placed === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">Touchez l’étape par laquelle commence le raisonnement.</p>
        )}
        <ol className="flex flex-col items-center">
          {steps.slice(0, placed).map((step, index) => (
            <li key={index} className="flex w-full max-w-md flex-col items-center">
              {index > 0 && <span className="py-1 text-lg leading-none font-black text-violet" aria-hidden>↓</span>}
              <div
                className={`w-full rounded-xl border-2 px-3 py-2 text-center ${
                  missed.has(index) ? 'border-error/50' : 'border-success/50'
                }`}
              >
                <p className="text-xs font-black text-violet-deep">{stepLabel(step)}</p>
                <StepText step={step} />
              </div>
            </li>
          ))}
        </ol>
        <div ref={end} />
      </div>

      {done ? (
        <div className="shrink-0">
          <Button
            block
            tone={missed.size === 0 ? 'success' : 'violet'}
            onClick={() => onDone({ missedIds: workOrderItems(exercise, [...missed]) })}
          >
            Continuer
          </Button>
        </div>
      ) : (
        <div className="flex max-h-[42%] shrink-0 flex-col gap-2 overflow-y-auto md:max-h-[38%]">
          {remaining.map((index) => (
            <motion.button
              key={index}
              type="button"
              onClick={() => pick(index)}
              animate={wrong === index ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
              transition={{ duration: 0.3 }}
              className={`rounded-2xl border-2 px-3 py-2 text-center transition-colors ${
                wrong === index ? 'border-error bg-error/10' : 'border-line bg-paper hover:border-violet/60'
              }`}
            >
              <StepText step={steps[index] ?? []} />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

/** « chap. 4 », ou « chap. 1 à 3 » pour une étape qui réunit des chapitres de même plan. */
function stepLabel(step: readonly WorkNode[]): string {
  const first = step[0]
  const last = step[step.length - 1]
  if (!first || !last) return ''
  if (first === last) return shortLabel(first.label)
  return `${shortLabel(first.label)} à ${shortLabel(last.label).replace(/^chap\. /, '')}`
}

/** Ce que l'étape affirme : une ligne par chapitre qu'elle réunit. */
function StepText({ step }: { step: readonly WorkNode[] }) {
  return (
    <>
      {step.map((node) => (
        <p key={node.id} className="text-sm leading-snug font-bold text-ink">
          {headlineOf(node)}
        </p>
      ))}
    </>
  )
}
