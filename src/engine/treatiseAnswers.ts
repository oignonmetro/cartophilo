/**
 * Comparer ce qu'on tape à l'écrit de repérage (voir `TreatiseTypeExercise`) :
 * la numérotation d'un traité (« 53 [I, 1] ») ou son titre.
 */

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 }

/** Rang chronologique, Ennéade (1 à 6) et place dans l'Ennéade, lus dans « 53 [I, 1] » (ou « 53 I 1 », « I, 1 (53) »…). */
export function parseNumbering(text: string): { chrono: number; ennead: number; place: number } | null {
  const tokens = text.toLowerCase().match(/\d+|[ivx]+/g) ?? []
  const roman = tokens.findIndex((token) => /^[ivx]+$/.test(token))
  if (roman < 0 || ROMAN[tokens[roman]!] === undefined) return null
  const digits = tokens.map((token, index) => ({ token, index })).filter(({ token }) => /^\d+$/.test(token))
  if (digits.length !== 2) return null
  // La place est le nombre qui suit le chiffre romain ; l'autre est le rang chronologique.
  const place = digits.find(({ index }) => index > roman)
  if (!place) return null
  const chrono = digits.find((digit) => digit !== place)!
  return { chrono: Number(chrono.token), ennead: ROMAN[tokens[roman]!]!, place: Number(place.token) }
}

export function isNumberingCorrect(expected: string, typed: string): boolean {
  const a = parseNumbering(expected)
  const b = parseNumbering(typed)
  return a !== null && b !== null && a.chrono === b.chrono && a.ennead === b.ennead && a.place === b.place
}

/** Minuscules, sans accents ni ponctuation : « Sur l’âme » et « sur l'ame » sont le même titre. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = row
  }
  return previous[b.length]!
}

/** Les formes acceptées d'un titre : entier, sans ce qui est entre parenthèses, ou avant « , ou » (« … III, ou Sur la vue »). */
function titleForms(title: string): string[] {
  const forms = new Set([title])
  forms.add(title.replace(/\s*\([^)]*\)\s*/g, ' ').trim())
  const before = title.split(/,\s+ou\s+/)[0]
  if (before) forms.add(before)
  return [...forms]
}

/** Les numéros romains d'un titre (« I », « II »…) : s'y tromper, c'est donner un autre traité. */
function numeralsOf(normalized: string): string[] {
  return normalized.split(' ').filter((word) => word in ROMAN)
}

/**
 * Un titre est juste quand ses numéros romains sont exacts (« … I » n'est pas
 * « … II ») et que le reste, sans accents ni ponctuation, ne s'écarte que d'une
 * faute de frappe ou deux.
 */
export function isTitleCorrect(expected: string, typed: string): boolean {
  const given = normalize(typed)
  if (given.length === 0) return false
  const givenNumerals = numeralsOf(given).join(' ')
  const givenWords = given
    .split(' ')
    .filter((word) => !(word in ROMAN))
    .join(' ')
  return titleForms(expected).some((form) => {
    const target = normalize(form)
    if (numeralsOf(target).join(' ') !== givenNumerals) return false
    const words = target
      .split(' ')
      .filter((word) => !(word in ROMAN))
      .join(' ')
    return editDistance(words, givenWords) <= Math.max(2, Math.floor(words.length * 0.08))
  })
}

/** Réponse tapée d'un exercice écrit de repérage : la numérotation ou le titre, selon ce qu'on cherche. */
export function isTreatiseAnswerCorrect(to: 'number' | 'title' | string, expected: string, typed: string): boolean {
  return to === 'number' ? isNumberingCorrect(expected, typed) : isTitleCorrect(expected, typed)
}
