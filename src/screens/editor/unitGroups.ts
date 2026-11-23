/** Où déposer une unité qu'on glisse dans l'arborescence. */
export type UnitTarget =
  | { kind: 'unit'; unit: string; side: 'before' | 'after' }
  | { kind: 'group'; label: string }
  | { kind: 'loose' }

/**
 * Nouvel ordre d'une piste après le dépôt d'une unité : posée avant ou après
 * une autre, elle en prend le groupe ; déposée sur un groupe, elle passe à
 * sa fin (à la fin de la piste pour un groupe encore vide) ; déposée hors
 * groupe, à la fin de la piste, sans groupe. Un groupe n'existe que par ses
 * unités consécutives (voir `groupUnits`), d'où ces règles de placement.
 */
export function moveUnit(
  units: readonly { id: string; group: string | null }[],
  id: string,
  target: UnitTarget,
): { id: string; group: string | null }[] {
  const all = units.map((unit) => ({ id: unit.id, group: unit.group }))
  const rest = all.filter((unit) => unit.id !== id)
  if (rest.length === all.length) return all
  if (target.kind === 'unit') {
    const at = rest.findIndex((unit) => unit.id === target.unit)
    if (at === -1) return all
    rest.splice(target.side === 'before' ? at : at + 1, 0, { id, group: rest[at]!.group })
    return rest
  }
  if (target.kind === 'group') {
    let last = -1
    rest.forEach((unit, index) => {
      if (unit.group === target.label) last = index
    })
    rest.splice(last === -1 ? rest.length : last + 1, 0, { id, group: target.label })
    return rest
  }
  return [...rest, { id, group: null }]
}
