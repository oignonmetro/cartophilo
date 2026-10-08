import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { createRng, seedFrom, shuffle } from '@/engine/rng'
import { useSessionSounds } from './useSessionSounds'

/**
 * Plateau d'association générique : deux colonnes de jetons à relier.
 *
 * Le vocabulaire l'utilise pour relier mots et traductions, la conjugaison
 * pour relier personnes et formes. Seuls les libellés changent — la mécanique
 * (sélection, validation, comptage des erreurs) est la même.
 */

export interface Pair {
  /** Identifiant de l'élément noté par la révision espacée. */
  id: string
  left: string
  right: string
}

type Side = 'left' | 'right'

interface Token {
  key: string
  pairId: string
  label: string
  side: Side
}

/**
 * Espace pris par tout ce qui n'est pas la grille : l'en-tête de session, la
 * consigne au-dessus, les espacements qui les séparent — et, quand
 * `ConjugationMatch` mélange plusieurs verbes, sa carte de rappel (verbes et
 * temps) au-dessus de la consigne, le plus grand des chromes possibles.
 * Mesuré sur l'écran réel plutôt que deviné — un budget trop court ferait
 * déborder la grille. Trop long ne coûte rien pour les cas plus légers : la
 * plupart des tailles de grille sont déjà plafonnées par `maxCard` avant
 * d'atteindre cette limite, donc le surplus de budget ne les rétrécit pas.
 */
const CHROME_BUDGET = 250
/** `gap-3` entre deux jetons d'une même colonne, en pixels. */
const ROW_GAP = 12

/**
 * Remplissage et taille de texte d'un jeton, selon la densité de la grille.
 *
 * Le plancher de `cardHeight` ne sert à rien si le remplissage à lui seul
 * dépasse déjà cette taille : un `py-4` et un `text-lg` pensés pour quatre
 * paires imposent une soixantaine de pixels même quand la grille en réclame
 * moins. Passé quatre paires, remplissage et texte se resserrent avec la
 * grille plutôt que de la forcer à déborder derrière eux.
 */
interface Density {
  minCard: number
  maxCard: number
  padding: string
  /** Taille de départ, avant l'ajustement par jeton de `textSizeFor`. */
  baseText: (typeof TEXT_SCALE)[number]
}

const COMFORTABLE: Density = { minCard: 56, maxCard: 80, padding: 'px-3 py-4', baseText: 'text-lg' }
const COMPACT: Density = { minCard: 40, maxCard: 64, padding: 'px-2 py-2', baseText: 'text-sm' }

function densityFor(rows: number): Density {
  return rows > 4 ? COMPACT : COMFORTABLE
}

/**
 * Paliers de taille de texte, du plus grand au plus petit.
 *
 * Les deux colonnes d'une manche partagent la même hauteur de jeton (voir
 * `cardHeight`), mais pas la même longueur de libellé — une référence tient
 * en deux mots, l'affirmation qu'elle illustre en une phrase entière. Fixer
 * une seule taille pour les deux, pensée pour le libellé le plus court,
 * ferait déborder le plus long ; la penser pour le plus long écraserait les
 * jetons courts dans une police trop petite pour leur peu de texte. Chaque
 * jeton choisit donc sa propre taille, resserrée selon sa propre longueur.
 */
const TEXT_SCALE = ['text-lg', 'text-base', 'text-sm', 'text-xs'] as const

/** Corps et interligne, en pixels, de chaque palier de `TEXT_SCALE` (Tailwind). */
const TEXT_METRICS: Record<(typeof TEXT_SCALE)[number], [number, number]> = {
  'text-lg': [18, 28],
  'text-base': [16, 24],
  'text-sm': [14, 20],
  'text-xs': [12, 16],
}

/** Largeur moyenne d'un caractère gras, en fraction du corps (césures comprises). */
const CHAR_WIDTH = 0.55
/**
 * Ce que le texte suppose pris hors de la grille : plus juste que `CHROME_BUDGET`
 * (qui garantit que la grille ne déborde pas) puisqu'une rangée plus haute que
 * prévu agrandit la grille sans la faire déborder, tant qu'il reste de la place.
 */
const TEXT_CHROME = 200
/** Largeur maximale de la grille, en pixels : au-delà, la mise en page ne s'élargit plus. */
const MAX_BOARD_WIDTH = 480

/** Le plus petit des paliers donnés. */
function smallest(sizes: readonly string[]): string {
  return sizes.reduce((a, b) => (TEXT_SCALE.indexOf(b as never) > TEXT_SCALE.indexOf(a as never) ? b : a))
}

/**
 * Le plus grand palier dont le libellé tient dans la hauteur d'une rangée.
 *
 * Un seuil de longueur fixe rétrécissait le texte même quand la case avait la
 * place : sur un grand téléphone, une thèse de cent caractères restait en petit
 * dans une case à moitié vide. On estime donc le nombre de lignes d'après la
 * largeur d'une case, et l'on garde la plus grande taille qui tient dans le
 * budget d'une rangée (la hauteur visible, partagée entre les rangées).
 */
function textSizeFor(label: string, density: Density, rows: number, view: { width: number; height: number }): string {
  const start = TEXT_SCALE.indexOf(density.baseText)
  const boardWidth = Math.min(view.width, MAX_BOARD_WIDTH) - 32
  const textWidth = (boardWidth - ROW_GAP) / 2 - 24
  const rowBudget = (view.height - TEXT_CHROME - ROW_GAP * (rows - 1)) / rows
  const padding = density === COMPACT ? 16 : 32
  for (let index = start; index < TEXT_SCALE.length; index++) {
    const size = TEXT_SCALE[index]!
    const [px, lineHeight] = TEXT_METRICS[size]
    const lines = Math.ceil((label.length * px * CHAR_WIDTH) / textWidth)
    if (lines * lineHeight + padding <= rowBudget) return size
  }
  return TEXT_SCALE[TEXT_SCALE.length - 1]!
}

/**
 * Hauteur des jetons, plafonnée par la densité et adaptée au nombre de
 * paires.
 *
 * Une taille fixe convenait à quatre paires mais débordait à six : la moitié
 * verticale de l'écran change d'un appareil à l'autre (barre d'adresse
 * repliée ou non, encoche…), ce qu'aucune constante ne peut anticiper. `dvh`
 * suit la hauteur réellement visible, et la division par le nombre de lignes
 * garantit que la grille tient toujours, quel que soit le nombre de paires —
 * plutôt que de compter sur le défilement de secours (`SessionScreen`) pour
 * un cas qui devrait simplement s'ajuster.
 */
function cardHeight(rows: number, density: Density): string {
  const available = `(100dvh - ${CHROME_BUDGET}px - ${ROW_GAP * (rows - 1)}px) / ${rows}`
  return `clamp(${density.minCard}px, calc(${available}), ${density.maxCard}px)`
}

/** Dimensions visibles de la fenêtre, tenues à jour (rotation, barre d'adresse). */
function useViewport() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight })
  const [view, setView] = useState(read)
  useEffect(() => {
    const onResize = () => setView(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return view
}

export function PairBoard({
  seed,
  pairs,
  prompt,
  italicSides,
  onDone,
}: {
  /** Graine du mélange : la même manche se présente toujours pareil. */
  seed: string
  pairs: readonly Pair[]
  prompt: string
  /** Colonnes (gauche, droite) dont les libellés se composent en italique (des titres d'œuvres). */
  italicSides?: readonly [boolean, boolean]
  onDone: (result: { missedIds: string[] }) => void
}) {
  const sounds = useSessionSounds()
  const columns = useMemo(() => buildColumns(seed, pairs), [seed, pairs])
  const expected = useMemo(() => new Map(pairs.map((pair) => [pair.id, pair.right])), [pairs])
  const density = densityFor(pairs.length)
  const view = useViewport()
  // Une taille par colonne, celle du libellé le plus long : des textes de tailles
  // différentes dans une même colonne feraient une grille bancale.
  const columnText = {
    left: smallest(pairs.map((pair) => textSizeFor(pair.left, density, pairs.length, view))),
    right: smallest(pairs.map((pair) => textSizeFor(pair.right, density, pairs.length, view))),
  }
  const height = cardHeight(pairs.length, density)

  const [selected, setSelected] = useState<Token | null>(null)
  // Deux ensembles distincts : les jetons consommés (pour l'affichage) et les
  // paires résolues (pour la fin de manche). Ils divergent quand deux paires
  // partagent le même libellé — « sought » est à la fois prétérit et participe.
  const [solvedKeys, setSolvedKeys] = useState<Set<string>>(new Set())
  const [solvedPairs, setSolvedPairs] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string | null>(null)
  const [missed, setMissed] = useState<Set<string>>(new Set())

  function pick(token: Token) {
    if (solvedKeys.has(token.key)) return

    if (!selected) {
      setSelected(token)
      return
    }

    if (selected.key === token.key) {
      setSelected(null)
      return
    }

    // Deux jetons du même côté : on déplace simplement la sélection.
    if (selected.side === token.side) {
      setSelected(token)
      return
    }

    const [left, right] = selected.side === 'left' ? [selected, token] : [token, selected]

    // On compare les libellés, pas les identifiants : quand deux formes sont
    // homographes, choisir l'un ou l'autre jeton est également correct.
    if (expected.get(left.pairId) === right.label) {
      setSolvedKeys((current) => new Set(current).add(left.key).add(right.key))
      const nextPairs = new Set(solvedPairs).add(left.pairId)
      setSolvedPairs(nextPairs)
      setSelected(null)
      // Chaque paire monte d'un degré de l'accord : la manche s'entend se
      // remplir, et la dernière paire arrive en haut. C'est ce que le score
      // final ne dit pas — qu'on progresse, pendant qu'on progresse.
      sounds.note(nextPairs.size - 1)
      if (nextPairs.size === pairs.length) onDone({ missedIds: [...missed] })
      return
    }

    setMissed((current) => new Set(current).add(left.pairId).add(right.pairId))
    setWrong(token.key)
    window.setTimeout(() => setWrong(null), 350)
    setSelected(null)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-faint">{prompt}</p>
      </div>

      {/* La grille se centre dans l'espace disponible plutôt que de s'aligner
          en haut : avec quatre paires, elle ne remplissait qu'un quart de
          l'écran et laissait le reste vide, comme une carte oubliée là. */}
      <div className="flex flex-1 flex-col justify-center">
        {/* Une seule grille, rangée par rangée (un jeton de chaque colonne), et
            `auto-rows-fr` : toutes les rangées prennent la hauteur de la plus
            haute. Deux colonnes indépendantes laissaient la colonne des libellés
            longs, étroite sur téléphone, grandir plus que l'autre — des jetons
            de tailles inégales, d'un côté à l'autre comme d'une rangée à l'autre. */}
        <div className="grid auto-rows-fr grid-cols-2 gap-3">
          {columns[0].flatMap((leftToken, index) =>
            [leftToken, columns[1][index]].map((token) =>
              token ? (
                <TokenButton
                  key={token.key}
                  token={token}
                  height={height}
                  padding={density.padding}
                  textSize={columnText[token.side]}
                  italic={italicSides?.[token.side === 'left' ? 0 : 1] ?? false}
                  solved={solvedKeys.has(token.key)}
                  selected={selected?.key === token.key}
                  shaking={wrong === token.key}
                  onPick={pick}
                />
              ) : null,
            ),
          )}
        </div>
      </div>
    </div>
  )
}

function TokenButton({
  token,
  height,
  padding,
  textSize,
  italic,
  solved,
  selected,
  shaking,
  onPick,
}: {
  token: Token
  /** Hauteur calculée par `cardHeight`, en `min-height` CSS. */
  height: string
  /** Remplissage de `densityFor`. */
  padding: string
  /** Taille de texte propre au jeton, voir `textSizeFor`. */
  textSize: string
  italic: boolean
  solved: boolean
  selected: boolean
  shaking: boolean
  onPick: (token: Token) => void
}) {
  const tone = solved
    ? 'border-success bg-success/15 text-success opacity-60'
    : selected
      ? 'border-teal bg-teal/15 text-teal'
      : 'border-line bg-paper text-ink'

  return (
    <motion.button
      type="button"
      onClick={() => onPick(token)}
      disabled={solved}
      animate={shaking ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ minHeight: height }}
      className={`rounded-2xl border-2 text-center font-bold break-words transition-colors ${padding} ${textSize} ${tone} ${italic ? 'italic' : ''}`}
    >
      {token.label}
    </motion.button>
  )
}

/** Les deux colonnes sont mélangées indépendamment : jamais de paire alignée. */
function buildColumns(seed: string, pairs: readonly Pair[]): [Token[], Token[]] {
  const rng = createRng(seedFrom(seed))
  const left = pairs.map((pair) => ({
    key: `left:${pair.id}`,
    pairId: pair.id,
    label: pair.left,
    side: 'left' as const,
  }))
  const right = pairs.map((pair) => ({
    key: `right:${pair.id}`,
    pairId: pair.id,
    label: pair.right,
    side: 'right' as const,
  }))
  return [shuffle(left, rng), shuffle(right, rng)]
}
