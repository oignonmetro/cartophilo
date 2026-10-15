/**
 * `npm run content:tidy [-- fichier.yaml…] [--check]` : applique `tidy.ts`
 * aux fichiers d'unité (tous ceux de `content/courses/<cours>/units/` sans
 * argument) et signale les cartes qui demandent un choix (sans trou, réponse
 * vide).
 *
 * Les corrections se font sur le texte source, chaîne par chaîne, à
 * l'emplacement que donne l'analyseur YAML : réécrire le document entier
 * (`Document.toString`) reformaterait des dizaines de fichiers écrits à la
 * main pour une espace déplacée. Une chaîne en bloc (`notes: |-`) est
 * corrigée ligne par ligne, indentation comprise ; une chaîne entre
 * guillemets est réécrite entre guillemets doubles, au besoin.
 *
 * `--check` ne modifie rien et sort en erreur s'il y a quelque chose à
 * corriger ; avec `--warn` en plus (ce que fait `npm run content:check`), il
 * ne fait que le signaler, sans échouer : la mise en forme n'empêche pas de
 * publier.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMap, isScalar, isSeq, parseDocument, Scalar, type Node } from 'yaml'
import { pointProblems, tidyAlt, tidyAnswer, tidyLine, tidySentence, tidyText } from './tidy.ts'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

interface Edit {
  start: number
  end: number
  text: string
}

function allUnitFiles(): string[] {
  const courses = join(root, 'content', 'courses')
  const files: string[] = []
  for (const course of readdirSync(courses, { withFileTypes: true })) {
    if (!course.isDirectory()) continue
    const dir = join(courses, course.name, 'units')
    try {
      for (const file of readdirSync(dir)) if (file.endsWith('.yaml')) files.push(join(dir, file))
    } catch {
      // un cours sans unités
    }
  }
  return files
}

/** Guillemets doubles YAML : mêmes échappements que JSON, accents laissés tels quels. */
function quote(value: string): string {
  return JSON.stringify(value)
}

/**
 * Corrige un scalaire. En bloc, la correction passe sur le source, après la
 * ligne d'en-tête (`|-`), paragraphe par paragraphe, indentation comprise ;
 * sinon, la valeur corrigée est réécrite entre guillemets doubles si elle a
 * changé.
 */
function editScalar(src: string, node: Node | undefined, tidy: (value: string) => string, edits: Edit[]): void {
  if (!isScalar(node) || typeof node.value !== 'string' || !node.range) return
  const [start, end] = node.range
  if (node.type === Scalar.BLOCK_LITERAL || node.type === Scalar.BLOCK_FOLDED) {
    const slice = src.slice(start, end)
    const at = slice.indexOf('\n')
    if (at === -1) return
    // Un fichier aux fins de ligne Windows les garde.
    const crlf = slice.includes('\r\n')
    const body = tidyText(slice.slice(at + 1).replace(/\r\n/g, '\n'))
    const next = slice.slice(0, at + 1) + (crlf ? body.replace(/\n/g, '\r\n') : body)
    if (next !== slice) edits.push({ start, end, text: next })
    return
  }
  const next = tidy(node.value)
  if (next !== node.value) edits.push({ start, end, text: quote(next) })
}

function editAlt(node: Node | undefined, answer: string, edits: Edit[]): void {
  if (!isSeq(node) || !node.range) return
  const values = node.items.map((item) => (isScalar(item) ? String(item.value) : ''))
  const next = tidyAlt(values, answer)
  if (next.length === values.length && next.every((value, i) => value === values[i])) return
  edits.push({ start: node.range[0], end: node.range[1], text: `[${next.map(quote).join(', ')}]` })
}

export function tidyFile(path: string): { source: string; next: string; problems: string[] } {
  const source = readFileSync(path, 'utf8')
  const doc = parseDocument(source)
  const edits: Edit[] = []
  const problems: string[] = []
  const lessons = doc.get('lessons', true)
  if (isSeq(lessons)) {
    for (const lesson of lessons.items) {
      if (!isMap(lesson)) continue
      editScalar(source, lesson.get('title', true) as Node, tidyLine, edits)
      editScalar(source, lesson.get('notes', true) as Node, tidyText, edits)
      const passage = lesson.get('passage', true)
      if (isMap(passage)) editScalar(source, passage.get('text', true) as Node, tidyText, edits)
      const points = lesson.get('points', true)
      if (!isSeq(points)) continue
      for (const point of points.items) {
        if (!isMap(point) || point.get('sentence') === undefined) continue
        const answerNode = point.get('answer', true) as Node
        editScalar(source, point.get('sentence', true) as Node, tidySentence, edits)
        editScalar(source, answerNode, tidyAnswer, edits)
        editScalar(source, point.get('explanation', true) as Node, tidySentence, edits)
        const answer = tidyAnswer(String(point.get('answer') ?? ''))
        editAlt(point.get('alt', true) as Node, answer, edits)
        for (const problem of pointProblems({ sentence: String(point.get('sentence') ?? ''), answer })) {
          problems.push(`point "${String(point.get('id'))}" : ${problem}`)
        }
      }
    }
  }
  let next = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end)
  }
  return { source, next, problems }
}

function main(): void {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const warn = args.includes('--warn')
  const paths = args.filter((arg) => !arg.startsWith('--')).map((arg) => resolve(arg))
  const files = paths.length > 0 ? paths : allUnitFiles()
  let changed = 0
  let problemCount = 0
  for (const file of files) {
    const { source, next, problems } = tidyFile(file)
    const name = relative(root, file)
    if (next !== source) {
      changed++
      if (!check) writeFileSync(file, next, 'utf8')
      console.log(`${check ? 'à mettre en forme' : 'mis en forme'} : ${name}`)
    }
    for (const problem of problems) console.log(`  ${name} : ${problem}`)
    problemCount += problems.length
  }
  console.log(
    `${changed} fichier(s) ${check ? 'à mettre en forme' : 'mis en forme'}, ${problemCount} carte(s) à reprendre à la main.`,
  )
  if (check && !warn && (changed > 0 || problemCount > 0)) process.exitCode = 1
  if (check && changed > 0) console.log('Pour corriger : npm run content:tidy')
}

// Importé (pour les tests ou un autre outil), le module ne lance rien.
if (process.argv[1]?.endsWith('tidy-cli.ts')) main()
