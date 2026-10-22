import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  applyLinks,
  blockText,
  canonicalDef,
  expandDefs,
  syncDefs,
  findGlossaryLinks,
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

  it('réenregistre un renvoi à l’identique', () => {
    const markup = 'la **[[g-vie|vie]]** et {violet}[[g-ame|l’âme]]{/violet}'
    expect(markupFromRuns(runsFromMarkup(markup))).toBe(markup)
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

describe('renvois du glossaire', () => {
  const entries = [
    { id: 'g-un', title: 'Un (`hen`)' },
    { id: 'g-vie', title: 'Vie (`zôê`)' },
    { id: 'g-vie-parfaite', title: 'Vie parfaite' },
    { id: 'g-ame', title: 'Âme (`psuchê`)' },
  ]
  const doc = (text: string) => parseDoc(text).blocks

  it('un renvoi est une mise en forme, réécrite à l’identique', () => {
    const text = '**La {teal}vie{/teal}** vient de [[g-un|l’Un]] et *[[g-vie|vie]]*.'
    expect(serializeDoc(parseDoc(text))).toBe(text)
    const runs = runsFromMarkup('de [[g-un|l’Un]]')
    expect(runs.map((run) => [run.text, run.marks.link])).toEqual([['de ', undefined], ['l’Un', 'g-un']])
  })

  it('lie la première occurrence, hors citations, renvois et entrée elle-même', () => {
    const blocks = doc('Un principe : la vie découle de l’Un, et la vie parfaite aussi.\n\n« L’Un » cite l’âme. Puis l’âme.')
    const hits = findGlossaryLinks(blocks, entries, 'g-ame')
    expect(hits.map((hit) => [hit.target, hit.text])).toEqual([
      ['g-vie', 'vie'],
      ['g-un', 'Un'],
      ['g-vie-parfaite', 'vie parfaite'],
    ])
    const linked = applyLinks(blocks, hits)
    expect(serializeDoc({ head: '', tail: '', blocks: linked })).toBe(
      'Un principe : la [[g-vie|vie]] découle de l’[[g-un|Un]], et la [[g-vie-parfaite|vie parfaite]] aussi.\n\n« L’Un » cite l’âme. Puis l’âme.',
    )
  })

  it('ne relie pas ce qui l’est déjà', () => {
    const blocks = doc('La [[g-vie|vie]] et l’Un.')
    expect(findGlossaryLinks(blocks, entries, '').map((hit) => hit.target)).toEqual(['g-un'])
  })
})

describe('définitions citées', () => {
  const defs = { 'g-vie': 'une {green}activité{/green} de [[g-un|l’Un]]', 'g-un': 'le principe' }
  const text = 'La vie est [def]. Et [def:g-un].'

  it('le marqueur se déplie en sa définition et se réécrit en marqueur', () => {
    const blocks = expandDefs(parseDoc(text).blocks, defs, 'g-vie')
    expect(blockText(blocks[0]!)).toBe('La vie est une activité de l’Un. Et le principe.')
    expect(serializeDoc({ head: '', tail: '', blocks })).toBe(text)
  })

  it('retoucher une définition la met à jour dans toutes ses citations', () => {
    const doc = parseDoc('A [def]. B [def].\n\nC [def:g-un].')
    const blocks = expandDefs(doc.blocks, defs, 'g-vie')
    const first = blocks[0]!
    first.runs = first.runs.map((run) => (run.text.includes('activité') ? { ...run, text: 'énergie' } : run))
    const synced = syncDefs(blocks, defs, 'g-vie')
    expect(synced.changed).toBe(true)
    expect(synced.defs['g-vie']).toBe('une {green}énergie{/green} de [[g-un|l’Un]]')
    expect(blockText(synced.blocks[0]!)).toBe('A une énergie de l’Un. B une énergie de l’Un.')
    expect(synced.defs['g-un']).toBe('le principe')
    expect(serializeDoc({ head: '', tail: '', blocks: synced.blocks })).toBe('A [def]. B [def].\n\nC [def:g-un].')
  })

  it('rien n’est modifié sans retouche', () => {
    const blocks = expandDefs(parseDoc(text).blocks, defs, 'g-vie')
    expect(syncDefs(blocks, defs, 'g-vie').changed).toBe(false)
  })

  it('toute définition du dépôt se relit à l’identique', () => {
    const file = readFileSync('content/courses/plotin/definitions.yaml', 'utf8')
    for (const [id, source] of Object.entries(parse(file) as Record<string, string | { def: string }>)) {
      const def = typeof source === 'string' ? source : source.def
      expect(canonicalDef(def), id).toBe(def)
    }
  })
})
