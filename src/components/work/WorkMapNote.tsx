import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { WorkMapExercise } from '@/engine/exercises'
import { findNode } from '@/content/work'
import { Button } from '@/components/Button'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { WorkTree } from './WorkTree'

/**
 * Le plan d'une partie de l'œuvre, à lire avant de s'y exercer : pendant du
 * rappel de cours (`RuleNote`) pour une leçon d'unité-œuvre, même gabarit
 * (carte qui défile, bouton toujours visible en dessous).
 */
export function WorkMapNote({ exercise, onNext }: { exercise: WorkMapExercise; onNext: () => void }) {
  const isDesktop = useIsDesktop()
  const root = findNode(exercise.work, exercise.rootId)

  // Entrée enchaîne sur les exercices, comme dans `RuleNote`.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      event.preventDefault()
      onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, onNext])

  if (!root) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-center text-xs font-black tracking-widest text-violet uppercase">Le plan</p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card-3d mx-auto flex w-full flex-col gap-4 px-4 py-5 md:px-6 md:py-6"
        >
          <header className="flex flex-col gap-3">
            <span className="h-1.5 w-10 rounded-full bg-violet" />
            <h2 className="text-2xl leading-tight font-black text-balance md:text-3xl">
              {root.label}
              {root.title && <span className="text-ink-soft"> : {root.title}</span>}
            </h2>
            {root.question && <p className="text-sm font-semibold text-ink-soft italic">{root.question}</p>}
          </header>
          <p className="-mt-2 text-xs font-bold text-ink-faint">Touchez une case pour lire ses thèses.</p>
          <WorkTree work={exercise.work} root={root} layout={isDesktop ? 'chart' : 'vertical'} />
        </motion.div>
      </div>

      <div className="w-full shrink-0 pt-1">
        <Button block tone="violet" onClick={onNext}>
          C'est parti
        </Button>
      </div>
    </div>
  )
}
