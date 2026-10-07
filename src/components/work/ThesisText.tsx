import type { GrammarPoint } from '@/content/schema'
import { thesisFills } from '@/content/work'
import { RichGaps } from '@/components/session/RuleNote'

/** Une thèse telle qu'on la lit : la phrase complète, ce qui en remplit les trous mis en valeur. */
export function ThesisText({ point }: { point: GrammarPoint }) {
  const fills = thesisFills(point)
  return (
    <RichGaps
      text={point.sentence}
      renderGap={(index) => (
        <span className="font-black text-violet-deep underline decoration-violet/40 decoration-2 underline-offset-[3px]">
          {fills[index] ?? ''}
        </span>
      )}
    />
  )
}
