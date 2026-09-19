const TEXT_SIZE_LADDER = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'] as const

type TextSize = (typeof TEXT_SIZE_LADDER)[number]

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
