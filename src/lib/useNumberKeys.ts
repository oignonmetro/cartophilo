import { useEffect } from 'react'
import { useIsDesktop } from './useIsDesktop'

/**
 * Chiffres 1 à 9 comme raccourcis d'une liste de choix (QCM, banque de mots),
 * réservés à l'ordinateur comme les autres raccourcis clavier. `onPick` reçoit
 * le rang (à partir de 0) ; `count` borne les chiffres reconnus. Ignorés quand
 * on tape dans un champ (le chiffre y est du texte) ou avec une touche de
 * modification (Ctrl+1 change d'onglet du navigateur).
 */
export function useNumberKeys(enabled: boolean, count: number, onPick: (index: number) => void) {
  const isDesktop = useIsDesktop()
  useEffect(() => {
    if (!isDesktop || !enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (!/^[1-9]$/.test(event.key)) return
      const index = Number(event.key) - 1
      if (index >= count) return
      event.preventDefault()
      onPick(index)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, enabled, count, onPick])
}
