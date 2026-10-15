import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  hasMark,
  markupFromRuns,
  normalizeBlock,
  parseDoc,
  restyle,
  runsFromMarkup,
  serializeDoc,
  withMark,
  type Block,
} from './richNotes'

function yamlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return yamlFiles(path)
    return name.endsWith('.yaml') ? [path] : []
  })
}

const ALL_NOTES = yamlFiles('content/courses').flatMap((file) => {
  const data = parse(readFileSync(file, 'utf8')) as { lessons?: { id: string; notes?: string }[] } | null
  return (data?.lessons ?? []).filter((lesson) => lesson.notes).map((lesson) => ({ id: lesson.id, notes: lesson.notes! }))
})

const shape = (blocks: Block[]) => blocks.map((block) => ({ kind: block.kind, runs: block.runs, src: block.kind === 'table' ? block.src : undefined }))

describe('richNotes', () => {
  it('réécrit à l’identique un rappel auquel on n’a pas touché', () => {
    expect(ALL_NOTES.length).toBeGreaterThan(50)
    for (const { id, notes } of ALL_NOTES) expect(serializeDoc(parseDoc(notes)), id).toBe(notes)
  })

  it('régénère chaque bloc sans rien en perdre à la relecture', () => {
    for (const { id, notes } of ALL_NOTES) {
      const doc = parseDoc(notes)
      const regenerated = serializeDoc({
        ...doc,
        blocks: doc.blocks.map((block) => ({ kind: block.kind, runs: block.runs, src: block.kind === 'table' ? block.src : undefined })),
      })
      expect(shape(parseDoc(regenerated).blocks), id).toEqual(shape(doc.blocks))
    }
  })

  it('imbrique les mises en forme dans un ordre que l’analyse relit', () => {
    const runs = [
      { text: 'a', marks: { strong: true as const } },
      { text: 'b', marks: { strong: true as const, underline: true as const } },
      { text: 'c', marks: { color: 'teal' as const, form: true as const } },
    ]
    const markup = markupFromRuns(runs)
    expect(markup).toBe('**a**__**b**__{teal}`c`{/teal}')
    expect(runsFromMarkup(markup)).toEqual(runs)
  })

  it('bascule une mise en forme sur une partie du texte', () => {
    const runs = runsFromMarkup('un **mot** clef')
    expect(hasMark(runs, 3, 6, 'strong')).toBe(true)
    const off = restyle(runs, 3, 6, (marks) => withMark(marks, 'strong', false))
    expect(markupFromRuns(off)).toBe('un mot clef')
    const italic = restyle(runs, 0, 6, (marks) => withMark(marks, 'em', true))
    expect(markupFromRuns(italic)).toBe('*un mot* clef')
  })

  it('sépare les blocs que la relecture fondrait sinon', () => {
    const doc = parseDoc('- une règle\nsuite')
    doc.blocks[0] = { ...doc.blocks[0]!, kind: 'paragraph' }
    expect(serializeDoc(doc)).toBe('une règle\n\nsuite')
  })

  it('donne au bloc sa vraie nature quand on tape « - » en tête', () => {
    const { block, removed } = normalizeBlock({ kind: 'paragraph', runs: runsFromMarkup('- **cas** : règle') }, undefined)
    expect(block.kind).toBe('rule')
    expect(removed).toBe(2)
    expect(markupFromRuns(block.runs)).toBe('**cas** : règle')
  })
})
