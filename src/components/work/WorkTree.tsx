import { Fragment, type ReactNode } from 'react'
import type { GrammarPoint, Work, WorkNode, WorkRelation } from '@/content/schema'
import { isLeaf, linksOf, RELATION_LABELS, thesisFills } from '@/content/work'
import { RichGaps } from '@/components/session/RuleNote'

/**
 * Le plan d'une partie d'une œuvre, dessiné à partir de son arbre (voir
 * `workSchema`) : la carte de l'œuvre, le plan lu avant une leçon et le plan
 * à trous partagent ce même rendu, seules les thèses changent de forme
 * (`renderPoint`).
 *
 * Deux dispositions :
 *   `vertical` (téléphone) : tout s'empile, les blocs se lisent à leur
 *              filet de gauche, et chaque relation s'affiche entre les deux
 *              parties qu'elle relie ;
 *   `chart`    (ordinateur) : un organigramme ; les chapitres d'un même bloc
 *              se rangent côte à côte, comme dans un schéma de manuel, et
 *              les blocs s'enchaînent de haut en bas.
 *
 * Chaque relation a sa signature, toujours la même : les parties de même
 * plan (`declinaison`) sont réunies sous un seul repère « même plan », sans
 * flèche, puisque rien ne s'y déduit de rien ; toutes les autres sont une
 * flèche nommée. Un lien entre parties éloignées (voir `workLinkSchema`) se
 * signale sous chacune des deux, puisqu'aucun trait ne peut les joindre.
 */

export type WorkTreeLayout = 'vertical' | 'chart'

interface TreeProps {
  work: Work
  layout: WorkTreeLayout
  /** Rendu d'une thèse ; par défaut, la phrase complète, sa réponse soulignée. */
  renderPoint?: (point: GrammarPoint) => ReactNode
  /** Classe de bordure d'un chapitre, pour colorer la carte selon la maîtrise. */
  leafBorder?: (node: WorkNode) => string | undefined
}

/** Le plan d'une partie, sans son propre en-tête : c'est l'écran qui le titre. */
export function WorkTree({ root, ...props }: TreeProps & { root: WorkNode }) {
  if (isLeaf(root)) return <LeafBox node={root} {...props} />
  return <Children node={root} {...props} />
}

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

function defaultPoint(point: GrammarPoint) {
  return <ThesisText point={point} />
}

/**
 * Des sous-parties côte à côte, dans l'organigramme : seulement des chapitres
 * (un bloc imbriqué ne tiendrait pas dans une colonne), et pas plus de quatre.
 */
function rowOf(node: WorkNode, layout: WorkTreeLayout): boolean {
  return layout === 'chart' && node.parts.length >= 2 && node.parts.length <= 4 && node.parts.every(isLeaf)
}

/** Toutes les sous-parties sont de même plan : un seul repère pour tout le groupe. */
function allParallel(node: WorkNode): boolean {
  return node.parts.slice(1).every((part) => part.rel === 'declinaison')
}

function Children(props: TreeProps & { node: WorkNode }) {
  const { node, layout } = props
  const parallel = node.parts.length > 1 && allParallel(node)

  if (rowOf(node, layout)) {
    return (
      <div className="flex flex-col gap-2">
        {parallel && <ParallelMark />}
        <div className="flex items-stretch gap-2">
          {node.parts.map((part) => (
            <Fragment key={part.id}>
              {part.rel && !parallel && <SideConnector rel={part.rel} />}
              <div className="min-w-0 flex-1">
                <PartView {...props} node={part} />
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {parallel && <ParallelMark />}
      {node.parts.map((part, index) => (
        <Fragment key={part.id}>
          {index > 0 && (parallel ? <div className="h-2" /> : <DownConnector rel={part.rel} />)}
          <PartView {...props} node={part} />
        </Fragment>
      ))}
    </div>
  )
}

function PartView(props: TreeProps & { node: WorkNode }) {
  return isLeaf(props.node) ? <LeafBox {...props} /> : <GroupBox {...props} />
}

/** Un bloc de chapitres : son emplacement, la question à laquelle il répond, puis ses parties. */
function GroupBox(props: TreeProps & { node: WorkNode }) {
  const { node, work } = props
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-l-4 border-violet/50 bg-violet/5 py-2.5 pr-2 pl-3">
      <header className="flex flex-col gap-0.5">
        <p className="text-xs font-black tracking-widest text-violet-deep uppercase">
          {node.label}
          {node.title && <span className="font-bold tracking-normal normal-case"> · {node.title}</span>}
        </p>
        {node.question && <p className="text-sm leading-snug font-semibold text-ink-soft italic">{node.question}</p>}
      </header>
      {node.points.length > 0 && <Theses {...props} />}
      <Children {...props} />
      <FarLinks work={work} node={node} />
    </section>
  )
}

/** Un chapitre : son emplacement, son titre, ses thèses. */
function LeafBox(props: TreeProps & { node: WorkNode }) {
  const { node, work, leafBorder } = props
  return (
    <section
      className={`flex h-full flex-col gap-1.5 rounded-2xl border-2 bg-paper px-3 py-2.5 ${leafBorder?.(node) ?? 'border-line'}`}
    >
      <header className="leading-tight">
        <span className="text-xs font-black tracking-wide text-violet-deep">{node.label}</span>
        {/* Espaces insécables dans les guillemets : sans elles, « ou » se
            retrouvait seul en début de ligne sur un titre qui se replie. */}
        {node.title && <span className="text-xs font-semibold text-ink-faint">{` · « ${node.title} »`}</span>}
      </header>
      <Theses {...props} />
      <FarLinks work={work} node={node} />
    </section>
  )
}

function Theses({ node, renderPoint = defaultPoint }: TreeProps & { node: WorkNode }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {node.points.map((point) => (
        <li key={point.id} className="text-sm leading-snug text-ink">
          {renderPoint(point)}
        </li>
      ))}
    </ul>
  )
}

/** Liens avec des parties éloignées : ni voisines ni emboîtées, aucun trait ne peut les joindre. */
function FarLinks({ work, node }: { work: Work; node: WorkNode }) {
  const links = linksOf(work, node.id)
  if (links.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5 pt-0.5">
      {links.map(({ link, other, outgoing }) => (
        <li
          key={`${link.from}:${link.to}`}
          className="rounded-full border border-dashed border-violet/50 px-2 py-0.5 text-[0.7rem] font-bold text-violet-deep"
        >
          {RELATION_LABELS[link.rel]} {outgoing ? '→' : '←'} {other?.label ?? (outgoing ? link.to : link.from)}
        </li>
      ))}
    </ul>
  )
}

/** Repère commun à des parties de même plan. */
function ParallelMark() {
  return (
    <p className="flex items-center gap-2 text-[0.7rem] font-black tracking-widest text-ink-faint uppercase">
      <span className="h-px flex-1 border-t-2 border-dashed border-line" />
      même plan
      <span className="h-px flex-1 border-t-2 border-dashed border-line" />
    </p>
  )
}

/** Relation entre deux parties empilées : une flèche vers le bas, nommée. */
function DownConnector({ rel }: { rel?: WorkRelation }) {
  if (!rel) return <div className="h-2" />
  if (rel === 'declinaison') {
    return (
      <p className="py-1 text-center text-[0.7rem] font-black tracking-widest text-ink-faint uppercase">
        même plan
      </p>
    )
  }
  return (
    <div className="flex flex-col items-center py-1" aria-label={RELATION_LABELS[rel]}>
      <span className="h-2 w-0.5 bg-violet/40" />
      <span className="rounded-full bg-violet/15 px-2.5 py-0.5 text-xs font-black text-violet-deep">
        ↓ {RELATION_LABELS[rel]}
      </span>
      <span className="h-2 w-0.5 bg-violet/40" />
    </div>
  )
}

/** Relation entre deux parties côte à côte, dans l'organigramme : une flèche vers la droite. */
function SideConnector({ rel }: { rel: WorkRelation }) {
  if (rel === 'declinaison') return null
  return (
    <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 text-center" aria-label={RELATION_LABELS[rel]}>
      <span className="text-base leading-none font-black text-violet-deep">→</span>
      <span className="text-[0.65rem] leading-tight font-black text-violet-deep">{RELATION_LABELS[rel]}</span>
    </div>
  )
}
