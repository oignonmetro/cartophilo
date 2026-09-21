import { useEffect, useState } from 'react'

/**
 * Vrai à partir d'un écran assez large pour ressembler à un ordinateur, pas
 * seulement un téléphone ou une tablette en portrait — le même seuil que le
 * `md:` de Tailwind, déjà utilisé partout ailleurs pour la mise en page de
 * bureau (voir `SessionScreen`, `LibraryScreen`…).
 *
 * Sert à n'armer certains raccourcis clavier (voir `RuleNote`, `GrammarGap`,
 * `ClozeSentence`) que là où un clavier physique est la norme : sur
 * téléphone, une touche « Entrée » qui validerait ou sauterait une question
 * toute seule serait plus une source d'erreurs qu'un confort.
 */
const QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return desktop
}
