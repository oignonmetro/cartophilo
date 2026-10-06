/**
 * Lettres grecques proposées sous le champ d'une phrase à trou dont la
 * réponse en contient (les livres de la Métaphysique : Θ10, Λ4-5, Δ7…) : sur
 * un clavier français, `Θ` ne se tape pas.
 *
 * Pas tout l'alphabet, seulement les lettres qui servent à distinguer les
 * livres d'Aristote — celles qui ne ressemblent à aucune lettre latine. Les
 * autres (Α, Β, Ε, Ζ, Η, Ι, Κ, Μ, Ν) s'écrivent déjà avec le clavier latin dans
 * le contenu (`E4`, `Z7`), et la comparaison les confond (voir `normalizeForm`).
 */
export const METAPHYSICS_BOOK_LETTERS = ['Γ', 'Δ', 'Θ', 'Λ'] as const

const GREEK = /[\u0370-\u03FF\u1F00-\u1FFF]/g

/**
 * Touches à afficher pour une réponse attendue, ou `null` : aucune lettre
 * grecque dans la réponse, ou une lettre qui n'est pas un livre de la
 * Métaphysique (un mot grec entier, par exemple, qu'un clavier de quatre
 * touches n'aiderait pas à écrire — il reste le mode « révéler »).
 */
export function greekKeysFor(expected: string): readonly string[] | null {
  const letters = expected.match(GREEK)
  if (!letters) return null
  const allowed = new Set<string>(METAPHYSICS_BOOK_LETTERS)
  return letters.every((letter) => allowed.has(letter.toUpperCase())) ? METAPHYSICS_BOOK_LETTERS : null
}
