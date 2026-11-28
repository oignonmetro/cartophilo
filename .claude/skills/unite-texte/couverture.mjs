// Quelle part d'un texte les cartes-citation font-elles apprendre ? Pour chaque
// leçon, la proportion des mots qui passent dans au moins un trou (voir la
// skill unite-texte, § 5, « Le niveau de citations »).
//
// Usage, depuis la racine du dépôt :
//   node .claude/skills/unite-texte/couverture.mjs content/courses/<cours>/units/<id>.yaml […]
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const GAP = '___'
const MARK = '\u0001'

/** Le texte sans ses mises en forme ni ses espaces insécables ; les trous sont préservés. */
const clean = (s) =>
  s
    .replaceAll(GAP, MARK)
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\{\/?[a-z]+\}/g, '')
    .replace(/__|\*|`/g, '')
    .replace(/[’‘]/g, "'")
    // Une citation dans la citation s'écrit « » dans le texte, "" dans une carte.
    .replace(/[«»“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
const squash = (s) => s.replace(/\s/g, '')

/** Le même découpage que l'application (voir `isCitation` dans `src/content/course.ts`). */
const isCitation = (card) => Boolean(card.fragment) || (card.sentence.trim().startsWith('«') && card.sentence.trim().endsWith('»'))

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Donner au moins un fichier d’unité.')
  process.exit(1)
}

for (const file of files) {
  const unit = parse(readFileSync(file, 'utf8'))
  console.log(`\n${unit.id}`)
  let total = 0
  let covered = 0
  let cards = 0
  const lost = []
  for (const lesson of unit.lessons ?? []) {
    const raw = lesson.passage?.text
    if (!raw) continue
    const text = clean(raw)
    const flat = squash(text)
    const mask = new Array(flat.length).fill(false)
    let count = 0
    for (const card of lesson.points ?? []) {
      if (!isCitation(card)) continue
      count++
      const pieces = squash(clean(card.sentence)).split(MARK)
      const answers = pieces.length > 2 ? String(card.answer).split(/\s*;\s*/) : [String(card.answer)]
      // Les guillemets qui encadrent la carte ne sont pas dans le texte.
      pieces[0] = pieces[0].replace(/^"/, '')
      pieces[pieces.length - 1] = pieces[pieces.length - 1].replace(/"$/, '')
      let filled = pieces[0]
      const spans = []
      for (let i = 1; i < pieces.length; i++) {
        const answer = squash(clean(answers[i - 1] ?? ''))
        spans.push([filled.length, filled.length + answer.length])
        filled += answer + pieces[i]
      }
      const at = flat.indexOf(filled)
      if (at < 0) {
        lost.push(card.id)
        continue
      }
      for (const [from, to] of spans) mask.fill(true, at + from, at + to)
    }
    let words = 0
    let hit = 0
    for (const word of text.matchAll(/[\p{L}\p{N}]+/gu)) {
      words++
      if (mask[squash(text.slice(0, word.index)).length]) hit++
    }
    total += words
    covered += hit
    cards += count
    console.log(
      `  ${String(Math.round((100 * hit) / words || 0)).padStart(3)} %  ${String(count).padStart(3)} cartes  ${String(words).padStart(4)} mots  ${lesson.id}  ${lesson.title}`,
    )
  }
  const share = total ? (100 * covered) / total : 0
  const level = cards === 0 ? 'aucune citation' : share >= 90 ? 'niveau 4' : share >= 57 ? 'niveau 3' : share >= 30 ? 'niveau 2' : 'niveau 1'
  console.log(`  TOTAL ${share.toFixed(1)} % (${covered}/${total} mots), ${cards} cartes-citation : ${level}`)
  if (lost.length) console.log(`  Cartes dont le texte ne se retrouve pas dans leur leçon : ${lost.join(', ')}`)
}
