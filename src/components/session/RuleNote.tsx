import { Fragment, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { RuleExercise } from '@/engine/exercises'
import { parseInline, parseNotes, splitAside, type Inline, type NoteBlock, type NoteRule } from '@/content/notes'
import { GAP, type NoteColor } from '@/content/schema'
import { Button } from '@/components/Button'
import { PassageText } from '@/components/PassageText'
import { useIsDesktop } from '@/lib/useIsDesktop'

/**
 * Rappel de cours affiché avant la pratique, à la découverte d'une leçon.
 *
 * C'est le seul écran de la session qui soit purement à lire : tout l'enjeu
 * est qu'il se parcoure d'un coup d'œil plutôt qu'il ne se subisse. D'où trois
 * partis pris :
 *
 *   - une seule idée par bloc, et une taille de texte par niveau de lecture
 *     (l'attaque, les règles, les exemples, les pièges) ;
 *   - les règles rassemblées dans un panneau teinté, séparées par des filets,
 *     pour qu'on voie d'emblée combien il y en a ;
 *   - l'anglais toujours dans la même graisse sombre, le français en gris :
 *     l'œil apprend vite à sauter de l'un à l'autre.
 *
 * Le texte source reste du texte brut ; `parseNotes` en reconstitue la
 * structure. Voir content/README.md pour les conventions d'écriture.
 */

export const TONES = {
  grammar: {
    accent: 'bg-violet',
    eyebrow: 'text-violet',
    panel: 'bg-violet/8',
    marker: 'bg-violet',
    label: 'text-violet-deep',
    button: 'violet',
  },
  conjugation: {
    accent: 'bg-sky',
    eyebrow: 'text-sky-deep',
    panel: 'bg-sky/8',
    marker: 'bg-sky',
    label: 'text-sky-deep',
    button: 'sky',
  },
  vocab: {
    accent: 'bg-teal',
    eyebrow: 'text-teal-deep',
    panel: 'bg-teal/8',
    marker: 'bg-teal',
    label: 'text-teal-deep',
    button: 'teal',
  },
} as const

/**
 * Classe de chaque couleur du marqueur `{couleur}…{/couleur}`, en toutes
 * lettres : Tailwind ne génère que les classes qu'il peut lire littéralement
 * dans le source, un nom composé à l'exécution (`` `text-${color}-deep` ``)
 * ne produirait rien (voir la même remarque dans `SessionScreen.tsx`).
 */
const INLINE_COLORS: Record<NoteColor, string> = {
  teal: 'text-teal-deep',
  violet: 'text-violet-deep',
  coral: 'text-coral-deep',
  amber: 'text-amber-deep',
  sky: 'text-sky-deep',
  yellow: 'text-yellow-deep',
  green: 'text-green-deep',
  red: 'text-red-deep',
  pink: 'text-pink-deep',
} as const

export type Tone = (typeof TONES)[keyof typeof TONES]

/**
 * Le corps d'un rappel : ses blocs (prose, pièges, règles), sans l'en-tête ni
 * le bouton. Extrait de `RuleNote` pour que l'éditeur de contenu affiche le
 * même rendu en aperçu, sans dupliquer ces règles de mise en page.
 */
/**
 * Taille de texte d'une cellule de tableau, resserrée selon sa propre
 * longueur plutôt que celle, fixe, de la colonne : voir la remarque dans
 * `NoteBlocks` au-dessus du tableau.
 *
 * Le resserrement ne vaut que sur téléphone, où les colonnes sont étroites :
 * c'est là qu'une cellule longue, à la même taille que ses voisines courtes,
 * pliait sur huit lignes. Sur ordinateur,
 * la même colonne est bien plus large — le texte y tiendrait sans se
 * resserrer — et une police minuscule, flottant au milieu d'une grande case
 * à côté d'une étiquette en gras de taille normale, ne lisait plus comme
 * une cellule de tableau mais comme une erreur de mise en page. `md:`
 * revient donc systématiquement à la taille normale.
 */
function tableCellSize(text: string): string {
  if (text.length > 90) return 'text-[11px] leading-snug md:text-sm md:leading-snug'
  if (text.length > 40) return 'text-xs leading-snug md:text-sm md:leading-snug'
  return 'text-sm leading-snug'
}

/**
 * Tableau d'un rappel, à largeur de colonnes « optimale », à la manière de
 * LibreOffice : chaque colonne prend la place que réclame son contenu.
 *
 * La mise en page automatique du navigateur (`table-auto`) fait l'essentiel.
 * Quand tout tient, chaque colonne prend sa largeur naturelle et l'espace
 * restant se répartit en proportion ; quand la place manque, chacune garde
 * au moins la largeur de son mot le plus long, et c'est la prose des colonnes
 * longues qui plie. Une étiquette de deux lignes n'est plus écrasée dans une
 * colonne étroite à côté d'une colonne trois fois trop large pour « Z-H ».
 * Cette mise en page remplace `table-fixed` et sa colonne d'étiquettes fixée
 * à `w-20`, qui donnaient la même largeur à toutes les colonnes de contenu,
 * quoi qu'elles continssent.
 *
 * Reste le cas extrême, sur téléphone, d'un tableau de trois ou quatre
 * colonnes dont les mots les plus longs, mis côte à côte, dépassent déjà
 * l'écran : la mise en page automatique déborderait. `fitTable` le détecte,
 * resserre d'abord la police et les marges de ce seul tableau, ce qui suffit
 * le plus souvent, et sinon le repasse en largeurs fixes, chaque colonne au
 * prorata de son mot le plus long ; seuls les mots trop longs se coupent
 * alors (`overflow-wrap: anywhere`), au lieu de faire défiler le tableau ou
 * d'en couper la fin. Le calcul se refait à chaque changement de largeur.
 *
 * `tableCellSize` resserre en outre, sur téléphone seulement, la police des
 * cellules longues, cellule par cellule, pour que les rangées restent d'une
 * hauteur harmonieuse ; la marge intérieure s'y réduit aussi (`px-2`), et la
 * césure (`hyphens-auto`, la page étant déclarée en français) coupe un mot
 * long là où le navigateur sait le faire.
 *
 * Les colonnes de contenu centrent leur texte, la colonne d'étiquettes reste
 * alignée à gauche : elle sert de repère. Son en-tête, le coin, s'affiche
 * quand il titre la colonne (« Sens de l'être »), comme les autres en-têtes.
 */
export function NoteTable({
  block,
  tone,
  renderCell,
}: {
  block: Extract<NoteBlock, { kind: 'table' }>
  tone: Tone
  /**
   * Remplace le contenu d'une case (colonne 0 : les étiquettes) : c'est par
   * là que le tableau à trous (voir `TableBank`) troue le tableau du rappel
   * sans en redessiner un autre. `undefined` garde la case telle quelle.
   */
  renderCell?: (row: number, column: number) => ReactNode | undefined
}) {
  const cellContent = (row: number, column: number, text: string) => renderCell?.(row, column) ?? <Rich text={text} />
  const frame = useRef<HTMLDivElement>(null)
  const table = useRef<HTMLTableElement>(null)
  const columns = block.columns.length + 1

  useLayoutEffect(() => {
    const box = frame.current
    const grid = table.current
    if (!box || !grid) return
    const fit = () => fitTable(box, grid)
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [block, renderCell])

  const cell = 'px-2 py-2 md:px-3 break-words hyphens-auto'
  return (
    <div ref={frame} className={`overflow-x-auto rounded-2xl ${tone.panel}`}>
      <table ref={table} className="w-full table-auto border-collapse">
        <colgroup>
          {Array.from({ length: columns }, (_, i) => (
            <col key={i} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={`${cell} text-center align-bottom font-black ${tableCellSize(block.corner)} ${tone.label}`}>
              <Rich text={block.corner} />
            </th>
            {block.columns.map((column, i) => (
              <th key={i} className={`${cell} text-center align-bottom font-black ${tableCellSize(column)} ${tone.label}`}>
                <Rich text={column} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className="border-t border-ink/8">
              <th className={`${cell} text-center align-top font-black ${tableCellSize(row.label)} ${tone.label}`}>
                {cellContent(i, 0, row.label)}
              </th>
              {row.cells.map((value, j) => (
                <td key={j} className={`${cell} text-center align-top text-ink-soft ${tableCellSize(value)}`}>
                  {cellContent(i, j + 1, value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Repli de `NoteTable` quand la mise en page automatique déborde. Agit
 * directement sur le DOM (styles en ligne et attribut que React ne gère pas),
 * sans nouveau rendu : il faut mesurer le tableau tel qu'il est dessiné.
 */
function fitTable(box: HTMLElement, grid: HTMLTableElement) {
  const cols = Array.from(grid.querySelectorAll('col'))
  // Repart de la mise en page automatique : la largeur a pu grandir.
  grid.style.tableLayout = ''
  grid.removeAttribute('data-compact')
  grid.removeAttribute('data-squeezed')
  for (const col of cols) col.style.width = ''
  // Rien à mesurer tant que le cadre n'est pas dessiné (rappel masqué ou en
  // cours d'apparition) : `ResizeObserver` rappellera dès qu'il aura une
  // largeur.
  if (box.clientWidth === 0) return
  const fits = () => grid.scrollWidth <= box.clientWidth + 1
  if (fits()) return

  // D'abord resserrer police et marges : quelques pixels de trop se
  // rattrapent ainsi sans couper un seul mot.
  grid.setAttribute('data-compact', '')
  if (fits()) return

  // Largeur minimale de chaque colonne, celle de son mot le plus long : c'est
  // la largeur qu'elle prend quand le tableau est réduit à `min-content`.
  grid.style.width = 'min-content'
  const header = grid.rows[0]
  const minimums = header ? Array.from(header.cells, (cell) => cell.getBoundingClientRect().width) : []
  grid.style.width = ''
  const total = minimums.reduce((sum, width) => sum + width, 0)
  if (total <= 0 || minimums.length !== cols.length) return

  grid.style.tableLayout = 'fixed'
  grid.setAttribute('data-squeezed', '')
  cols.forEach((col, i) => {
    col.style.width = `${(minimums[i]! / total) * 100}%`
  })
}

export function NoteBlocks({ notes, tone }: { notes: string; tone: Tone }) {
  const blocks = parseNotes(notes)

  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') {
          // La première prose est l'attaque du rappel : plus grande et plus
          // sombre, elle porte l'idée que tout le reste vient détailler.
          const lead = index === 0
          return (
            <p
              key={index}
              className={
                lead
                  ? 'text-justify text-[0.975rem] leading-relaxed font-semibold text-ink'
                  : 'text-justify text-sm leading-relaxed text-ink-soft'
              }
            >
              <Rich text={block.text} />
            </p>
          )
        }

        if (block.kind === 'warning') {
          return (
            <p
              key={index}
              className="flex gap-2.5 rounded-2xl border-2 border-amber/40 bg-amber/10 px-4 py-3 text-sm leading-relaxed text-ink"
            >
              <span aria-hidden className="text-base leading-tight">
                ⚠
              </span>
              <span className="text-justify">
                <Rich text={block.text} />
              </span>
            </p>
          )
        }

        if (block.kind === 'table') return <NoteTable key={index} block={block} tone={tone} />

        return (
          <ul key={index} className={`flex flex-col rounded-2xl ${tone.panel} px-4 py-1`}>
            {block.rules.map((rule, position) => (
              <li key={position} className="flex gap-3 border-b border-ink/8 py-3 last:border-b-0">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone.marker}`} />
                <RuleBody rule={rule} />
              </li>
            ))}
          </ul>
        )
      })}
    </>
  )
}

export function RuleNote({
  exercise,
  hideNotes = false,
  onNext,
  footer,
}: {
  exercise: RuleExercise
  /**
   * Mode « citations seules » (voir `SessionScreen`) : le paragraphe cité
   * s'affiche sans son explication. Sans effet sur un rappel sans texte cité
   * (introduction, prolongement), qui n'a que son explication à montrer.
   */
  hideNotes?: boolean
  onNext: () => void
  /**
   * Remplace le bouton « C'est parti » (et son raccourci Entrée) : le lecteur
   * de fiches y met sa propre navigation, sans séance derrière.
   */
  footer?: ReactNode
}) {
  const notes = hideNotes && exercise.passage?.text ? '' : exercise.notes
  const tone = TONES[exercise.topic]
  const isDesktop = useIsDesktop()

  // Raccourci clavier, réservé à l'ordinateur (voir `useIsDesktop`) : Entrée
  // enchaîne sur les exercices, comme un clic sur « C'est parti ».
  useEffect(() => {
    if (!isDesktop || footer) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      event.preventDefault()
      onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, footer, onNext])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className={`shrink-0 text-center text-xs font-black uppercase tracking-widest ${tone.eyebrow}`}>
        {exercise.passage?.source
          ? `${exercise.passage.source} · ${exercise.passage.label}`
          : exercise.passage?.text
            ? `Le texte · ${exercise.passage.label}`
            : exercise.passage
              ? exercise.passage.label
              : 'Rappel'}
      </p>

      {/*
       * La carte défile pour son propre compte, dans l'espace qu'il reste
       * une fois le bouton posé en dessous (voir plus bas), toujours en
       * `flex-1 overflow-y-auto` — sur mobile comme sur ordinateur (voir la
       * remarque détaillée dans `GrammarGap`, même principe ici) :
       * « C'est parti » reste à une position fixe, toujours visible sans
       * défiler la page, quelle que soit la longueur du rappel ou la
       * hauteur de la fenêtre — un écran de bureau courant (1366×768 ou
       * moins) ne suffit pas toujours à montrer un rappel entier d'un
       * coup. `md:flex md:flex-col md:justify-[safe_center]` centre la
       * carte *dans* cette zone sur ordinateur plutôt que d'agrandir la
       * zone elle-même, pour qu'un rappel court n'y laisse pas un grand
       * vide au-dessus du bouton ; `safe` retombe sur un alignement en
       * haut dès que le rappel ne tient plus dans l'espace disponible.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card-3d mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-6 md:max-w-3xl md:px-10 md:py-10"
        >
          <header className="flex flex-col gap-3">
            <span className={`h-1.5 w-10 rounded-full ${tone.accent}`} />
            <h2 className="text-2xl leading-tight font-black text-balance md:text-3xl">{exercise.title}</h2>
          </header>

          {/* Leçon de texte : l'introduction de l'unité (première leçon
              seulement), le paragraphe cité, puis le commentaire éventuel. */}
          {exercise.intro && (
            <section className="flex flex-col gap-3">
              <p className={`text-xs font-black tracking-widest uppercase ${tone.eyebrow}`}>Présentation</p>
              <NoteBlocks notes={exercise.intro} tone={tone} />
            </section>
          )}
          {exercise.passage?.text && <PassageText text={exercise.passage.text} />}
          {/* Sous le paragraphe cité, son explication : le titre les
              distingue, pour qu'on ne lise pas le commentaire comme la
              suite du texte. */}
          {exercise.passage?.text && notes.trim() && (
            <p className={`text-xs font-black tracking-widest uppercase ${tone.eyebrow}`}>Explication</p>
          )}
          {notes.trim() && <NoteBlocks notes={notes} tone={tone} />}
        </motion.div>
      </div>

      <div className="w-full max-w-lg shrink-0 self-center pt-1 md:max-w-3xl">
        {footer ?? (
          <Button block tone={tone.button} onClick={onNext}>
            C'est parti
          </Button>
        )}
      </div>
    </div>
  )
}

function RuleBody({ rule }: { rule: NoteRule }) {
  const { main, aside } = splitAside(rule.body)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-justify text-sm leading-snug text-ink">
        {/* Le deux-points d'origine sert de séparateur : il se lit aussi bien
            derrière une catégorie (« Une syllabe : ») que derrière une règle
            entière (« must n'a pas de passé propre : »). Ni teinté ni traité
            autrement que le reste de la règle (seulement mis en gras) : la
            présence d'un « : » dans la ligne ne dit rien sur l'importance de
            ce qui précède, teindre l'étiquette donnait l'impression à tort
            qu'une partie de la liste comptait plus que l'autre. */}
        {rule.label && (
          <span className="font-black">
            <Rich text={rule.label} /> :{' '}
          </span>
        )}
        <span className="font-semibold">
          <Rich text={main} />
        </span>
        {aside && (
          <span className="font-normal text-ink-faint">
            {' ('}
            <Rich text={aside} />
            {')'}
          </span>
        )}
      </p>
      {rule.example && (
        <p className="text-sm leading-snug font-bold text-ink-soft italic">
          <Rich text={rule.example} />
        </p>
      )}
    </div>
  )
}

/**
 * Rend le texte enrichi d'un rappel.
 *
 * `form` — un mot étranger cité (allemand, latin…), en alphabet latin —
 * s'affiche en italique, convention typographique classique pour un mot
 * étranger au milieu d'une phrase française.
 */
export function Rich({ text }: { text: string }) {
  return <Spans spans={parseInline(text)} />
}

/**
 * Caractère réservé qui tient la place d'un trou pendant l'analyse : laissé
 * tel quel, `___` serait lu comme l'ouverture d'un soulignement (`__…__`).
 */
const GAP_MARK = ''

/**
 * Une phrase à trou, avec les mêmes marqueurs qu'un rappel (`*titre*`,
 * `**gras**`, `__souligné__`, `` `forme` ``, `{couleur}…{/couleur}`) :
 * chaque `___` est remplacé, dans l'ordre, par ce que rend `renderGap`,
 * même à l'intérieur d'un marqueur (un trou dans un titre en italique).
 */
export function RichGaps({ text, renderGap }: { text: string; renderGap: (index: number) => ReactNode }) {
  // Chaque trou porte son rang entre deux marques (`<marque>0<marque>`) : le
  // rendu n'a ainsi aucun compteur à faire avancer. Un compteur incrémenté
  // pendant le rendu se décalait au second passage que React fait en
  // développement (`StrictMode`), où le premier trou recevait le rang 1.
  const pieces = text.split(GAP)
  const numbered = pieces
    .map((piece, index) => {
      if (index === pieces.length - 1) return piece
      // Un trou qui suit directement une élision (« l'___ », « qu'___ »)
      // forme un seul mot avec elle : rien ne doit jamais les séparer en
      // retour à la ligne, l'apostrophe se retrouvant seule en bout de
      // ligne comme une ponctuation orpheline. Un soudeur de mots (U+2060),
      // invisible et sans largeur, interdit la coupure à cet endroit précis
      // sans rien ajouter à l'affichage — un trou qui suit un mot entier
      // (espace avant) garde, lui, le droit de passer à la ligne suivante.
      const joiner = /\S$/.test(piece) ? '\u2060' : ''
      return `${piece}${joiner}${GAP_MARK}${index}${GAP_MARK}`
    })
    .join('')
  return <Spans spans={parseInline(numbered)} gaps={{ render: renderGap }} />
}

interface GapSlots {
  render: (index: number) => ReactNode
}

/** Un texte brut, ses trous éventuels (`<marque>rang<marque>`) remplacés par leur rendu. */
function withGaps(text: string, gaps: GapSlots | undefined): ReactNode {
  if (!gaps || !text.includes(GAP_MARK)) return text
  // Découpé sur la marque, le texte alterne morceaux de phrase (rangs pairs)
  // et rangs de trou (rangs impairs).
  return text.split(GAP_MARK).map((piece, index) => (
    <Fragment key={index}>{index % 2 === 1 ? gaps.render(Number(piece)) : piece}</Fragment>
  ))
}

/**
 * `colorClass` porte la teinte d'un `color` ancestor jusqu'aux `strong`
 * qu'il contient : un `<strong>` fixe sa propre couleur (`text-ink` par
 * défaut), qui gagnerait sinon toujours sur la couleur héritée de son
 * parent — la couleur ne se voit sur le texte en gras que si on la lui
 * passe explicitement.
 */
function Spans({ spans, colorClass, gaps }: { spans: Inline[]; colorClass?: string; gaps?: GapSlots }) {
  return (
    <>
      {spans.map((span, index) => {
        switch (span.kind) {
          case 'strong':
            return (
              <strong key={index} className={`font-black ${colorClass ?? 'text-ink'}`}>
                <Spans spans={span.children} colorClass={colorClass} gaps={gaps} />
              </strong>
            )
          case 'em':
            return (
              <em key={index} className="italic">
                <Spans spans={span.children} colorClass={colorClass} gaps={gaps} />
              </em>
            )
          case 'underline':
            return (
              <span key={index} className="font-bold underline decoration-2 underline-offset-[3px]">
                <Spans spans={span.children} colorClass={colorClass} gaps={gaps} />
              </span>
            )
          case 'form':
            return (
              <em key={index} className="text-ink italic">
                {withGaps(span.text, gaps)}
              </em>
            )
          case 'color': {
            const tint = INLINE_COLORS[span.color]
            return (
              <span key={index} className={`font-bold ${tint}`}>
                <Spans spans={span.children} colorClass={tint} gaps={gaps} />
              </span>
            )
          }
          default:
            return <span key={index}>{withGaps(span.text, gaps)}</span>
        }
      })}
    </>
  )
}
