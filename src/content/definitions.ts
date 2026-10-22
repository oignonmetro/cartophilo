import { plainInline } from './notes'
import type { TermEntry, Unit } from './schema'

/**
 * Les définitions du glossaire (voir `termEntrySchema`) : écrites à part, dans
 * `content/courses/<id>/definitions.yaml`, une par entrée, sous l'identifiant
 * de son unité :
 *
 *     g-vie: l'activité d'une réalité, plus ou moins claire selon son degré
 *     g-un:
 *       def: le principe premier, sans parties ni forme, …
 *       grec: to hen          # quand le titre n'en porte pas, ou pour l'y corriger
 *
 * La notion et le terme grec se lisent dans le titre de l'entrée
 * (« Vie (`zôê`) ») : ils ne s'écrivent qu'une fois.
 */
export type DefinitionSource = string | { def: string; grec?: string; notion?: string }

/** « Vie (`zôê`) » → la notion « Vie » et le terme grec « zôê » ; un titre sans grec n'a que sa notion. */
export function splitTermTitle(title: string): { title: string; greek?: string } {
  const match = /^(.*?)\s*\(`([^`]+)`\)\s*$/.exec(title)
  if (!match) return { title: title.trim() }
  return { title: match[1]!.trim(), greek: match[2]!.trim() }
}

/** `[def]` cite la définition de l'entrée même ; `[def:g-un]`, celle d'une autre. */
const DEF = /\[def(?::([a-z0-9-]+))?\]/g

/** Les définitions qu'un texte cite (`null` pour `[def]`, celle de l'entrée même). */
export function definitionRefs(text: string): (string | null)[] {
  return [...text.matchAll(DEF)].map((match) => match[1] ?? null)
}

/**
 * Remplace chaque `[def]` par la définition qu'il cite. `own` est l'entrée du
 * texte (pour `[def]` seul) ; une définition introuvable est laissée telle
 * quelle, `content:check` la signale.
 */
export function expandDefinitions(text: string, own: string | undefined, definitions: ReadonlyMap<string, string>): string {
  return text.replace(DEF, (whole, id: string | undefined) => {
    const target = id ?? own
    return (target && definitions.get(target)) ?? whole
  })
}

/** Le texte de la définition, quelle que soit la forme où elle est écrite. */
export function definitionText(source: DefinitionSource): string {
  return typeof source === 'string' ? source : source.def
}

/**
 * Les notions d'un glossaire, dans l'ordre de ses entrées : celles qui ont
 * leur définition, réduite au texte (sans balisage ni renvoi). Deux
 * notions qui partagent un même terme grec (« Un » et « Unité », tous deux
 * *hen*) le perdent toutes deux : le grand exercice ne saurait laquelle est
 * la bonne.
 */
export function termsOf(units: readonly Unit[], sources: ReadonlyMap<string, DefinitionSource>): TermEntry[] {
  const terms = units.flatMap((unit) => {
    const source = sources.get(unit.id)
    if (source === undefined) return []
    const parsed = splitTermTitle(unit.title)
    const greek = (typeof source === 'object' && source.grec) || parsed.greek
    const title = (typeof source === 'object' && source.notion) || parsed.title
    return [{ id: unit.id, title, ...(greek ? { greek } : {}), definition: plainInline(definitionText(source).trim()) }]
  })
  const shared = new Set(
    terms
      .map((term) => term.greek)
      .filter((greek, index, all) => greek !== undefined && all.indexOf(greek) !== index),
  )
  return terms.map((term, order) => {
    const { greek, ...rest } = term
    return greek !== undefined && !shared.has(greek) ? { ...rest, greek, order } : { ...rest, order }
  })
}

/** Les termes grecs que deux notions se disputent (voir `termsOf`). */
export function sharedGreek(units: readonly Unit[], sources: ReadonlyMap<string, DefinitionSource>): string[] {
  const greeks = units.flatMap((unit) => {
    const source = sources.get(unit.id)
    if (source === undefined) return []
    return [(typeof source === 'object' && source.grec) || splitTermTitle(unit.title).greek].filter(Boolean) as string[]
  })
  return [...new Set(greeks.filter((greek, index) => greeks.indexOf(greek) !== index))]
}
