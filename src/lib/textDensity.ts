const TEXT_SIZE_LADDER = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'] as const

type TextSize = (typeof TEXT_SIZE_LADDER)[number]

/** Classe `md:` compagne de `sentenceTextSize` : un cran plus grand à partir d'un écran de bureau, où la carte a plus de place qu'un téléphone. */
const MD_TEXT_SIZE: Record<TextSize, string> = {
  'text-sm': 'md:text-base',
  'text-base': 'md:text-lg',
  'text-lg': 'md:text-xl',
  'text-xl': 'md:text-2xl',
  'text-2xl': 'md:text-3xl',
  'text-3xl': 'md:text-4xl',
}

export function sentenceTextSizeMd(size: TextSize): string {
  return MD_TEXT_SIZE[size]
}

/**
 * Taille de police d'une phrase à trou, réduite selon sa longueur.
 *
 * Une citation philosophique peut dépasser 500 caractères, largement plus
 * long que ce qu'une taille fixe absorbe une fois le clavier ouvert : la
 * carte déborde alors du haut de l'écran (voir `SessionScreen`, `main`
 * défile mais rien ne devrait normalement en avoir besoin). Réduire la
 * police avec la longueur garde la carte entière à l'écran plutôt que de
 * compter sur ce défilement de secours.
 */
export function sentenceTextSize(base: TextSize, length: number): TextSize {
  const baseIndex = TEXT_SIZE_LADDER.indexOf(base)
  const steps = length > 480 ? 3 : length > 320 ? 2 : length > 180 ? 1 : 0
  return TEXT_SIZE_LADDER[Math.max(0, baseIndex - steps)]!
}
