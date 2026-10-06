import { describe, expect, it } from 'vitest'
import { greekKeysFor } from './greekKeys'

describe('lettres grecques proposées', () => {
  it('propose les livres de la Métaphysique pour une réponse qui en porte un', () => {
    expect(greekKeysFor('Θ10')).toEqual(['Γ', 'Δ', 'Θ', 'Λ'])
    expect(greekKeysFor('Λ4-5')).toEqual(['Γ', 'Δ', 'Θ', 'Λ'])
  })

  it('ne propose rien sans lettre grecque, ni pour un mot grec', () => {
    expect(greekKeysFor('E4')).toBeNull()
    expect(greekKeysFor('Lois d’Athènes (οἱ Νόμοι)')).toBeNull()
  })
})
