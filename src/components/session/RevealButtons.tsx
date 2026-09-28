import type { Rating } from '@/engine/srs'
import { Button, type ButtonTone } from '@/components/Button'

/**
 * Auto-évaluation après révélation d'une réponse : trois boutons, partagés
 * par toute carte jouée en mode « révéler » (voir `PassageCard`, `GrammarGap`)
 * — la réponse est montrée, l'apprenant dit s'il la savait plutôt que de la
 * faire vérifier au mot près.
 */

/** Les trois auto-évaluations, dans l'ordre des boutons et de leurs touches 1, 2, 3. */
export const RATINGS = [
  { rating: 'again', label: 'À revoir', tone: 'error', key: '1' },
  { rating: 'hard', label: 'Hésitant', tone: 'amber', key: '2' },
  { rating: 'good', label: 'Je savais', tone: 'success', key: '3' },
] as const satisfies readonly { rating: Rating; label: string; tone: ButtonTone; key: string }[]

export function RevealButtons({ isDesktop, onRate }: { isDesktop: boolean; onRate: (rating: Rating) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {RATINGS.map(({ rating, label, tone, key }) => (
        <Button key={rating} tone={tone} onClick={() => onRate(rating)} className="text-xs">
          {/* Sur ordinateur, la touche qui déclenche le bouton (voir les
              raccourcis de chaque carte) : sans elle, rien ne dit qu'elle
              existe. */}
          {isDesktop && (
            <kbd className="mr-2 rounded-md bg-black/15 px-1.5 py-0.5 font-sans text-[0.7rem] font-black">{key}</kbd>
          )}
          {label}
        </Button>
      ))}
    </div>
  )
}
