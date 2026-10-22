import { describe, expect, it } from 'vitest'
import type { Unit } from './schema'
import { definitionRefs, expandDefinitions, sharedGreek, splitTermTitle, termsOf } from './definitions'

const unit = (id: string, title: string) => ({ id, title, lessons: [] }) as unknown as Unit

describe('les définitions du glossaire', () => {
  it('lit la notion et le terme grec dans le titre', () => {
    expect(splitTermTitle('Vie (`zôê`)')).toEqual({ title: 'Vie', greek: 'zôê' })
    expect(splitTermTitle('Raison séminale (`logos spermatikos`)')).toEqual({ title: 'Raison séminale', greek: 'logos spermatikos' })
    expect(splitTermTitle('Degrés de vie')).toEqual({ title: 'Degrés de vie' })
  })

  it('cite une définition par [def] ou [def:id]', () => {
    const definitions = new Map([
      ['g-vie', "l'{green}activité{/green} des réalités incorporelles"],
      ['g-un', 'le premier principe'],
    ])
    expect(definitionRefs('La vie est [def], et l’Un [def:g-un].')).toEqual([null, 'g-un'])
    expect(expandDefinitions('La vie est [def].', 'g-vie', definitions)).toBe("La vie est l'{green}activité{/green} des réalités incorporelles.")
    expect(expandDefinitions('L’Un est [def:g-un].', 'g-vie', definitions)).toBe('L’Un est le premier principe.')
    // Introuvable : laissée telle quelle, `content:check` la signale.
    expect(expandDefinitions('[def:g-rien]', 'g-vie', definitions)).toBe('[def:g-rien]')
  })

  it('forme les notions, sans balisage, et retire un terme grec partagé', () => {
    const units = [unit('g-un', 'Un (`hen`)'), unit('g-unite', 'Unité (`hen`)'), unit('g-vie', 'Vie (`zôê`)'), unit('g-ame', 'Âme (`psuchê`)')]
    const sources = new Map<string, string | { def: string; grec?: string }>([
      ['g-un', 'le premier principe'],
      ['g-unite', 'ce qui fait qu’une chose est cette chose'],
      ['g-vie', "l'{green}activité{/green} des [[g-ame|âmes]]"],
    ])
    const terms = termsOf(units, sources)
    expect(terms.map((term) => term.id)).toEqual(['g-un', 'g-unite', 'g-vie'])
    expect(terms[0]).toEqual({ id: 'g-un', title: 'Un', definition: 'le premier principe', order: 0 })
    expect(terms[2]).toEqual({ id: 'g-vie', title: 'Vie', greek: 'zôê', definition: "l'activité des âmes", order: 2 })
    expect(sharedGreek(units, sources)).toEqual(['hen'])
  })
})
