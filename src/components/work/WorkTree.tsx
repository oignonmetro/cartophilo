import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { GrammarPoint, Work, WorkNode } from '@/content/schema'
import { isDrawn, isLeaf, nodesOf, shortLabel, thesisFills } from '@/content/work'
import { RichGaps } from '@/components/session/RuleNote'

/**
 * Le plan d'une partie d'une œuvre, dessiné comme un schéma de manuel : des
 * bulles pour les grands blocs (leur emplacement et la question à laquelle
 * ils répondent), des cases pour les chapitres, et des flèches entre elles.
 *
 * Les relations (voir `workRelationSchema`) ne s'écrivent pas : elles se
 * voient. Des parties de même plan (`declinaison`) partent en éventail de ce
 * qui les précède, côte à côte, et s'en vont ensemble : leurs traits se
 * rejoignent sur une barre, d'où repart une seule flèche. Toutes les autres
 * relations sont une simple flèche. Un lien entre parties éloignées (la
 * reprise d'une formule du chapitre 3 au chapitre 6) est une flèche en
 * pointillé qui les joint par la droite. Ce qui découle d'un chapitre et
 * mène à la suite (`outcome`) s'intercale sur la flèche qui en part.
 *
 * Les cases se placent en CSS (grille ou colonne) ; les flèches sont
 * tracées ensuite, dans un calque SVG unique, d'après la position mesurée
 * des cases, et retracées à chaque changement de taille (case dépliée,
 * fenêtre redimensionnée).
 *
 * Deux usages :
 *   `map`  : la carte ; chaque case montre son titre, ce qu'elle affirme et
 *            sa précision, et se déplie au toucher sur ses thèses ;
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

/**
 * Où s'enregistrent les éléments que les flèches relient : `box` une case ou
 * un bloc, `head` la bulle d'un bloc, `out` ce qui découle d'un chapitre.
 */
type Part = 'box' | 'head' | 'out'
type Register = (id: string, part: Part) => (element: HTMLElement | null) => void
const RegisterContext = createContext<Register>(() => () => {})

interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

interface Stroke {
  d: string
  dashed?: boolean
  /** Sans pointe : un trait qui ne fait que rejoindre une barre. */
  plain?: boolean
}

/** Le plan d'une partie, sans son propre en-tête : c'est l'écran qui le titre. */
export function WorkTree({ root, ...props }: TreeProps & { root: WorkNode }) {
  const container = useRef<HTMLDivElement>(null)
  const elements = useRef(new Map<string, HTMLElement>())
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const marker = useId().replace(/:/g, '')
  const { work, layout } = props

  const register = useCallback<Register>(
    (id, part) => (element) => {
      if (element) elements.current.set(`${part}:${id}`, element)
      else elements.current.delete(`${part}:${id}`)
    },
    [],
  )

  const ids = new Set(nodesOf(root).map((node) => node.id))
  const hasFarLinks = work.links.some((link) => ids.has(link.from) && ids.has(link.to) && !isDrawn(work, link))

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
    const next: Stroke[] = []
    for (const edge of edgesOf(root, layout)) {
      const sources = edge.from.keys.map(rectOf).filter((rect): rect is Rect => rect !== null)
      const targets = edge.to.map(rectOf).filter((rect): rect is Rect => rect !== null)
      if (sources.length === 0 || targets.length === 0) continue
      next.push(...connect(sources, targets, edge.from.shape, layout))
    }
    const inside = new Set(nodesOf(root).map((node) => node.id))
    for (const link of work.links) {
      if (!inside.has(link.from) || !inside.has(link.to) || isDrawn(work, link)) continue
      const from = rectOf(`box:${link.from}`)
      const to = rectOf(`box:${link.to}`)
      if (from && to) next.push({ d: farPath(from, to, origin.width), dashed: true })
    }
    setStrokes(next)
  }, [root, work, layout])

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
      <div ref={container} className={`relative ${hasFarLinks ? 'pr-6' : ''}`}>
        {isLeaf(root) ? <LeafBox node={root} {...props} /> : <Children node={root} {...props} />}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className="fill-violet" />
            </marker>
          </defs>
          {strokes.map((stroke, index) => (
            <path
              key={index}
              d={stroke.d}
              fill="none"
              className="stroke-violet"
              strokeWidth={stroke.dashed ? 1.8 : 2}
              strokeDasharray={stroke.dashed ? '5 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              markerEnd={stroke.plain ? undefined : `url(#${marker})`}
            />
          ))}
        </svg>
      </div>
    </RegisterContext.Provider>
  )
}

/** Des parties de même plan : toutes, après la première, se déclinent de la précédente. */
function parallel(node: WorkNode): boolean {
  return node.parts.length > 1 && node.parts.slice(1).every((part) => part.rel === 'declinaison')
}

/** Un bloc a sa bulle s'il pose une question ; sinon il n'est qu'un regroupement de cases. */
function hasHead(node: WorkNode): boolean {
  return !isLeaf(node) && node.question !== undefined
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

/** Parties de même plan empilées sur téléphone, suspendues au rail de leur éventail. */
function railed(node: WorkNode, layout: WorkTreeLayout): boolean {
  return layout === 'vertical' && parallel(node)
}

/**
 * D'où part une flèche qui quitte une partie :
 *   `single`  : une seule case (ou ce qui découle d'un chapitre) ;
 *   `collect` : plusieurs cases côte à côte, dont les traits se rejoignent
 *               sur une barre avant de repartir en une flèche ;
 *   `rail`    : plusieurs cases empilées sur téléphone, dont le rail se
 *               prolonge jusqu'à la suite.
 */
interface Exit {
  shape: 'single' | 'collect' | 'rail'
  keys: string[]
}

function exitOf(node: WorkNode, layout: WorkTreeLayout): Exit {
  if (node.outcome) return { shape: 'single', keys: [`out:${node.id}`] }
  if (isLeaf(node)) return { shape: 'single', keys: [`box:${node.id}`] }
  const boxes = node.parts.map((part) => `box:${part.id}`)
  if (railed(node, layout)) return { shape: 'rail', keys: boxes }
  if (parallel(node) || rowOf(node, layout)) return { shape: 'collect', keys: boxes }
  return exitOf(node.parts[node.parts.length - 1]!, layout)
}

/**
 * Où arrive une flèche qui mène à une partie : sa case, ou la bulle de son
 * bloc ; pour un bloc sans bulle, directement ses cases, toutes si elles
 * sont de même plan (l'éventail part alors de ce qui précède le bloc, comme
 * du chapitre 7 aux chapitres 8, 9 et 10), la première sinon.
 */
function entriesOf(node: WorkNode): string[] {
  if (isLeaf(node)) return [`box:${node.id}`]
  if (hasHead(node)) return [`head:${node.id}`]
  return parallel(node) ? node.parts.flatMap(entriesOf) : entriesOf(node.parts[0]!)
}

interface Edge {
  from: Exit
  to: string[]
}

/**
 * Les flèches d'un sous-arbre. Une bulle mène à ses parties (toutes si elles
 * sont de même plan, la première sinon) ; entre parties voisines, une flèche
 * pour toute relation autre que de même plan ; d'un chapitre à ce qui en
 * découle, une flèche aussi. La racine n'a pas de bulle (son titre est celui
 * de l'écran).
 */
function edgesOf(root: WorkNode, layout: WorkTreeLayout): Edge[] {
  const edges: Edge[] = []
  const visit = (node: WorkNode, isRoot: boolean) => {
    if (node.outcome) edges.push({ from: { shape: 'single', keys: [`box:${node.id}`] }, to: [`out:${node.id}`] })
    const parts = node.parts
    if (parts.length === 0) return
    if (!isRoot && hasHead(node)) {
      edges.push({
        from: { shape: 'single', keys: [`head:${node.id}`] },
        to: parallel(node) ? parts.flatMap(entriesOf) : entriesOf(parts[0]!),
      })
    }
    parts.forEach((part, index) => {
      if (index > 0 && part.rel && part.rel !== 'declinaison') {
        edges.push({ from: exitOf(parts[index - 1]!, layout), to: entriesOf(part) })
      }
      visit(part, false)
    })
  }
  visit(root, true)
  return edges
}

/** Espace laissé entre la pointe d'une flèche et ce qu'elle vise. */
const TIP_GAP = 3
/** Distance entre le rail d'un éventail et les cases qu'il dessert, sur téléphone. */
const RAIL_OFFSET = 14

const centerX = (rect: Rect) => (rect.left + rect.right) / 2
const centerY = (rect: Rect) => (rect.top + rect.bottom) / 2

/** Les traits qui relient des sources à des cibles, selon la forme du départ. */
function connect(sources: Rect[], targets: Rect[], shape: Exit['shape'], layout: WorkTreeLayout): Stroke[] {
  // Deux cases côte à côte : une flèche horizontale de l'une à l'autre.
  const [source] = sources
  const [target] = targets
  if (shape === 'single' && targets.length === 1 && source && target && target.left >= source.right - 1 && target.top < source.bottom) {
    const y = (Math.max(source.top, target.top) + Math.min(source.bottom, target.bottom)) / 2
    return [{ d: `M${source.right} ${y} H${target.left - TIP_GAP}` }]
  }

  const top = Math.min(...targets.map((rect) => rect.top))

  // Téléphone : les cases empilées de même plan partent par leur rail, prolongé.
  if (shape === 'rail') {
    const x = Math.min(...sources.map((rect) => rect.left)) - RAIL_OFFSET
    const last = sources.reduce((a, b) => (b.bottom > a.bottom ? b : a))
    const bottom = Math.max(...sources.map((rect) => rect.bottom))
    const turn = (bottom + top) / 2
    return [
      { d: `M${x} ${centerY(last)} V${turn}`, plain: true },
      ...targets.map((rect) => ({ d: `M${x} ${turn} H${centerX(rect)} V${rect.top - TIP_GAP}` })),
    ]
  }

  // Téléphone : un éventail descend d'un rail à gauche des cases qu'il dessert.
  if (layout === 'vertical' && targets.length > 1 && source) {
    const x = Math.min(...targets.map((rect) => rect.left)) - RAIL_OFFSET
    return targets.map((rect) => ({ d: `M${x} ${source.bottom} V${centerY(rect)} H${rect.left - TIP_GAP}` }))
  }

  // Sinon : les sources descendent sur une barre (si elles sont plusieurs),
  // d'où partent les flèches vers les cibles, à angle droit.
  const bottom = Math.max(...sources.map((rect) => rect.bottom))
  const bar = bottom + Math.max(8, (top - bottom) / 2)
  const strokes: Stroke[] = []
  if (sources.length > 1) {
    const xs = [...sources.map(centerX), ...targets.map(centerX)]
    for (const rect of sources) strokes.push({ d: `M${centerX(rect)} ${rect.bottom} V${bar}`, plain: true })
    strokes.push({ d: `M${Math.min(...xs)} ${bar} H${Math.max(...xs)}`, plain: true })
    for (const rect of targets) strokes.push({ d: `M${centerX(rect)} ${bar} V${rect.top - TIP_GAP}` })
    return strokes
  }
  const x = centerX(source!)
  for (const rect of targets) {
    const tx = centerX(rect)
    strokes.push({
      d: Math.abs(tx - x) < 2 ? `M${x} ${source!.bottom} V${rect.top - TIP_GAP}` : `M${x} ${source!.bottom} V${bar} H${tx} V${rect.top - TIP_GAP}`,
    })
  }
  return strokes
}

/** Un lien éloigné : une courbe qui sort à droite d'une case et rentre à droite de l'autre. */
function farPath(a: Rect, b: Rect, width: number): string {
  const out = Math.min(width - 4, Math.max(a.right, b.right) + 20)
  return `M${a.right} ${centerY(a)} C${out} ${centerY(a)}, ${out} ${centerY(b)}, ${b.right + TIP_GAP} ${centerY(b)}`
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

  return (
    <div className={`flex w-full flex-col items-center ${railed(node, layout) ? 'gap-3 pl-7' : 'gap-7'}`}>
      {node.parts.map((part) => (
        <PartInColumn key={part.id} {...props} node={part} />
      ))}
    </div>
  )
}

/** Une partie dans une colonne, suivie de ce qui en découle, s'il y a lieu. */
function PartInColumn(props: TreeProps & { node: WorkNode }) {
  const { node } = props
  const register = useContext(RegisterContext)
  const part = isLeaf(node) ? (
    <div className="w-full max-w-md">
      <LeafBox {...props} />
    </div>
  ) : (
    <GroupView {...props} />
  )
  if (!node.outcome) return part
  return (
    <>
      {part}
      <p
        ref={register(node.id, 'out')}
        className="max-w-sm rounded-xl border-2 border-dashed border-violet/40 px-3 py-1.5 text-center text-sm leading-snug text-ink-soft italic"
      >
        {node.outcome}
      </p>
    </>
  )
}

/**
 * Un bloc : sa bulle (emplacement, question), puis ses parties. Seuls les
 * grands blocs posent une question ; un simple regroupement de chapitres
 * (chapitres 1 à 3 de même plan, par exemple) n'a pas de bulle, pour ne pas
 * empiler des questions qui s'emboîtent sans se répondre.
 */
function GroupView(props: TreeProps & { node: WorkNode }) {
  const { node } = props
  const register = useContext(RegisterContext)
  return (
    <div ref={register(node.id, 'box')} className="flex w-full flex-col items-center gap-7">
      {hasHead(node) && (
        <div
          ref={register(node.id, 'head')}
          className="max-w-xl rounded-[2rem] border-2 border-violet/70 bg-paper px-5 py-2 text-center"
        >
          <p className="text-sm leading-snug font-black text-ink">{node.label}</p>
          <p className="text-sm leading-snug text-ink-soft">{node.question}</p>
        </div>
      )}
      <Children {...props} />
    </div>
  )
}

/**
 * Une case de chapitre, comme dans un schéma de manuel : en tête, en gras,
 * l'emplacement et le titre de l'auteur ; puis ce que le chapitre affirme
 * (`summary`), et sa précision en italique (`gloss`). Dépliée, elle montre
 * les thèses. En plan à trous, l'affirmation et sa précision s'effacent
 * (elles donneraient la réponse) et les thèses restent affichées.
 */
function LeafBox({ node, mode = 'map', renderPoint, leafBorder }: TreeProps & { node: WorkNode }) {
  const register = useContext(RegisterContext)
  const [open, setOpen] = useState(false)
  const border = leafBorder?.(node) ?? 'border-violet/40'
  const showTheses = mode === 'plan' || open

  const content = (
    <>
      <p className="text-sm leading-snug font-black">
        <span className="text-violet-deep">{shortLabel(node.label)}</span>
        {node.title && <span className="text-ink"> · {node.title}</span>}
      </p>
      {mode === 'map' && node.summary && <p className="mt-1 text-sm leading-snug text-ink">{node.summary}</p>}
      {mode === 'map' && node.gloss && (
        <p className="mt-0.5 text-sm leading-snug text-ink-soft italic">= {node.gloss}</p>
      )}
      {showTheses && (
        <ul className="mt-2 flex flex-col gap-1.5 border-t border-line pt-2">
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
