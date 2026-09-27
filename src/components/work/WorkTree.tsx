import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { GrammarPoint, Work, WorkNode } from '@/content/schema'
import { isDrawn, isLeaf, nodesOf, thesisFills } from '@/content/work'
import { RichGaps } from '@/components/session/RuleNote'

/**
 * Le plan d'une partie d'une œuvre, dessiné comme un schéma de manuel : des
 * bulles pour les blocs (leur emplacement et la question à laquelle ils
 * répondent), des cases pour les chapitres, et des flèches entre elles.
 *
 * Les relations (voir `workRelationSchema`) ne s'écrivent pas : elles se
 * voient. Des parties de même plan (`declinaison`) partent en éventail de la
 * bulle de leur bloc, côte à côte ; toutes les autres s'enchaînent par une
 * simple flèche ; un lien entre parties éloignées (la reprise d'une formule
 * du chapitre 3 au chapitre 6) est une flèche en pointillé qui les joint par
 * la droite.
 *
 * Les cases se placent en CSS (grille ou colonne) ; les flèches sont
 * tracées ensuite, dans un calque SVG unique, d'après la position mesurée
 * des cases, et retracées à chaque changement de taille (case dépliée,
 * fenêtre redimensionnée).
 *
 * Deux usages :
 *   `map`  : la carte ; chaque case ne montre que son emplacement, son titre
 *            et sa glose (`summary`), et se déplie au toucher sur ses thèses ;
 *   `plan` : le plan à trous ; les thèses sont toujours affichées, par
 *            `renderPoint` (une case vide, une thèse replacée…).
 */

export type WorkTreeLayout = 'vertical' | 'chart'

interface TreeProps {
  work: Work
  layout: WorkTreeLayout
  mode?: 'map' | 'plan'
  /** Rendu d'une thèse ; par défaut, la phrase complète, sa réponse soulignée. */
  renderPoint?: (point: GrammarPoint) => ReactNode
  /** Classe de bordure d'un chapitre, pour colorer la carte selon la maîtrise. */
  leafBorder?: (node: WorkNode) => string | undefined
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

/** Où s'enregistrent les cases et les bulles, pour que le calque des flèches les retrouve. */
type Register = (id: string, part: 'box' | 'head') => (element: HTMLElement | null) => void
const RegisterContext = createContext<Register>(() => () => {})

/** Le plan d'une partie, sans son propre en-tête : c'est l'écran qui le titre. */
export function WorkTree({ root, ...props }: TreeProps & { root: WorkNode }) {
  const container = useRef<HTMLDivElement>(null)
  const elements = useRef(new Map<string, HTMLElement>())
  const [paths, setPaths] = useState<{ d: string; dashed: boolean }[]>([])
  const marker = useId().replace(/:/g, '')

  const register = useCallback<Register>(
    (id, part) => (element) => {
      if (element) elements.current.set(`${part}:${id}`, element)
      else elements.current.delete(`${part}:${id}`)
    },
    [],
  )

  const farLinks = props.work.links.filter((link) => {
    const ids = new Set(nodesOf(root).map((node) => node.id))
    return ids.has(link.from) && ids.has(link.to) && !isDrawn(props.work, link)
  })

  const measure = useCallback(() => {
    const box = container.current
    if (!box) return
    const origin = box.getBoundingClientRect()
    const rectOf = (key: string): Rect | null => {
      const element = elements.current.get(key)
      if (!element) return null
      const r = element.getBoundingClientRect()
      return { left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top, bottom: r.bottom - origin.top }
    }
    const next: { d: string; dashed: boolean }[] = []
    for (const edge of edgesOf(root)) {
      const from = rectOf(edge.from)
      const to = rectOf(edge.to)
      if (!from || !to) continue
      // Sur téléphone, l'éventail descend le long d'un rail à gauche des cases empilées.
      const d = edge.fan && props.layout === 'vertical' ? railPath(from, to) : arrowPath(from, to, edge.fan)
      next.push({ d, dashed: false })
    }
    for (const link of farLinks) {
      const from = rectOf(`box:${link.from}`)
      const to = rectOf(`box:${link.to}`)
      if (from && to) next.push({ d: farPath(from, to, origin.width), dashed: true })
    }
    setPaths(next)
    // `farLinks` se recalcule à chaque rendu, mais ne dépend que de `root` et `work`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, props.work, props.layout])

  useLayoutEffect(() => {
    measure()
    const box = container.current
    if (!box) return
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [measure])

  return (
    <RegisterContext.Provider value={register}>
      <div ref={container} className={`relative ${farLinks.length > 0 ? 'pr-6' : ''}`}>
        {isLeaf(root) ? <LeafBox node={root} {...props} /> : <Children node={root} {...props} />}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className="fill-violet" />
            </marker>
          </defs>
          {paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill="none"
              className="stroke-violet"
              strokeWidth={path.dashed ? 1.8 : 2}
              strokeDasharray={path.dashed ? '5 4' : undefined}
              strokeLinejoin="round"
              markerEnd={`url(#${marker})`}
            />
          ))}
        </svg>
      </div>
    </RegisterContext.Provider>
  )
}

interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

/** Une flèche à tracer, entre deux éléments enregistrés (`box:` une case ou un bloc, `head:` une bulle). */
interface Edge {
  from: string
  to: string
  /** Éventail depuis une bulle : la flèche descend, puis rejoint sa case à angle droit. */
  fan: boolean
}

/** Des parties de même plan : toutes, après la première, se déclinent de la précédente. */
function parallel(node: WorkNode): boolean {
  return node.parts.length > 1 && node.parts.slice(1).every((part) => part.rel === 'declinaison')
}

/**
 * Les flèches d'un sous-arbre. Une bulle mène à toutes ses parties quand
 * elles sont de même plan, à la première seulement sinon ; entre parties
 * voisines, une flèche pour toute relation autre que de même plan. La racine
 * n'a pas de bulle (son titre est celui de l'écran).
 */
function edgesOf(root: WorkNode): Edge[] {
  const edges: Edge[] = []
  const visit = (node: WorkNode, isRoot: boolean) => {
    const parts = node.parts
    if (parts.length === 0) return
    if (!isRoot) {
      const targets = parallel(node) ? parts : parts.slice(0, 1)
      for (const part of targets) edges.push({ from: `head:${node.id}`, to: `box:${part.id}`, fan: targets.length > 1 })
    }
    parts.forEach((part, index) => {
      if (index > 0 && part.rel && part.rel !== 'declinaison') {
        edges.push({ from: `box:${parts[index - 1]!.id}`, to: `box:${part.id}`, fan: false })
      }
      visit(part, false)
    })
  }
  visit(root, true)
  return edges
}

const GAP_BEFORE_HEAD = 3

/** Une flèche entre deux éléments : vers le bas si la cible est dessous, vers la droite si elle est à côté. */
function arrowPath(a: Rect, b: Rect, fan: boolean): string {
  const ax = (a.left + a.right) / 2
  const bx = (b.left + b.right) / 2
  if (b.top >= a.bottom - 1) {
    const end = b.top - GAP_BEFORE_HEAD
    if (Math.abs(ax - bx) < 2) return `M${ax} ${a.bottom} V${end}`
    const turn = fan ? a.bottom + Math.max(8, (end - a.bottom) / 2) : (a.bottom + end) / 2
    return `M${ax} ${a.bottom} V${turn} H${bx} V${end}`
  }
  if (b.left >= a.right - 1) {
    const y = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2
    return `M${a.right} ${y} H${b.left - GAP_BEFORE_HEAD}`
  }
  const ay = (a.top + a.bottom) / 2
  const by = (b.top + b.bottom) / 2
  return `M${ax} ${ay} L${bx} ${by}`
}

/** Distance entre le rail d'un éventail et les cases qu'il dessert, sur téléphone. */
const RAIL_OFFSET = 14

/**
 * Éventail sur téléphone : les parties de même plan s'empilent en retrait, et
 * la flèche descend d'un rail vertical avant d'entrer dans chacune par la
 * gauche. Un éventail à angle droit, lui, traverserait les cases du dessus.
 */
function railPath(head: Rect, b: Rect): string {
  const x = b.left - RAIL_OFFSET
  const y = (b.top + b.bottom) / 2
  return `M${x} ${head.bottom} V${y} H${b.left - GAP_BEFORE_HEAD}`
}

/** Un lien éloigné : une courbe qui sort à droite d'une case et rentre à droite de l'autre. */
function farPath(a: Rect, b: Rect, width: number): string {
  const ay = (a.top + a.bottom) / 2
  const by = (b.top + b.bottom) / 2
  const out = Math.min(width - 4, Math.max(a.right, b.right) + 20)
  return `M${a.right} ${ay} C${out} ${ay}, ${out} ${by}, ${b.right + GAP_BEFORE_HEAD} ${by}`
}

/**
 * Des cases côte à côte : sur ordinateur seulement, tout groupe d'au plus
 * quatre chapitres. Sur téléphone, tout s'empile : trois cases de front y
 * seraient illisibles, et deux par rangée forcent les flèches à en traverser.
 */
function rowOf(node: WorkNode, layout: WorkTreeLayout): number | null {
  const count = node.parts.length
  if (layout !== 'chart' || count < 2 || count > 4 || !node.parts.every(isLeaf)) return null
  return count
}

function Children(props: TreeProps & { node: WorkNode }) {
  const { node, layout } = props
  const columns = rowOf(node, layout)

  if (columns) {
    return (
      <div
        className={`grid w-full ${parallel(node) ? 'gap-3' : 'gap-x-10 gap-y-6'}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {node.parts.map((part) => (
          <LeafBox key={part.id} {...props} node={part} />
        ))}
      </div>
    )
  }

  // Sur téléphone, des parties de même plan s'empilent en retrait, sous le rail de leur éventail.
  const railed = layout === 'vertical' && parallel(node)
  return (
    <div className={`flex w-full flex-col items-center ${railed ? 'gap-3 pl-7' : 'gap-7'}`}>
      {node.parts.map((part) =>
        isLeaf(part) ? (
          <div key={part.id} className="w-full max-w-md">
            <LeafBox {...props} node={part} />
          </div>
        ) : (
          <GroupView key={part.id} {...props} node={part} />
        ),
      )}
    </div>
  )
}

/** Un bloc : sa bulle (emplacement, question), puis ses parties. */
function GroupView(props: TreeProps & { node: WorkNode }) {
  const { node } = props
  const register = useContext(RegisterContext)
  return (
    <div ref={register(node.id, 'box')} className="flex w-full flex-col items-center gap-7">
      <div
        ref={register(node.id, 'head')}
        className="max-w-xl rounded-[2rem] border-2 border-violet/70 bg-paper px-5 py-2 text-center"
      >
        <p className="text-sm leading-snug font-black text-ink">{node.label}</p>
        {node.question && <p className="text-sm leading-snug text-ink-soft">{node.question}</p>}
      </div>
      <Children {...props} />
    </div>
  )
}

/** Une case de chapitre : emplacement, titre, glose ; ses thèses dépliées à la demande, ou toujours en plan à trous. */
function LeafBox({ node, mode = 'map', renderPoint, leafBorder }: TreeProps & { node: WorkNode }) {
  const register = useContext(RegisterContext)
  const [open, setOpen] = useState(false)
  const border = leafBorder?.(node) ?? 'border-violet/40'
  const showTheses = mode === 'plan' || open

  const content = (
    <>
      <p className="text-sm leading-snug">
        <span className="font-black text-violet-deep">{node.label}</span>
        {node.title && <span className="font-extrabold text-ink"> · {node.title}</span>}
      </p>
      {node.summary && mode === 'map' && (
        <p className="mt-0.5 text-sm leading-snug text-ink-soft italic">{node.summary}</p>
      )}
      {showTheses && (
        <ul className="mt-2 flex flex-col gap-1.5 border-t border-line pt-2 text-left">
          {node.points.map((point) => (
            <li key={point.id} className="text-sm leading-snug text-ink">
              {renderPoint ? renderPoint(point) : <ThesisText point={point} />}
            </li>
          ))}
        </ul>
      )}
    </>
  )

  const className = `h-full w-full rounded-xl border-2 bg-paper px-3 py-2.5 text-center ${border}`
  if (mode === 'plan') {
    return (
      <div ref={register(node.id, 'box')} className={className}>
        {content}
      </div>
    )
  }
  return (
    <button
      ref={register(node.id, 'box')}
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      className={`${className} transition-colors hover:bg-violet/5`}
    >
      {content}
    </button>
  )
}
