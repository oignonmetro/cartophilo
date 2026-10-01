import { Fragment, useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { RuleExercise } from '@/engine/exercises'
import { parseInline, parseNotes, splitAside, type Inline, type NoteRule } from '@/content/notes'
import { GAP, type UnitColor } from '@/content/schema'
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
const INLINE_COLORS: Record<UnitColor, string> = {
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
 * Le resserrement ne vaut que sur téléphone (`w-20` et une colonne qui tient
 * dans le tiers de l'écran) : c'est là qu'une cellule longue, à la même
 * taille que ses voisines courtes, pliait sur huit lignes. Sur ordinateur,
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

        if (block.kind === 'table') {
          return (
            <div key={index} className={`overflow-hidden rounded-2xl ${tone.panel}`}>
              {/* `table-fixed` : sans lui, la mise en page « auto » donne à
                  chaque colonne la largeur que réclame son contenu, quitte à
                  dépasser l'écran — sur téléphone, un tableau à deux colonnes
                  de prose sortait du cadre et `overflow-hidden` en coupait la
                  fin plutôt que d'y renvoyer. La colonne d'étiquette garde une
                  largeur fixe modeste (`w-20`) plutôt que `w-0` : sous
                  `table-fixed`, une largeur nulle se serait littéralement
                  appliquée et aurait réduit « Matérielle » à une lettre par
                  ligne. Les colonnes de contenu se partagent le reste à
                  égalité et portent `break-words`, pour qu'un mot trop long
                  plie plutôt que d'élargir sa colonne.

                  Pas de taille de texte unique sur `<table>` : une colonne
                  étroite sur téléphone (voir `w-20` ci-dessus) force une
                  thèse en deux mots et un argument d'une phrase entière à la
                  même largeur, et donc à des hauteurs de ligne très
                  différentes si le texte garde partout la même taille — une
                  case plie sur huit lignes pendant que sa voisine tient sur
                  une. `tableCellSize` resserre la police cellule par
                  cellule, selon sa propre longueur, pour que les rangées
                  restent harmonieuses.

                  Les colonnes de contenu centrent leur texte (`text-center`) :
                  sur un grand écran, leur largeur égale laisse souvent une
                  réponse courte (« penser ») très en retrait d'une case
                  large, perdue à gauche plutôt qu'au centre de l'espace qui
                  lui est alloué. Seule la colonne d'étiquette (`w-20`) garde
                  un alignement à gauche : elle sert de repère, pas de
                  contenu. */}
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="w-20" />
                    {block.columns.map((column, i) => (
                      <th
                        key={i}
                        className={`px-3 py-2 text-center font-black break-words ${tableCellSize(column)} ${tone.label}`}
                      >
                        <Rich text={column} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, i) => (
                    <tr key={i} className="border-t border-ink/8">
                      <th
                        className={`w-20 px-3 py-2 text-left align-top font-black ${tableCellSize(row.label)} ${tone.label}`}
                      >
                        <Rich text={row.label} />
                      </th>
                      {row.cells.map((cell, j) => (
                        <td
                          key={j}
                          className={`px-3 py-2 text-center align-top break-words text-ink-soft ${tableCellSize(cell)}`}
                        >
                          <Rich text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        return (
          <ul key={index} className={`flex flex-col rounded-2xl ${tone.panel} px-4 py-1`}>
            {block.rules.map((rule, position) => (
              <li key={position} className="flex gap-3 border-b border-ink/8 py-3 last:border-b-0">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone.marker}`} />
                <RuleBody rule={rule} labelClass={tone.label} />
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
}: {
  exercise: RuleExercise
  /**
   * Mode « citations seules » (voir `SessionScreen`) : le paragraphe cité
   * s'affiche sans son explication. Sans effet sur un rappel sans texte cité
   * (introduction, prolongement), qui n'a que son explication à montrer.
   */
  hideNotes?: boolean
  onNext: () => void
}) {
  const notes = hideNotes && exercise.passage?.text ? '' : exercise.notes
  const tone = TONES[exercise.topic]
  const isDesktop = useIsDesktop()

  // Raccourci clavier, réservé à l'ordinateur (voir `useIsDesktop`) : Entrée
  // enchaîne sur les exercices, comme un clic sur « C'est parti ».
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      event.preventDefault()
      onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, onNext])

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
        <Button block tone={tone.button} onClick={onNext}>
          C'est parti
        </Button>
      </div>
    </div>
  )
}

function RuleBody({ rule, labelClass }: { rule: NoteRule; labelClass: string }) {
  const { main, aside } = splitAside(rule.body)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-justify text-sm leading-snug text-ink">
        {/* Le deux-points d'origine sert de séparateur : il se lit aussi bien
            derrière une catégorie (« Une syllabe : ») que derrière une règle
            entière (« must n'a pas de passé propre : »). */}
        {rule.label && (
          <span className={`font-black ${labelClass}`}>
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
      const joiner = /['’]$/.test(piece) ? '⁠' : ''
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
