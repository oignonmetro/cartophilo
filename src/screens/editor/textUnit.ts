/**
 * Outils purs de l'éditeur pour les unités de texte (voir content/textes.md) :
 * reconstituer le texte d'un paragraphe depuis ses cartes-citation, créer une
 * carte-citation à partir d'une sélection dans le texte, proposer le repère
 * de la leçon suivante. Sans React ni réseau, pour rester testables.
 */

const GAP = '___'

/** Remplit les trous d'une phrase, dans l'ordre, avec les réponses séparées par « ; ». */
export function fillGaps(sentence: string, answer: string): string {
  const parts = sentence.split(GAP)
  const pieces = parts.length > 2 ? answer.split(';').map((piece) => piece.trim()) : [answer.trim()]
  let out = parts[0] ?? ''
  parts.slice(1).forEach((part, index) => {
    out += (pieces[index] ?? '') + part
  })
  return out
}

/** Retire les guillemets français qui encadrent une citation. */
export function unquote(text: string): string {
  return text.trim().replace(/^«\s*/, '').replace(/\s*»$/, '')
}

/** Une carte-citation cite le texte : elle porte un fragment, ou s'ouvre sur « . */
export function isCitation(card: { sentence: string; fragment?: string }): boolean {
  return Boolean(card.fragment) || card.sentence.trim().startsWith('«')
}

/**
 * Le texte d'un paragraphe, reconstitué à partir de ses cartes-citation :
 * pour chaque fragment, la première carte, trous remplis ; les fragments mis
 * bout à bout dans l'ordre 1/n, 2/n… Deux cartes d'un même fragment qui ne
 * redonnent pas le même texte trahissent une coquille : leurs fragments sont
 * signalés dans `conflicts`.
 */
export function reconstructPassage(cards: { sentence: string; answer: string; fragment?: string }[]): {
  text: string
  conflicts: string[]
} {
  const byFragment = new Map<string, Set<string>>()
  for (const card of cards) {
    if (!card.sentence.trim().startsWith('«')) continue
    const key = card.fragment ?? ''
    const texts = byFragment.get(key) ?? new Set<string>()
    texts.add(unquote(fillGaps(card.sentence, card.answer)))
    byFragment.set(key, texts)
  }
  const rank = (fragment: string) => Number(fragment.split('/')[0]) || 0
  const fragments = [...byFragment.keys()].sort((a, b) => rank(a) - rank(b))
  return {
    text: fragments.map((fragment) => [...byFragment.get(fragment)!][0]).join(' '),
    conflicts: fragments.filter((fragment) => byFragment.get(fragment)!.size > 1).map((f) => f || 'sans repère'),
  }
}

/**
 * Bornes de la ou des phrases qui contiennent la sélection `[start, end[` :
 * depuis la fin de la phrase précédente jusqu'à la fin de la dernière, point,
 * point d'interrogation ou d'exclamation compris.
 */
export function sentenceBounds(text: string, start: number, end: number): { start: number; end: number } {
  let from = start
  while (from > 0 && !/[.!?]/.test(text[from - 1]!)) from--
  while (from < text.length && /\s/.test(text[from]!)) from++
  let to = Math.max(end, from)
  while (to < text.length && !/[.!?]/.test(text[to]!)) to++
  if (to < text.length) to++
  return { start: from, end: to }
}

/**
 * Une carte-citation trouée sur la sélection : la phrase qui la contient (ou
 * tout le paragraphe), entre guillemets français, la sélection remplacée par
 * `___`. `null` si la sélection est vide.
 */
export function citationCardFromSelection(
  text: string,
  start: number,
  end: number,
  scope: 'sentence' | 'paragraph',
): { sentence: string; answer: string } | null {
  const answer = text.slice(start, end).trim()
  if (!answer) return null
  // Les espaces sélectionnés en bord de sélection restent dans la phrase.
  const lead = text.slice(start, end).length - text.slice(start, end).trimStart().length
  const trail = text.slice(start, end).length - text.slice(start, end).trimEnd().length
  const gapStart = start + lead
  const gapEnd = end - trail
  const bounds = scope === 'paragraph' ? { start: 0, end: text.length } : sentenceBounds(text, gapStart, gapEnd)
  const before = text.slice(bounds.start, gapStart)
  const after = text.slice(gapEnd, bounds.end)
  return { sentence: `« ${(before + GAP + after).trim()} »`, answer }
}

/**
 * Une carte à plusieurs trous déclinée en autant de cartes à un trou, les
 * autres trous remplis : ce qu'exige une leçon classique, dont l'exercice
 * ne lit que le premier trou (une leçon de texte, elle, garde la carte).
 */
export function splitMultiGap(sentence: string, answer: string): { sentence: string; answer: string }[] {
  const parts = sentence.split(GAP)
  if (parts.length <= 2) return [{ sentence, answer }]
  const pieces = answer.split(';').map((piece) => piece.trim())
  if (pieces.length !== parts.length - 1) return [{ sentence, answer }]
  return pieces.map((piece, index) => ({
    sentence: parts.reduce((acc, part, j) => (j === 0 ? part : acc + (j - 1 === index ? GAP : pieces[j - 1]) + part), ''),
    answer: piece,
  }))
}

/** Le repère de la leçon suivante : « §n+1 » après le plus grand « §n » déjà pris, « §1 » sinon. */
export function nextParagraphLabel(labels: (string | null)[]): string {
  let max = 0
  for (const label of labels) {
    const match = label?.match(/^§\s*(\d+)/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `§${max + 1}`
}
