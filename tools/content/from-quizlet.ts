/**
 * Conversion mécanique d'un export Quizlet vers un bassin de points bruts,
 * en ligne de commande.
 *
 * La conversion elle-même (découpe terme/définition, déclinaison des cartes
 * à plusieurs trous, guillemets français, purge des tirets cadratins) vit
 * dans `quizletImport.ts`, partagée avec l'option d'import de l'éditeur
 * visuel (`/api/import-points`) : ce fichier-ci ne fait plus que la lecture
 * du fichier source, l'écriture du bassin YAML, et le rapport en console.
 *
 * Usage :
 *   tsx tools/content/from-quizlet.ts <export.txt> <bassin.yaml> \
 *     [--term-sep '::'] [--row-sep '\n']
 *
 * Le format attendu par défaut : une carte par ligne, terme et définition
 * séparés par `::`, plusieurs bonnes réponses (une carte à plusieurs `___`)
 * séparées par `//`, dans le même ordre que les trous. --term-sep et
 * --row-sep permettent d'utiliser d'autres séparateurs (accepte un
 * caractère littéral, ou les échappements \t \n) — l'export standard de
 * Quizlet, par exemple, sépare terme et définition par une tabulation.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { importQuizletRows, unescapeSep } from './quizletImport.ts'

function parseArgs(argv: string[]) {
  const positional: string[] = []
  let termSep = '::'
  let rowSep = '\n'
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--term-sep') {
      termSep = unescapeSep(argv[++i])
    } else if (arg === '--row-sep') {
      rowSep = unescapeSep(argv[++i])
    } else {
      positional.push(arg)
    }
  }
  const [inputPath, outputPath] = positional
  if (!inputPath || !outputPath) {
    console.error("Usage: tsx tools/content/from-quizlet.ts <export.txt> <bassin.yaml> [--term-sep '::'] [--row-sep '\\n']")
    process.exit(1)
  }
  return { inputPath, outputPath, termSep, rowSep }
}

function yq(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function main() {
  const { inputPath, outputPath, termSep, rowSep } = parseArgs(process.argv.slice(2))
  const raw = readFileSync(inputPath, 'utf-8')

  const { points, skipped, rowCount } = importQuizletRows(raw, { termSep, rowSep })

  const lines: string[] = []
  lines.push(`# Bassin de points bruts, converti automatiquement depuis ${inputPath}.`)
  lines.push('#')
  lines.push("# Étape suivante, manuelle : regrouper ces points en leçons cohérentes, écrire")
  lines.push('# le rappel (`notes`) de chacune, vérifier les points marqués « guillemets à')
  lines.push('# vérifier » (citation imbriquée probable), assigner les ids définitifs, puis')
  lines.push('# recopier le résultat dans un vrai fichier `content/courses/<cours>/units/*.yaml`.')
  lines.push('# Ce fichier-ci ne doit jamais être déposé tel quel dans `units/` : il ne respecte')
  lines.push('# ni le découpage en leçons ni `content/philosophie.md`.')
  lines.push('points:')
  for (const p of points) {
    lines.push(`  - sentence: ${yq(p.sentence)}`)
    lines.push(`    answer: ${yq(p.answer)}`)
    lines.push('    alt: []')
    lines.push(`    sourceLine: ${p.sourceLine}${p.needsReview ? '  # guillemets à vérifier' : ''}`)
  }

  writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8')

  const reviewCount = points.filter((p) => p.needsReview).length
  console.error(`${rowCount} carte(s) lues, ${points.length} point(s) écrits dans ${outputPath}.`)
  if (reviewCount > 0) {
    console.error(`${reviewCount} point(s) marqué(s) « guillemets à vérifier » (citation imbriquée probable).`)
  }
  if (skipped.length > 0) {
    console.error(`${skipped.length} ligne(s) ignorée(s) :`)
    for (const s of skipped) {
      console.error(`  ligne ${s.line} : ${s.reason}`)
      console.error(`    ${s.row.slice(0, 120)}${s.row.length > 120 ? '…' : ''}`)
    }
  }
}

main()
