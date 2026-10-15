import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { INLINE_COLORS, NoteTable, type Tone } from '@/components/session/RuleNote'
import { parseNotes } from '@/content/notes'
import type { NoteColor } from '@/content/schema'
import {
  blockText,
  hasMark,
  insertRuns,
  isEmptyBlock,
  MARK_ORDER,
  markupOf,
  marksAt,
  mergeRuns,
  normalizeBlock,
  parseDoc,
  reparseRuns,
  restyle,
  RULE_FAMILY,
  ruleSplits,
  runsFromMarkup,
  runsLength,
  serializeDoc,
  sliceRuns,
  withMark,
  type Block,
  type BlockKind,
  type MarkKey,
  type Marks,
  type Run,
} from './richNotes'
import type { TrackKind } from './types'

/**
 * Le rappel tel que l'apprenant le verra, directement modifiable : l'ancien
 * couple « texte brut à gauche, aperçu à droite » fondu en un seul panneau,
 * qui tient même dans une demi-fenêtre.
 *
 * On n'y voit plus aucun marqueur : la mise en forme du texte sélectionné
 * allume le bouton correspondant de la barre d'outils, qu'un clic (ou le même
 * raccourci, Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Maj+I) pose ou retire. Une règle
 * ou un piège est un bloc entier, que son bouton convertit dans un sens ou
 * dans l'autre ; taper « - » ou « ! » en tête de paragraphe y mène aussi,
 * comme à la relecture du fichier.
 *
 * Le contenu éditable n'appartient pas à React : chaque bloc y est dessiné à
 * la main (voir `Controller`) et relu après chaque frappe, puis réécrit dans
 * le format des `notes:` (voir `richNotes.ts`). Une frappe ordinaire laisse
 * le navigateur faire ; Entrée, l'effacement d'un bloc à l'autre, le collage,
 * les mises en forme et l'annulation passent par le modèle, pour que le
 * texte écrit reste toujours relisible.
 */

interface Pos {
  block: number
  offset: number
}

interface Sel {
  start: Pos
  end: Pos
  collapsed: boolean
}

export interface ToolbarState {
  marks: Marks
  rule: boolean
  warning: boolean
}

const EMPTY_STATE: ToolbarState = { marks: {}, rule: false, warning: false }

interface Meta {
  kind: BlockKind
  src?: string
  orig?: string
  gap?: string
  /** Ce qui, hors du texte, décide du dessin du bloc (voir `layout`). */
  layout: string
}

interface Layout {
  docFirst: boolean
  lead: boolean
  groupFirst: boolean
  groupLast: boolean
  border: boolean
  nextExample: boolean
  placeholder: boolean
  splits: { labelEnd: number; asideStart: number | null } | null
}

const TABLE_TEMPLATE = [
  '|              | Colonne A | Colonne B |',
  '| **Ligne 1**  | …         | …         |',
  '| **Ligne 2**  | …         | …         |',
].join('\n')

const NBSP = ' '

/** Classes de `NoteBlocks`, en toutes lettres (voir la remarque sur Tailwind dans `RuleNote.tsx`). */
const LEAD = 'text-justify hyphens-auto text-[0.975rem] leading-relaxed font-semibold text-ink'
const BODY = 'text-justify hyphens-auto text-sm leading-relaxed text-ink-soft'
const WARNING =
  "relative rounded-2xl border-2 border-amber/40 bg-amber/10 py-3 pr-4 pl-10 text-justify hyphens-auto text-sm leading-relaxed text-ink before:absolute before:left-4 before:top-3 before:text-base before:leading-tight before:content-['⚠']"
const RULE =
  'relative pr-4 pl-[2.125rem] text-justify hyphens-auto text-sm leading-snug text-ink before:absolute before:left-4 before:h-1.5 before:w-1.5 before:rounded-full'
const EXAMPLE = 'relative pr-4 pl-[2.125rem] text-sm leading-snug font-bold text-ink-soft italic'
const BORDER = 'after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-ink/8'
const SECTION = 'border-t-2 border-dashed border-line pt-2 font-mono text-xs text-ink-faint'
const PLACEHOLDER = 'before:pointer-events-none before:text-ink-faint before:content-[attr(data-placeholder)]'
const MARKER: Record<string, string> = {
  'bg-violet': 'before:bg-violet',
  'bg-sky': 'before:bg-sky',
  'bg-teal': 'before:bg-teal',
}

function layoutOf(blocks: Block[], i: number): Layout {
  const block = blocks[i]!
  const family = (other: Block | undefined) => Boolean(other && RULE_FAMILY.has(other.kind))
  const inGroup = family(block)
  const prev = blocks[i - 1]
  const next = blocks[i + 1]
  return {
    docFirst: i === 0,
    lead: block.kind === 'paragraph' && i === blocks.findIndex((other) => !isEmptyBlock(other)),
    groupFirst: inGroup && !family(prev),
    groupLast: inGroup && !family(next),
    border: inGroup && next?.kind === 'rule',
    nextExample: block.kind === 'rule' && next?.kind === 'example',
    placeholder: blocks.length === 1 && block.kind === 'paragraph' && isEmptyBlock(block),
    splits: block.kind === 'rule' ? ruleSplits(blockText(block)) : null,
  }
}

function classesOf(kind: BlockKind, layout: Layout, tone: Tone): string {
  const top = layout.docFirst || (RULE_FAMILY.has(kind) && !layout.groupFirst) ? '' : 'mt-4'
  const end = layout.groupLast ? 'rounded-b-2xl pb-4' : 'pb-3'
  switch (kind) {
    case 'paragraph':
      return [top, layout.lead ? LEAD : BODY, layout.placeholder ? PLACEHOLDER : ''].join(' ')
    case 'warning':
      return `${top} ${WARNING}`
    case 'rule':
      return [
        top,
        tone.panel,
        RULE,
        MARKER[tone.marker] ?? '',
        layout.groupFirst ? 'rounded-t-2xl pt-4 before:top-6' : 'pt-3 before:top-5',
        layout.nextExample ? 'pb-1' : end,
        layout.border ? BORDER : '',
      ].join(' ')
    case 'example':
      return [tone.panel, EXAMPLE, end, layout.border ? BORDER : ''].join(' ')
    case 'section':
      return `${top} ${SECTION}`
    case 'table':
      return `${top} whitespace-normal`
  }
}

function markElement(key: MarkKey, marks: Marks, tint: string | undefined): HTMLElement {
  let el: HTMLElement
  switch (key) {
    case 'color':
      el = document.createElement('span')
      el.className = `font-bold ${INLINE_COLORS[marks.color!]}`
      el.dataset.c = marks.color
      break
    case 'underline':
      el = document.createElement('span')
      el.className = 'font-bold underline decoration-2 underline-offset-[3px]'
      break
    case 'strong':
      el = document.createElement('strong')
      el.className = `font-black ${tint ?? 'text-ink'}`
      break
    case 'em':
      el = document.createElement('em')
      el.className = 'italic'
      break
    case 'form':
      el = document.createElement('em')
      el.className = 'text-ink italic'
      break
  }
  el.dataset.m = key
  return el
}

/** Dessine des segments marqués, imbriqués dans le même ordre que leur écriture (voir `markupFromRuns`). */
function appendRuns(parent: HTMLElement, runs: Run[]) {
  const level = (group: Run[], depth: number, into: HTMLElement, tint: string | undefined) => {
    if (depth === MARK_ORDER.length) {
      into.append(document.createTextNode(group.map((run) => run.text).join('')))
      return
    }
    const key = MARK_ORDER[depth]!
    let start = 0
    for (let i = 1; i <= group.length; i++) {
      if (i < group.length && group[i]!.marks[key] === group[start]!.marks[key]) continue
      const slice = group.slice(start, i)
      const marks = slice[0]!.marks
      if (marks[key]) {
        const el = markElement(key, marks, tint)
        into.append(el)
        level(slice, depth + 1, el, key === 'color' ? INLINE_COLORS[marks.color!] : tint)
      } else level(slice, depth + 1, into, tint)
      start = i
    }
  }
  level(mergeRuns(runs), 0, parent, undefined)
}

/** Relit les segments d'un bloc dessiné (ou retouché par le navigateur). */
function readRuns(el: HTMLElement): Run[] {
  const out: Run[] = []
  const visit = (node: Node, marks: Marks) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out.push({ text: (child as Text).data.replace(/\n/g, ' '), marks })
      } else if (child instanceof HTMLElement && child.tagName !== 'BR') {
        const key = child.dataset.m as MarkKey | undefined
        const next = key ? withMark(marks, key, true, child.dataset.c as NoteColor | undefined) : marks
        visit(child, next)
      }
    }
  }
  visit(el, {})
  return mergeRuns(out)
}

/** Le bloc ne contient-il que ce que l'éditeur y a mis ? Sinon (collage du navigateur…), on le redessine. */
function isClean(el: HTMLElement): boolean {
  return Array.from(el.querySelectorAll('*')).every(
    (child) => child.tagName === 'BR' || (child as HTMLElement).dataset.m || (child as HTMLElement).dataset.s,
  )
}

function textNodes(el: HTMLElement): Text[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const out: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) out.push(node as Text)
  return out
}

/** Les segments sous une forme comparable, indépendante de l'ordre des clés de `marks`. */
const runsKey = (runs: Run[]) => mergeRuns(runs).map((run) => [run.text, ...MARK_ORDER.map((key) => run.marks[key] ?? 0)])

const samePos = (a: Pos, b: Pos) => a.block === b.block && a.offset === b.offset

/** Un guillemet s'ouvre en début de bloc, après une espace ou une ouvrante ; sinon il se ferme (voir `useFrenchQuotes`). */
const opensQuote = (before: string) => before === '' || /[\s([{«‹⁠]$/.test(before)

interface Callbacks {
  onChange: (notes: string) => void
  onState: (state: ToolbarState) => void
  onOpenTables: () => void
}

class Controller {
  private meta = new WeakMap<HTMLElement, Meta>()
  private tables = new Map<HTMLElement, Root>()
  private head = ''
  private tail = ''
  private history: { notes: string; sel: Sel | null }[] = []
  private at = 0
  private lastType: 'typing' | 'op' = 'op'
  private lastAt = 0
  private pending: { pos: Pos; marks: Marks } | null = null
  private saved: Sel | null = null
  private composing = false
  lastEmitted: string | null = null
  private cleanup: (() => void)[] = []

  constructor(
    private root: HTMLElement,
    private tone: Tone,
    private cb: Callbacks,
  ) {
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (event: HTMLElementEventMap[K]) => void) => {
      root.addEventListener(type, fn)
      this.cleanup.push(() => root.removeEventListener(type, fn))
    }
    on('keydown', (event) => this.onKeyDown(event))
    on('beforeinput', (event) => this.onBeforeInput(event))
    on('input', () => this.onInput())
    on('compositionstart', () => (this.composing = true))
    on('compositionend', () => {
      this.composing = false
      this.onInput()
    })
    on('paste', (event) => this.onPaste(event))
    on('copy', (event) => this.onCopy(event, false))
    on('cut', (event) => this.onCopy(event, true))
    on('dragstart', (event) => event.preventDefault())
    on('drop', (event) => event.preventDefault())
    const onSelection = () => this.onSelectionChange()
    document.addEventListener('selectionchange', onSelection)
    this.cleanup.push(() => document.removeEventListener('selectionchange', onSelection))
  }

  destroy() {
    for (const fn of this.cleanup) fn()
    for (const root of this.tables.values()) setTimeout(() => root.unmount())
    this.tables.clear()
    this.root.replaceChildren()
  }

  /** Nouveau texte venu d'ailleurs (autre leçon, Annuler) : tout se redessine, l'historique repart. */
  load(notes: string) {
    this.history = [{ notes, sel: null }]
    this.at = 0
    this.apply(notes, null)
  }

  private apply(notes: string, sel: Sel | null) {
    const doc = parseDoc(notes)
    this.head = doc.head
    this.tail = doc.tail
    this.lastEmitted = notes
    this.pending = null
    this.render(this.withTrailing(doc.blocks))
    if (sel) this.select(sel)
    this.updateState()
  }

  /* ——— Lecture et dessin ——— */

  private elements(): HTMLElement[] {
    return Array.from(this.root.children) as HTMLElement[]
  }

  private readBlock(el: HTMLElement): Block {
    const meta = this.meta.get(el)
    const kind = meta?.kind ?? 'paragraph'
    const runs = kind === 'table' ? [] : readRuns(el)
    return { kind, runs: kind === 'section' ? runs.map((run) => ({ text: run.text, marks: {} })) : runs, src: meta?.src, orig: meta?.orig, gap: meta?.gap }
  }

  private read(): Block[] {
    return this.elements().map((el) => this.readBlock(el))
  }

  /** Un tableau en dernier ne laisse plus rien où écrire : un paragraphe vide (jamais enregistré) le suit. */
  private withTrailing(blocks: Block[]): Block[] {
    const last = blocks[blocks.length - 1]
    return !last || last.kind === 'table' ? [...blocks, { kind: 'paragraph', runs: [] }] : blocks
  }

  private keyOf(block: Block, layout: Layout): string {
    return JSON.stringify([block.kind, layout, block.kind === 'table' ? block.src : runsKey(block.runs)])
  }

  /** La clé que le bloc dessiné aurait aujourd'hui, d'après son texte tel que le navigateur l'a laissé. */
  private elementKey(el: HTMLElement): string {
    const meta = this.meta.get(el)
    if (!meta) return ''
    if (meta.kind === 'table') return meta.layout
    if (!isClean(el)) return ''
    return JSON.stringify([meta.kind, JSON.parse(meta.layout)[1], runsKey(readRuns(el))])
  }

  /**
   * Redessine ce qui a changé : un bloc dont ni le texte ni la mise en page
   * n'ont bougé garde son élément (et le curseur qui s'y trouve). Rend vrai
   * si le moindre élément a été remplacé ou déplacé.
   */
  private render(blocks: Block[]): boolean {
    let changed = false
    const pool = new Map<string, HTMLElement[]>()
    for (const el of this.elements()) {
      const key = this.elementKey(el)
      pool.set(key, [...(pool.get(key) ?? []), el])
    }
    const next = blocks.map((block, i) => {
      const layout = layoutOf(blocks, i)
      const key = this.keyOf(block, layout)
      const reused = key ? pool.get(key)?.shift() : undefined
      const meta: Meta = { kind: block.kind, src: block.src, orig: block.orig, gap: block.gap, layout: key }
      if (reused) {
        this.meta.set(reused, meta)
        return reused
      }
      changed = true
      const el = this.build(block, layout)
      this.meta.set(el, meta)
      return el
    })
    next.forEach((el, i) => {
      if (this.root.children[i] !== el) {
        this.root.insertBefore(el, this.root.children[i] ?? null)
        changed = true
      }
    })
    for (const node of Array.from(this.root.childNodes)) {
      if (node instanceof HTMLElement && next.includes(node)) continue
      const table = node instanceof HTMLElement ? this.tables.get(node) : undefined
      if (table) {
        this.tables.delete(node as HTMLElement)
        setTimeout(() => table.unmount())
      }
      node.remove()
      changed = true
    }
    return changed
  }

  private build(block: Block, layout: Layout): HTMLElement {
    const el = document.createElement(block.kind === 'paragraph' ? 'p' : 'div')
    el.dataset.kind = block.kind
    el.className = classesOf(block.kind, layout, this.tone)
    if (block.kind === 'table') {
      el.contentEditable = 'false'
      const root = createRoot(el)
      root.render(
        <TableBlock
          src={block.src ?? ''}
          tone={this.tone}
          onOpen={() => this.cb.onOpenTables()}
          onRemove={() => this.removeTable(el)}
          onInsertBefore={() => this.insertBefore(el)}
        />,
      )
      this.tables.set(el, root)
      return el
    }
    if (layout.placeholder) el.dataset.placeholder = 'Écris le rappel ici…'
    if (block.runs.length === 0) {
      el.append(document.createElement('br'))
      return el
    }
    const length = runsLength(block.runs)
    const pieces: [number, number, string][] = layout.splits
      ? [
          [0, layout.splits.labelEnd, 'font-black'],
          [layout.splits.labelEnd, layout.splits.asideStart ?? length, 'font-semibold'],
          [layout.splits.asideStart ?? length, length, 'font-normal text-ink-faint'],
        ]
      : [[0, length, '']]
    for (const [from, to, className] of pieces) {
      if (to <= from) continue
      const slice = sliceRuns(block.runs, from, to)
      if (!className) appendRuns(el, slice)
      else {
        const span = document.createElement('span')
        span.dataset.s = ''
        span.className = className
        appendRuns(span, slice)
        el.append(span)
      }
    }
    return el
  }

  /* ——— Sélection ——— */

  private posFromDom(node: Node, offset: number): Pos | null {
    const els = this.elements()
    if (node === this.root) {
      if (els.length === 0) return null
      if (offset >= els.length) return { block: els.length - 1, offset: this.lengthAt(els.length - 1) }
      return { block: offset, offset: 0 }
    }
    let el: Node | null = node
    while (el && el.parentNode !== this.root) el = el.parentNode
    if (!(el instanceof HTMLElement)) return null
    const block = els.indexOf(el)
    if (block === -1 || this.meta.get(el)?.kind === 'table') return block === -1 ? null : { block, offset: 0 }
    let acc = 0
    const texts = textNodes(el)
    if (node.nodeType === Node.TEXT_NODE) {
      for (const text of texts) {
        if (text === node) return { block, offset: acc + offset }
        acc += text.length
      }
      return { block, offset: acc }
    }
    const point = document.createRange()
    point.setStart(node, offset)
    for (const text of texts) {
      if (point.comparePoint(text, text.length) > 0) break
      acc += text.length
    }
    return { block, offset: acc }
  }

  private lengthAt(index: number): number {
    const el = this.elements()[index]
    return el ? runsLength(this.readBlock(el).runs) : 0
  }

  private domFromPos(pos: Pos): [Node, number] {
    const els = this.elements()
    const el = els[Math.min(pos.block, els.length - 1)]
    if (!el) return [this.root, 0]
    if (this.meta.get(el)?.kind === 'table') return [this.root, els.indexOf(el)]
    let acc = 0
    const texts = textNodes(el)
    // À la jonction de deux segments, le curseur reste dans celui de gauche :
    // la lettre tapée ensuite prend la mise en forme de celle qui précède.
    for (const text of texts) {
      if (pos.offset <= acc + text.length) return [text, pos.offset - acc]
      acc += text.length
    }
    const last = texts[texts.length - 1]
    return last ? [last, last.length] : [el, 0]
  }

  private getSel(): Sel | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!this.root.contains(range.startContainer) || !this.root.contains(range.endContainer)) return null
    const start = this.posFromDom(range.startContainer, range.startOffset)
    const end = this.posFromDom(range.endContainer, range.endOffset)
    if (!start || !end) return null
    return { start, end, collapsed: range.collapsed || samePos(start, end) }
  }

  private select(sel: Sel) {
    const selection = window.getSelection()
    if (!selection) return
    if (document.activeElement !== this.root) this.root.focus({ preventScroll: true })
    const range = document.createRange()
    const [startNode, startOffset] = this.domFromPos(sel.start)
    const [endNode, endOffset] = this.domFromPos(sel.end)
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    selection.removeAllRanges()
    selection.addRange(range)
    this.saved = sel
  }

  private current(): Sel | null {
    return this.getSel() ?? this.saved
  }

  /* ——— Validation d'une modification ——— */

  /**
   * Toute modification passe par ici : chaque bloc prend sa vraie nature (un
   * « - » tapé en tête en fait une règle), ce qui a changé se redessine, le
   * curseur revient à sa place et le texte part vers l'écran.
   */
  private commit(blocks: Block[], sel: Sel | null, type: 'typing' | 'op', restore = true) {
    const fixed: Block[] = []
    blocks.forEach((original, i) => {
      let block = original
      const reread = block.kind === 'table' || block.kind === 'section' ? null : reparseRuns(block.runs)
      if (reread) {
        // Les marqueurs retirés précèdent le curseur (on vient de taper celui
        // qui ferme) : il garde sa distance à la fin du bloc.
        const before = runsLength(block.runs)
        const after = runsLength(reread)
        block = { ...block, runs: reread }
        if (sel) {
          for (const pos of [sel.start, sel.end]) {
            if (pos.block === i) pos.offset = Math.max(0, Math.min(after, after - (before - pos.offset)))
          }
        }
      }
      const { block: next, removed } = normalizeBlock(block, fixed[i - 1])
      fixed.push(next)
      if (removed && sel) {
        for (const pos of [sel.start, sel.end]) if (pos.block === i) pos.offset = Math.max(0, pos.offset - removed)
      }
    })
    const all = this.withTrailing(fixed)
    const changed = this.render(all)
    if (sel && (restore || changed)) this.select(sel)
    this.emit(all, sel, type)
    this.updateState()
  }

  private emit(blocks: Block[], sel: Sel | null, type: 'typing' | 'op') {
    const notes = serializeDoc({ head: this.head, tail: this.tail, blocks })
    if (notes === this.lastEmitted) return
    this.lastEmitted = notes
    const now = Date.now()
    const coalesce = type === 'typing' && this.lastType === 'typing' && now - this.lastAt < 1000 && this.at > 0
    if (coalesce) this.history[this.at] = { notes, sel }
    else {
      this.history = this.history.slice(0, this.at + 1)
      this.history.push({ notes, sel })
      this.at = this.history.length - 1
    }
    this.lastType = type
    this.lastAt = now
    this.cb.onChange(notes)
  }

  private undo(step: -1 | 1) {
    const target = this.at + step
    const entry = this.history[target]
    if (!entry) return
    this.at = target
    this.lastType = 'op'
    // Le curseur d'une étape annulée est celui d'après la modification
    // suivante : on le reprend, borné au texte rétabli.
    const sel = step === -1 ? (this.history[target + 1]?.sel ?? entry.sel) : entry.sel
    this.apply(entry.notes, null)
    if (sel) this.select(this.clamp(sel))
    this.cb.onChange(entry.notes)
  }

  private clamp(sel: Sel): Sel {
    const count = this.elements().length
    const fix = (pos: Pos): Pos => {
      const block = Math.min(pos.block, count - 1)
      return { block, offset: Math.min(pos.offset, this.lengthAt(block)) }
    }
    return { start: fix(sel.start), end: fix(sel.end), collapsed: sel.collapsed }
  }

  /* ——— Événements ——— */

  private onInput() {
    if (this.composing) return
    this.adoptStrays()
    // La frappe du navigateur a déjà mis le curseur où il faut : on ne le
    // replace que si son bloc a dû être redessiné.
    this.commit(this.read(), this.getSel(), 'typing', false)
  }

  /** Du texte tapé hors de tout bloc (racine vidée par le navigateur) devient un paragraphe. */
  private adoptStrays() {
    for (const node of Array.from(this.root.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE) continue
      const selection = window.getSelection()
      const offset = selection?.anchorNode === node ? selection.anchorOffset : null
      const p = document.createElement('p')
      node.replaceWith(p)
      p.append(node)
      if (offset !== null) selection?.collapse(node, offset)
    }
  }

  private onSelectionChange() {
    const sel = this.getSel()
    if (!sel) return
    this.saved = sel
    if (this.pending && (!sel.collapsed || !samePos(this.pending.pos, sel.start))) this.pending = null
    this.updateState()
  }

  private onKeyDown(event: KeyboardEvent) {
    if (this.composing || event.isComposing) return
    const mod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (mod && !event.altKey) {
      const mark: MarkKey | null =
        key === 'b' ? 'strong' : key === 'u' ? 'underline' : key === 'i' ? (event.shiftKey ? 'form' : 'em') : null
      if (mark) {
        event.preventDefault()
        this.toggleMark(mark)
        return
      }
      if (key === 'z' || key === 'y') {
        event.preventDefault()
        this.undo(key === 'y' || event.shiftKey ? 1 : -1)
        return
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      this.enter(event.shiftKey)
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const sel = this.getSel()
      if (!sel) return
      if (!sel.collapsed && sel.start.block !== sel.end.block) {
        event.preventDefault()
        this.deleteSelection()
        return
      }
      if (!sel.collapsed) return
      if (event.key === 'Backspace' && sel.start.offset === 0) {
        event.preventDefault()
        this.backspaceAtStart(sel.start.block)
      } else if (event.key === 'Delete' && sel.start.offset === this.lengthAt(sel.start.block)) {
        event.preventDefault()
        this.deleteAtEnd(sel.start.block)
      }
      return
    }
    if (event.key === '"' && !mod && !event.altKey) {
      event.preventDefault()
      this.quote()
    }
  }

  private onBeforeInput(event: InputEvent) {
    const type = event.inputType
    if (type.startsWith('format') || type === 'insertFromDrop') {
      event.preventDefault()
      return
    }
    if (type === 'historyUndo' || type === 'historyRedo') {
      event.preventDefault()
      this.undo(type === 'historyUndo' ? -1 : 1)
      return
    }
    if (type === 'insertParagraph' || type === 'insertLineBreak') {
      event.preventDefault()
      this.enter(type === 'insertLineBreak')
      return
    }
    const sel = this.getSel()
    if (!sel) return
    const spans = sel.start.block !== sel.end.block
    if (type === 'insertText' || type === 'insertReplacementText') {
      const pending = this.pending && sel.collapsed && samePos(this.pending.pos, sel.start)
      if ((spans || pending) && event.data) {
        event.preventDefault()
        this.insertText(event.data)
      }
      return
    }
    if (type.startsWith('delete') && spans) {
      event.preventDefault()
      this.deleteSelection()
    }
  }

  private onPaste(event: ClipboardEvent) {
    event.preventDefault()
    const text = event.clipboardData?.getData('text/plain') ?? ''
    if (text) this.insertMarkup(text.replace(/\r\n?/g, '\n'))
  }

  private onCopy(event: ClipboardEvent, cut: boolean) {
    const sel = this.getSel()
    if (!sel || sel.collapsed) return
    event.preventDefault()
    const blocks = this.read()
    const picked: Block[] = []
    for (let i = sel.start.block; i <= sel.end.block; i++) {
      const block = blocks[i]!
      const from = i === sel.start.block ? sel.start.offset : 0
      const to = i === sel.end.block ? sel.end.offset : Infinity
      picked.push(block.kind === 'table' ? block : { ...block, runs: sliceRuns(block.runs, from, to) })
    }
    event.clipboardData?.setData('text/plain', markupOf(picked))
    if (cut) this.deleteSelection()
  }

  /* ——— Opérations ——— */

  /** Efface la sélection dans le modèle ; rend les blocs et la position du curseur. */
  private cut(blocks: Block[], sel: Sel): { blocks: Block[]; pos: Pos } {
    const { start, end } = sel
    if (sel.collapsed) return { blocks, pos: { ...start } }
    const before = blocks.slice(0, start.block)
    const after = blocks.slice(end.block + 1)
    const first = blocks[start.block]!
    const last = blocks[end.block]!
    if (start.block === end.block) {
      if (first.kind === 'table') return { blocks: [...before, ...after], pos: { block: start.block, offset: 0 } }
      const runs = mergeRuns([...sliceRuns(first.runs, 0, start.offset), ...sliceRuns(first.runs, end.offset)])
      return { blocks: [...before, { ...first, runs }, ...after], pos: { ...start } }
    }
    const tail = last.kind === 'table' ? [] : sliceRuns(last.runs, end.offset)
    let middle: Block
    if (first.kind !== 'table') middle = { ...first, runs: mergeRuns([...sliceRuns(first.runs, 0, start.offset), ...tail]) }
    else if (last.kind !== 'table') middle = { ...last, runs: tail }
    else middle = { kind: 'paragraph', runs: [] }
    return { blocks: [...before, middle, ...after], pos: { block: start.block, offset: first.kind === 'table' ? 0 : start.offset } }
  }

  private collapsedAt(pos: Pos): Sel {
    return { start: { ...pos }, end: { ...pos }, collapsed: true }
  }

  private deleteSelection() {
    const sel = this.current()
    if (!sel) return
    const { blocks, pos } = this.cut(this.read(), sel)
    this.commit(blocks, this.collapsedAt(pos), 'op')
  }

  private insertText(text: string) {
    const sel = this.current()
    if (!sel) return
    const pending = this.pending && sel.collapsed && samePos(this.pending.pos, sel.start) ? this.pending.marks : null
    const { blocks, pos } = this.cut(this.read(), sel)
    const block = blocks[pos.block]!
    if (block.kind === 'table') {
      blocks.splice(pos.block, 0, { kind: 'paragraph', runs: [{ text, marks: {} }] })
      this.commit(blocks, this.collapsedAt({ block: pos.block, offset: text.length }), 'typing')
      return
    }
    const marks = block.kind === 'section' ? {} : (pending ?? marksAt(block.runs, pos.offset))
    blocks[pos.block] = { ...block, runs: insertRuns(block.runs, pos.offset, [{ text, marks }]) }
    this.pending = null
    this.commit(blocks, this.collapsedAt({ block: pos.block, offset: pos.offset + text.length }), 'typing')
  }

  /** Collage : du texte au format des `notes:` (gras, règles, tableaux…) se relit comme tel. */
  private insertMarkup(text: string) {
    const sel = this.current()
    if (!sel) return
    const { blocks, pos } = this.cut(this.read(), sel)
    const block = blocks[pos.block]!
    if (!text.includes('\n') && block.kind !== 'table') {
      const runs = block.kind === 'section' ? [{ text, marks: {} }] : runsFromMarkup(text)
      blocks[pos.block] = { ...block, runs: insertRuns(block.runs, pos.offset, runs) }
      this.commit(blocks, this.collapsedAt({ block: pos.block, offset: pos.offset + runsLength(runs) }), 'op')
      return
    }
    const pasted = parseDoc(text).blocks
    if (pasted.length === 0) return
    if (block.kind === 'table') {
      blocks.splice(pos.block + 1, 0, ...pasted)
      const last = pos.block + pasted.length
      this.commit(blocks, this.collapsedAt({ block: last, offset: runsLength(blocks[last]!.runs) }), 'op')
      return
    }
    const head: Block = { ...block, runs: sliceRuns(block.runs, 0, pos.offset) }
    // L'analyse rogne les bords de chaque bloc collé : l'espace qui finissait
    // le texte copié doit encore séparer son dernier mot de la suite.
    const trailing = /[ \t]+$/.exec(text)?.[0] ?? ''
    const tail = mergeRuns([{ text: trailing, marks: {} }, ...sliceRuns(block.runs, pos.offset)])
    const inserted = pasted.slice()
    if (inserted[0]!.kind === 'paragraph') head.runs = mergeRuns([...head.runs, ...inserted.shift()!.runs])
    let caret: Pos
    if (inserted.length === 0) {
      caret = { block: pos.block, offset: runsLength(head.runs) }
      head.runs = mergeRuns([...head.runs, ...tail])
    } else {
      const last = inserted[inserted.length - 1]!
      const lastIndex = pos.block + inserted.length
      if (last.kind === 'table') {
        inserted.push({ kind: 'paragraph', runs: tail })
        caret = { block: lastIndex + 1, offset: 0 }
      } else {
        caret = { block: lastIndex, offset: runsLength(last.runs) }
        inserted[inserted.length - 1] = { kind: last.kind, runs: mergeRuns([...last.runs, ...tail]) }
      }
    }
    blocks.splice(pos.block, 1, head, ...inserted)
    this.commit(blocks, this.collapsedAt(caret), 'op')
  }

  private enter(shift: boolean) {
    const sel = this.current()
    if (!sel) return
    const { blocks, pos } = this.cut(this.read(), sel)
    const block = blocks[pos.block]!
    if (block.kind === 'table' || block.kind === 'section') {
      blocks.splice(pos.block + 1, 0, { kind: 'paragraph', runs: [] })
      this.commit(blocks, this.collapsedAt({ block: pos.block + 1, offset: 0 }), 'op')
      return
    }
    // Entrée sur une règle ou un piège vide en sort, comme d'une liste.
    if (block.kind !== 'paragraph' && isEmptyBlock(block) && !shift) {
      blocks[pos.block] = { ...block, kind: 'paragraph' }
      this.commit(blocks, this.collapsedAt(pos), 'op')
      return
    }
    // Maj+Entrée sur une règle ouvre son exemple.
    const kind: BlockKind = block.kind === 'rule' && shift ? 'example' : RULE_FAMILY.has(block.kind) ? 'rule' : 'paragraph'
    blocks.splice(
      pos.block,
      1,
      { ...block, runs: sliceRuns(block.runs, 0, pos.offset) },
      { kind, runs: sliceRuns(block.runs, pos.offset) },
    )
    this.commit(blocks, this.collapsedAt({ block: pos.block + 1, offset: 0 }), 'op')
  }

  private backspaceAtStart(index: number) {
    const blocks = this.read()
    const block = blocks[index]!
    if (block.kind === 'rule' || block.kind === 'warning' || block.kind === 'example') {
      blocks[index] = { ...block, kind: 'paragraph' }
      this.commit(blocks, this.collapsedAt({ block: index, offset: 0 }), 'op')
      return
    }
    const prev = blocks[index - 1]
    if (!prev || prev.kind === 'table') return
    const offset = runsLength(prev.runs)
    blocks.splice(index - 1, 2, { ...prev, runs: mergeRuns([...prev.runs, ...block.runs]) })
    this.commit(blocks, this.collapsedAt({ block: index - 1, offset }), 'op')
  }

  private deleteAtEnd(index: number) {
    const blocks = this.read()
    const block = blocks[index]!
    const next = blocks[index + 1]
    if (!next || next.kind === 'table') return
    const offset = runsLength(block.runs)
    blocks.splice(index, 2, { ...block, runs: mergeRuns([...block.runs, ...next.runs]) })
    this.commit(blocks, this.collapsedAt({ block: index, offset }), 'op')
  }

  private quote() {
    const sel = this.current()
    if (!sel || sel.start.block !== sel.end.block) return
    const blocks = this.read()
    const block = blocks[sel.start.block]!
    if (block.kind === 'table') return
    const { start, end } = sel
    if (!sel.collapsed) {
      let runs = insertRuns(block.runs, end.offset, [{ text: `${NBSP}»`, marks: marksAt(block.runs, end.offset) }])
      runs = insertRuns(runs, start.offset, [{ text: `«${NBSP}`, marks: marksAt(block.runs, start.offset + 1) }])
      blocks[start.block] = { ...block, runs }
      this.commit(blocks, { start: { ...start, offset: start.offset + 2 }, end: { ...end, offset: end.offset + 2 }, collapsed: false }, 'op')
      return
    }
    const before = blockText(block).slice(0, start.offset)
    if (opensQuote(before)) return this.insertText(`«${NBSP}`)
    // Une espace déjà tapée avant le guillemet fermant devient l'insécable.
    if (/[  ]$/.test(before)) {
      const runs = mergeRuns([...sliceRuns(block.runs, 0, start.offset - 1), ...sliceRuns(block.runs, start.offset)])
      blocks[start.block] = { ...block, runs: insertRuns(runs, start.offset - 1, [{ text: `${NBSP}»`, marks: marksAt(runs, start.offset - 1) }]) }
      this.commit(blocks, this.collapsedAt({ block: start.block, offset: start.offset + 1 }), 'typing')
      return
    }
    this.insertText(`${NBSP}»`)
  }

  /** Pose ou retire une mise en forme ; sans sélection, elle vaut pour la prochaine lettre tapée. */
  toggleMark(key: MarkKey, color?: NoteColor) {
    const sel = this.current()
    if (!sel) return
    const blocks = this.read()
    if (sel.collapsed) {
      const block = blocks[sel.start.block]
      if (!block || block.kind === 'table' || block.kind === 'section') return
      const base = this.pending && samePos(this.pending.pos, sel.start) ? this.pending.marks : marksAt(block.runs, sel.start.offset)
      const on = key === 'color' ? base.color !== color : !base[key]
      this.pending = { pos: { ...sel.start }, marks: withMark(base, key, on, color) }
      this.select(sel)
      this.updateState()
      return
    }
    const ranges = this.ranges(blocks, sel)
    if (ranges.length === 0) return
    const active = ranges.every(({ index, from, to }) => hasMark(blocks[index]!.runs, from, to, key, color))
    for (const { index, from, to } of ranges) {
      const block = blocks[index]!
      blocks[index] = { ...block, runs: restyle(block.runs, from, to, (marks) => withMark(marks, key, !active, color)) }
    }
    this.commit(blocks, sel, 'op')
  }

  /** Les morceaux de texte sélectionnés, bloc par bloc (tableaux et sections exclus). */
  private ranges(blocks: Block[], sel: Sel) {
    const out: { index: number; from: number; to: number }[] = []
    for (let index = sel.start.block; index <= sel.end.block; index++) {
      const block = blocks[index]
      if (!block || block.kind === 'table' || block.kind === 'section') continue
      const from = index === sel.start.block ? sel.start.offset : 0
      const to = index === sel.end.block ? sel.end.offset : runsLength(block.runs)
      if (to > from) out.push({ index, from, to })
    }
    return out
  }

  /** Fait des blocs sélectionnés des règles (ou des pièges) ; s'ils le sont tous déjà, des paragraphes. */
  toggleKind(kind: 'rule' | 'warning') {
    const sel = this.current()
    if (!sel) return
    const blocks = this.read()
    const indexes: number[] = []
    for (let i = sel.start.block; i <= sel.end.block; i++) {
      const block = blocks[i]
      if (block && block.kind !== 'table' && block.kind !== 'section') indexes.push(i)
    }
    if (indexes.length === 0) return
    const all = indexes.every((i) => blocks[i]!.kind === kind)
    for (const i of indexes) blocks[i] = { ...blocks[i]!, kind: all ? 'paragraph' : kind }
    this.commit(blocks, sel, 'op')
  }

  /** Insère un bloc (tableau, section) après celui du curseur, ou à sa place s'il est vide. */
  insertBlock(kind: 'table' | 'section') {
    const sel = this.current() ?? this.collapsedAt({ block: this.elements().length - 1, offset: 0 })
    const blocks = this.read()
    const index = sel.end.block
    const block: Block =
      kind === 'table' ? { kind: 'table', runs: [], src: TABLE_TEMPLATE } : { kind: 'section', runs: [{ text: '===', marks: {} }] }
    const replace = blocks[index] && isEmptyBlock(blocks[index]!) && blocks[index]!.kind === 'paragraph'
    blocks.splice(replace ? index : index + 1, replace ? 1 : 0, block, { kind: 'paragraph', runs: [] })
    const at = replace ? index : index + 1
    this.commit(blocks, this.collapsedAt(kind === 'table' ? { block: at + 1, offset: 0 } : { block: at, offset: 3 }), 'op')
  }

  private removeTable(el: HTMLElement) {
    const index = this.elements().indexOf(el)
    if (index === -1) return
    const blocks = this.read()
    blocks.splice(index, 1)
    this.commit(blocks, this.collapsedAt({ block: Math.max(0, index - 1), offset: index > 0 ? runsLength(blocks[index - 1]!.runs) : 0 }), 'op')
  }

  private insertBefore(el: HTMLElement) {
    const index = this.elements().indexOf(el)
    if (index === -1) return
    const blocks = this.read()
    blocks.splice(index, 0, { kind: 'paragraph', runs: [] })
    this.commit(blocks, this.collapsedAt({ block: index, offset: 0 }), 'op')
  }

  /** Ce que la barre d'outils doit montrer allumé. */
  private updateState() {
    const sel = this.getSel()
    if (!sel) return
    const blocks = this.read()
    let marks: Marks = {}
    if (sel.collapsed) {
      const block = blocks[sel.start.block]
      marks =
        this.pending && samePos(this.pending.pos, sel.start)
          ? this.pending.marks
          : block && block.kind !== 'table'
            ? marksAt(block.runs, sel.start.offset)
            : {}
    } else {
      const ranges = this.ranges(blocks, sel)
      if (ranges.length > 0) {
        for (const key of MARK_ORDER) {
          if (key === 'color') continue
          if (ranges.every(({ index, from, to }) => hasMark(blocks[index]!.runs, from, to, key))) marks[key] = true as never
        }
        const first = sliceRuns(blocks[ranges[0]!.index]!.runs, ranges[0]!.from, ranges[0]!.to)[0]?.marks.color
        if (first && ranges.every(({ index, from, to }) => hasMark(blocks[index]!.runs, from, to, 'color', first))) marks.color = first
      }
    }
    const kinds = blocks.slice(sel.start.block, sel.end.block + 1).filter((block) => block.kind !== 'table' && block.kind !== 'section')
    this.cb.onState({
      marks,
      rule: kinds.length > 0 && kinds.every((block) => block.kind === 'rule'),
      warning: kinds.length > 0 && kinds.every((block) => block.kind === 'warning'),
    })
  }
}

/** Un tableau du rappel : non modifiable ici (l'onglet Tableaux l'édite en grille), mais déplaçable, supprimable. */
function TableBlock({
  src,
  tone,
  onOpen,
  onRemove,
  onInsertBefore,
}: {
  src: string
  tone: Tone
  onOpen: () => void
  onRemove: () => void
  onInsertBefore: () => void
}) {
  const block = parseNotes(src).find((item) => item.kind === 'table')
  const button =
    'rounded-md border-2 border-line bg-paper px-2 py-0.5 text-[0.7rem] font-bold text-ink-soft shadow-sm hover:border-teal hover:text-teal-deep'
  return (
    <div className="group relative select-none">
      {block?.kind === 'table' ? <NoteTable block={block} tone={tone} /> : <pre className="text-xs">{src}</pre>}
      <div className="absolute -top-3 right-2 hidden gap-1 group-hover:flex">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onInsertBefore} className={button}>
          Texte au-dessus
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onOpen} className={button}>
          Modifier dans Tableaux
        </button>
        <button
          type="button"
          title="Supprimer le tableau"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onRemove}
          className={`${button} hover:border-error hover:text-error`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

const COLORS = ['teal', 'violet', 'coral', 'amber', 'sky', 'yellow', 'green', 'red', 'pink'] as const

const SWATCH: Record<NoteColor, string> = {
  teal: 'bg-teal',
  violet: 'bg-violet',
  coral: 'bg-coral',
  amber: 'bg-amber',
  sky: 'bg-sky',
  yellow: 'bg-yellow',
  green: 'bg-green',
  red: 'bg-red',
  pink: 'bg-pink',
}

export function RichNotesEditor({
  notes,
  onChange,
  tone,
  trackKind,
  header,
  onOpenTables,
}: {
  notes: string
  onChange: (notes: string) => void
  tone: Tone
  trackKind: TrackKind
  /** Titre et texte cité, au-dessus du rappel dans la même carte. */
  header: ReactNode
  onOpenTables: () => void
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const controller = useRef<Controller | null>(null)
  const [state, setState] = useState<ToolbarState>(EMPTY_STATE)
  const latest = useRef({ onChange, onOpenTables })
  latest.current = { onChange, onOpenTables }
  const initial = useRef(notes)
  initial.current = notes

  useLayoutEffect(() => {
    const ctl = new Controller(rootRef.current!, tone, {
      onChange: (next) => latest.current.onChange(next),
      onState: setState,
      onOpenTables: () => latest.current.onOpenTables(),
    })
    controller.current = ctl
    ctl.load(initial.current)
    return () => {
      ctl.destroy()
      controller.current = null
    }
  }, [tone])

  useLayoutEffect(() => {
    const ctl = controller.current
    if (ctl && notes !== ctl.lastEmitted) ctl.load(notes)
  }, [notes])

  const { marks } = state
  const run = (fn: (ctl: Controller) => void) => () => {
    if (controller.current) fn(controller.current)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-center gap-1.5 border-b-2 border-line px-4 py-2">
        <ToolbarButton title="Gras (Ctrl+B)" active={Boolean(marks.strong)} onClick={run((c) => c.toggleMark('strong'))}>
          <strong>G</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italique : nuance, titre d'œuvre (Ctrl+I)"
          active={Boolean(marks.em)}
          onClick={run((c) => c.toggleMark('em'))}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Souligné (Ctrl+U)" active={Boolean(marks.underline)} onClick={run((c) => c.toggleMark('underline'))}>
          <span className="underline">S</span>
        </ToolbarButton>
        <ToolbarButton title="Mot étranger cité (Ctrl+Maj+I)" active={Boolean(marks.form)} onClick={run((c) => c.toggleMark('form'))}>
          <em>m</em>
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton title="Règle (ou « - » en tête de ligne)" active={state.rule} onClick={run((c) => c.toggleKind('rule'))}>
          • Règle
        </ToolbarButton>
        <ToolbarButton title="Piège (ou « ! » en tête de ligne)" active={state.warning} onClick={run((c) => c.toggleKind('warning'))}>
          ⚠ Piège
        </ToolbarButton>
        <ToolbarButton title="Tableau : deux classifications croisées" active={false} onClick={run((c) => c.insertBlock('table'))}>
          ⊞ Tableau
        </ToolbarButton>
        {trackKind === 'vocab' && (
          <ToolbarButton title="Nouvelle section (===)" active={false} onClick={run((c) => c.insertBlock('section'))}>
            === Section
          </ToolbarButton>
        )}
        <span className="mx-1 h-5 w-px bg-line" />
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            title={marks.color === color ? `${color} (retirer)` : color}
            onMouseDown={(event) => event.preventDefault()}
            onClick={run((c) => c.toggleMark('color', color))}
            className={`h-6 w-6 shrink-0 rounded-full border-2 border-paper shadow ${SWATCH[color]} ${
              marks.color === color ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''
            }`}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-ink/3 px-4 py-6 md:px-6">
        <div className="card-3d mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-6 md:max-w-3xl md:px-10 md:py-10">
          {header}
          <div
            ref={rootRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            lang="fr"
            aria-label="Rappel de la leçon"
            className="min-h-24 whitespace-pre-wrap outline-none"
          />
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      // Garde la sélection dans le rappel : sans cela, le clic la lui retire avant d'agir.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded-lg border-2 px-2.5 py-1.5 text-xs font-bold transition ${
        active
          ? 'border-teal bg-teal/15 text-teal-deep'
          : 'border-line bg-paper text-ink-soft hover:border-ink/20 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/** Le titre de la leçon, en tête de la carte comme à l'écran : une zone de texte à la hauteur de son contenu. */
export function TitleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [value])
  useEffect(() => {
    if (!value) ref.current?.focus()
    // À l'ouverture seulement : une leçon neuve n'a pas encore de titre.
  }, [])
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, ' '))}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        event.currentTarget.closest('.card-3d')?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus()
      }}
      placeholder="Titre de la leçon"
      aria-label="Titre de la leçon"
      spellCheck={false}
      className="w-full resize-none overflow-hidden bg-transparent text-2xl leading-tight font-black text-balance text-ink outline-none placeholder:text-ink-faint md:text-3xl"
    />
  )
}
