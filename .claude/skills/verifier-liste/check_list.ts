/**
 * Vérifie une liste de cartes avant son import dans l'éditeur visuel
 * (« Importer une liste… » d'une unité de texte), avec le même lecteur que
 * l'éditeur : ce que ce script voit, l'import le verra.
 *
 *   npx tsx .claude/skills/verifier-liste/check_list.ts liste.txt [--texte texte.txt]
 *
 * `--texte` : le texte de référence (la traduction retenue). Chaque
 * carte-citation, trous remplis, doit s'y retrouver mot pour mot.
 *
 * Ne juge que ce qui se vérifie mécaniquement ; le choix des trous et la
 * qualité des cartes-explication restent une relecture (voir SKILL.md).
 * Code de sortie 1 s'il reste une erreur bloquante.
 */
import { readFileSync } from 'node:fs'
import { importTextUnitRows, type ImportedTextCard } from '../../../tools/content/quizletImport'
import { fillGaps, reconstructPassage, unquote } from '../../../src/screens/editor/textUnit'

type Level = 'erreur' | 'attention' | 'info'
interface Finding {
  level: Level
  line?: number
  rule: string
  detail: string
}

const args = process.argv.slice(2)
const listPath = args.find((a) => !a.startsWith('--'))
const textIndex = args.indexOf('--texte')
const textPath = textIndex >= 0 ? args[textIndex + 1] : undefined
if (!listPath) {
  console.error('usage : check_list.ts liste.txt [--texte texte.txt]')
  process.exit(2)
}

const raw = readFileSync(listPath, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
const findings: Finding[] = []
const add = (level: Level, rule: string, detail: string, line?: number) => findings.push({ level, rule, detail, line })
const short = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

if (/Ã[©¨ ª§®´¹»]|â€/.test(raw)) {
  add('erreur', 'encodage', 'caractères du type « Ã© » ou « â€™ » : le fichier a été mal encodé, à réexporter en UTF-8')
}

// Lignes source (non vides), pour les contrôles qui portent sur la ligne brute.
const rows = raw
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean)

rows.forEach((row, i) => {
  const line = i + 1
  const seps = row.split('::').length - 1
  if (seps > 1) add('erreur', 'séparateur', `« :: » apparaît ${seps} fois : l'import coupe au premier`, line)
  if (seps === 0 && row.includes('\t') && row.split('\t').length > 2)
    add('erreur', 'séparateur', 'plusieurs tabulations : l\'import coupe à la première', line)
  if (/_{4,}/.test(row)) add('erreur', 'trou', `« ${row.match(/_{4,}/)![0]} » : un trou s'écrit avec exactement trois « _ »`, line)
  if (/(?<!_)__(?!_)/.test(row.split('::')[0] ?? '') && !/__[^_]+__/.test(row))
    add('attention', 'trou', '« __ » isolé : trou mal tapé (il en faut trois) ou soulignement non refermé', line)
  if (/^§\s*\d+\s*[^,\d\s]/.test(row) || /^§\s*\d+\s*,[^:]*$/.test(row.split('::')[0] ?? ''))
    add('erreur', 'préfixe', 'préfixe de paragraphe mal formé : attendu « §n, Intitulé : » (virgule, puis deux-points suivi d\'une espace)', line)
  if (/\(\s*\d+\s*\/\s*\d+\s*\)\s*::/.test(row) === false && /\(\s*\d+\s*\/\s*\d+\s*\)/.test(row.split('::')[0] ?? '') && !/\(\s*\d+\s*\/\s*\d+\s*\)\s*$/.test(row.split('::')[0] ?? ''))
    add('attention', 'fragment', 'un « (k/n) » ne compte comme repère de fragment qu\'à la toute fin du recto', line)
})

const parsed = importTextUnitRows(raw)
for (const row of parsed.skipped) add('erreur', 'ligne ignorée', `${row.reason} : « ${short(row.row)} »`, row.line)

const cards = parsed.cards
if (cards.length && !cards[0]!.paragraph)
  add('attention', 'préfixe', 'la première carte n\'a pas de préfixe « §n, Intitulé : » : le début de la liste restera à découper à la main', cards[0]!.sourceLine)

// Marqueurs de mise en forme : ceux que l'app sait lire.
for (const card of cards) {
  const line = card.sourceLine
  for (const [field, value] of [
    ['recto', card.sentence],
    ['verso', card.answer],
  ] as const) {
    const noBold = value.replace(/\*\*[^*]+\*\*/g, '')
    if ((value.match(/\*\*/g) ?? []).length % 2) add('erreur', 'mise en forme', `${field} : « ** » non refermé`, line)
    else if ((noBold.match(/\*/g) ?? []).length % 2) add('erreur', 'mise en forme', `${field} : « * » non refermé`, line)
    if (/\*\*[^*]*\*[^*]+\*[^*]*\*\*/.test(value))
      add('erreur', 'mise en forme', `${field} : italique dans un gras, que l'app affiche avec ses astérisques`, line)
    if ((value.match(/`/g) ?? []).length % 2) add('erreur', 'mise en forme', `${field} : « \` » non refermé`, line)
    if (/"/.test(value)) add('attention', 'guillemets', `${field} : guillemets droits restants (citation dans la citation ?), à passer en « »`, line)
  }
  if (card.needsReview && !/"/.test(card.sentence)) {
    const gaps = card.sentence.split('___').length - 1
    add('erreur', 'trous/réponses', `${gaps} trous mais ${card.answer.split(' ; ').length} réponse(s) : séparer les réponses par « ; », dans l'ordre des trous`, line)
  }
  if (!card.answer.trim()) add('erreur', 'réponse', 'réponse vide', line)
  if (/—/.test(rows[line - 1]!.split(/«[^»]*»/).join('')))
    add('info', 'ponctuation', 'tiret cadratin hors citation : l\'import le remplacera par une virgule, vérifier que la phrase reste juste', line)
}

// Citation ou explication : une citation s'ouvre sur « et se referme.
for (const card of cards) {
  if (card.fragment && !card.sentence.trim().startsWith('«'))
    add('attention', 'citation', 'repère de fragment sur une carte qui ne s\'ouvre pas sur « : comptée comme citation, mais son texte ne servira pas au paragraphe reconstitué ; retirer le (k/n) si c\'est une explication', card.sourceLine)
  if (card.kind === 'citation' && card.sentence.trim().startsWith('«') && !card.sentence.trim().endsWith('»'))
    add('attention', 'citation', 'citation ouverte par « mais qui ne se termine pas par » : texte coupé, ou explication qui commence par une citation ?', card.sourceLine)
}

// Paragraphes : numéros, intitulés, fragments, ordre des cartes.
const paragraphs = new Map<string, ImportedTextCard[]>()
for (const card of cards) {
  const key = card.paragraph?.number ?? '?'
  paragraphs.set(key, [...(paragraphs.get(key) ?? []), card])
}
const headings = new Map<string, Set<string>>()
for (const card of cards) {
  if (!card.paragraph) continue
  const set = headings.get(card.paragraph.number) ?? new Set()
  set.add(card.paragraph.heading)
  headings.set(card.paragraph.number, set)
}
for (const [number, set] of headings)
  if (set.size > 1) add('attention', 'préfixe', `§${number} porte plusieurs intitulés (${[...set].map((h) => `« ${h} »`).join(', ')}) : une coquille éclaterait la leçon`)

const order = cards.filter((c) => c.paragraph).map((c) => Number(c.paragraph!.number))
const seen = [...new Set(order)]
seen.forEach((n, i) => {
  if (i > 0 && n < seen[i - 1]!) add('attention', 'paragraphes', `§${n} revient après §${seen[i - 1]} : cartes d'un même paragraphe séparées ?`)
  if (i > 0 && n > seen[i - 1]! + 1) add('info', 'paragraphes', `pas de carte entre §${seen[i - 1]} et §${n} (paragraphe(s) absent(s) : voulu ?)`)
})

for (const [number, group] of paragraphs) {
  const label = number === '?' ? 'avant le premier §' : `§${number}`
  const citations = group.filter((c) => c.kind === 'citation')
  const explanations = group.filter((c) => c.kind === 'explication')
  if (!citations.length) add('info', 'paragraphes', `${label} : aucune carte-citation (introduction ou ouverture ?)`)

  // Fragments k/n : même n, k de 1 à n, tous présents.
  const fragments = citations.map((c) => c.fragment).filter((f): f is string => Boolean(f))
  const totals = new Set(fragments.map((f) => f.split('/')[1]))
  if (totals.size > 1) add('erreur', 'fragment', `${label} : fragments sur des totaux différents (${[...totals].map((t) => `/${t}`).join(', ')})`)
  for (const f of new Set(fragments)) {
    const [k, n] = f.split('/').map(Number)
    if (!k || !n || k > n) add('erreur', 'fragment', `${label} : repère « ${f} » impossible`)
  }
  if (totals.size === 1) {
    const n = Number([...totals][0])
    const missing = Array.from({ length: n }, (_, i) => `${i + 1}/${n}`).filter((f) => !fragments.includes(f))
    if (missing.length) add('attention', 'fragment', `${label} : aucune carte pour le(s) fragment(s) ${missing.join(', ')}`)
  }
  if (fragments.length && citations.some((c) => !c.fragment))
    add('attention', 'fragment', `${label} : des citations avec repère (k/n) et d'autres sans, ligne(s) ${citations.filter((c) => !c.fragment).map((c) => c.sourceLine).join(', ')}`)

  // Le texte reconstitué : deux cartes d'un même fragment doivent redonner le
  // même texte. Deux textes qui partagent leur début ou leur fin mais
  // divergent trahissent une coquille ; deux phrases sans rapport sont des
  // morceaux distincts rangés sous le même repère, dont l'éditeur ne gardera
  // qu'un pour le texte du paragraphe.
  const { conflicts } = reconstructPassage(citations.filter((c) => c.sentence.trim().startsWith('«')))
  for (const fragment of conflicts) {
    const variants = citations
      .filter((c) => c.sentence.trim().startsWith('«') && (c.fragment ?? 'sans repère') === fragment)
      .map((c) => ({ line: c.sourceLine, text: unquote(fillGaps(c.sentence, c.answer)) }))
    const distinct: number[] = []
    variants.forEach((v, i) => {
      const previous = variants.slice(0, i)
      if (previous.some((p) => p.text === v.text || p.text.includes(v.text) || v.text.includes(p.text))) return
      const close = previous.find((p) => sharedWords(p.text, v.text) >= 4)
      if (close)
        add('erreur', 'texte', `${label}, fragment ${fragment} : même passage que la ligne ${close.line}, mais un mot diffère (${firstDifference(close.text, v.text)})`, v.line)
      else if (i > 0) distinct.push(v.line)
    })
    if (distinct.length)
      add('attention', 'texte', `${label}, fragment ${fragment} : cite des phrases distinctes (lignes ${[variants[0]!.line, ...distinct].join(', ')}) ; le texte du paragraphe reconstitué n'en gardera qu'une, le compléter dans l'étape « Découper » de l'import`)
  }

  // Ordre : citations puis explications.
  const firstExplanation = group.findIndex((c) => c.kind === 'explication')
  if (firstExplanation >= 0 && group.slice(firstExplanation).some((c) => c.kind === 'citation'))
    add('info', 'ordre', `${label} : cartes-explication mêlées aux citations (l'import les regroupe en fin de leçon si « Citations avant explications » reste coché)`)

  // Doublons : même carte, ou même trou deux fois dans un fragment.
  const keys = new Map<string, number>()
  const duplicates = new Set<ImportedTextCard>()
  for (const c of group) {
    const key = `${c.sentence}|${c.answer}`
    if (keys.has(key)) {
      add('attention', 'doublon', `même carte qu'à la ligne ${keys.get(key)}`, c.sourceLine)
      duplicates.add(c)
    } else keys.set(key, c.sourceLine)
  }
  const gapKeys = new Map<string, number>()
  for (const c of citations.filter((card) => !duplicates.has(card))) {
    for (const answer of c.answer.split(' ; ')) {
      const key = `${c.fragment ?? ''}|${answer.toLowerCase()}`
      if (gapKeys.has(key)) add('attention', 'doublon', `« ${answer} » déjà troué dans ce fragment (ligne ${gapKeys.get(key)})`, c.sourceLine)
      else gapKeys.set(key, c.sourceLine)
    }
  }

  // Cartes-explication : autonomie, réponse courte.
  for (const c of explanations) {
    if (/\b(ce passage|cette formule|cette phrase|ce paragraphe|ci-dessus|selon le texte|dans le texte)\b/i.test(c.sentence))
      add('attention', 'autonomie', 'renvoi (« ce passage », « selon le texte »…) : la carte revient seule en révision, nommer ce dont elle parle', c.sourceLine)
    const words = c.answer.split(/\s+/).length
    if (words > 6) add('attention', 'réponse longue', `réponse de ${words} mots à une carte-explication : paraphrasable, déplacer le trou sur un mot pivot`, c.sourceLine)
  }
}

// Fidélité au texte de référence.
if (textPath) {
  const reference = normalizeText(readFileSync(textPath, 'utf8'))
  for (const card of cards.filter((c) => c.kind === 'citation' && c.sentence.trim().startsWith('«'))) {
    const filled = unquote(fillGaps(card.sentence, card.answer))
    // Une coupe (« … », « […] ») sépare des morceaux cités chacun à la lettre.
    const pieces = filled.split(/\s*\[?…\]?\s*|\s*\[\.\.\.\]\s*/).map(normalizeText).filter((p) => p.length > 3)
    for (const piece of pieces) {
      if (reference.includes(piece)) continue
      add('erreur', 'fidélité', `absent du texte de référence : ${divergence(piece, reference)}`, card.sourceLine)
      break
    }
  }
}

// --- Rapport
const count = (level: Level) => findings.filter((f) => f.level === level).length
const citationsCount = cards.filter((c) => c.kind === 'citation').length
console.log(
  `${rows.length} lignes lues · ${cards.length} cartes (${citationsCount} citations, ${cards.length - citationsCount} explications) · ${paragraphs.size} paragraphe(s)` +
    (textPath ? ' · comparées au texte de référence' : ''),
)
console.log(`${count('erreur')} erreur(s) · ${count('attention')} à vérifier · ${count('info')} info(s)\n`)
for (const level of ['erreur', 'attention', 'info'] as const) {
  const list = findings.filter((f) => f.level === level).sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
  if (!list.length) continue
  console.log(level === 'erreur' ? 'ERREURS' : level === 'attention' ? 'À VÉRIFIER' : 'INFOS')
  for (const f of list) console.log(`  ${f.line ? `l. ${f.line}` : '     '} [${f.rule}] ${f.detail}`)
  console.log('')
}
if (!findings.length) console.log('Aucun problème mécanique : reste la relecture des trous et des explications.')
process.exit(count('erreur') ? 1 : 0)

function normalizeText(s: string): string {
  return s
    .replace(/^﻿/, '')
    .replace(/[’ʼ]/g, "'")
    .replace(/[«»"“”]/g, '')
    .replace(/\*\*|\*|`|__/g, '')
    .replace(/-\s*\n\s*/g, '')
    .replace(/[\s  ]+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Nombre de mots communs en tête, ou en fin si c'est plus, de deux textes. */
function sharedWords(a: string, b: string): number {
  const wa = a.split(/\s+/)
  const wb = b.split(/\s+/)
  let head = 0
  while (head < wa.length && head < wb.length && wa[head] === wb[head]) head++
  let tail = 0
  while (tail < wa.length && tail < wb.length && wa[wa.length - 1 - tail] === wb[wb.length - 1 - tail]) tail++
  return Math.max(head, tail)
}

/** Le premier mot où deux textes divergent, avec un peu de contexte. */
function firstDifference(a: string, b: string): string {
  const wa = a.split(/\s+/)
  const wb = b.split(/\s+/)
  let i = 0
  while (i < wa.length && i < wb.length && wa[i] === wb[i]) i++
  const ctx = wb.slice(Math.max(0, i - 3), i).join(' ')
  return `« …${ctx} ${wa[i] ?? '∅'} » / « …${ctx} ${wb[i] ?? '∅'} »`
}

/** Le plus long début du morceau présent dans le texte, et le mot qui décroche. */
function divergence(piece: string, reference: string): string {
  const words = piece.split(' ')
  let ok = 0
  while (ok < words.length && reference.includes(words.slice(0, ok + 1).join(' '))) ok++
  if (ok === 0) return `« ${short(piece, 60)} » (dès le premier mot)`
  const at = reference.indexOf(words.slice(0, ok).join(' ')) + words.slice(0, ok).join(' ').length
  const expected = reference.slice(at).trim().split(' ').slice(0, 3).join(' ')
  return `après « …${words.slice(Math.max(0, ok - 4), ok).join(' ')} », la carte a « ${words.slice(ok, ok + 3).join(' ')} », le texte « ${expected} »`
}
