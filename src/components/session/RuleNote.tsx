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
  orange: 'text-orange-deep',
  blue: 'text-blue-deep',
} as const

export type Tone = (typeof TONES)[keyof typeof TONES]

/**
 * Le corps d'un rappel : ses blocs (prose, pièges, règles), sans l'en-tête ni
 * le bouton. Extrait de `RuleNote` pour que l'éditeur de contenu affiche le
 * même rendu en aperçu, sans dupliquer ces règles de mise en page.
 */
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
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-0" />
                    {block.columns.map((column, i) => (
                      <th key={i} className={`px-3 py-2 text-left font-black ${tone.label}`}>
                        <Rich text={column} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, i) => (
                    <tr key={i} className="border-t border-ink/8">
                      <th className={`px-3 py-2 text-left align-top font-black whitespace-nowrap ${tone.label}`}>
                        <Rich text={row.label} />
                      </th>
                      {row.cells.map((cell, j) => (
                        <td key={j} className="px-3 py-2 align-top leading-snug text-ink-soft">
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

export function RuleNote({ exercise, onNext }: { exercise: RuleExercise; onNext: () => void }) {
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
          {exercise.passage?.text && exercise.notes.trim() && (
            <p className={`text-xs font-black tracking-widest uppercase ${tone.eyebrow}`}>Explication</p>
          )}
          {exercise.notes.trim() && <NoteBlocks notes={exercise.notes} tone={tone} />}
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
  const gaps = { next: 0, render: renderGap }
  return <Spans spans={parseInline(text.split(GAP).join(GAP_MARK))} gaps={gaps} />
}

interface GapSlots {
  next: number
  render: (index: number) => ReactNode
}

/** Un texte brut, ses trous éventuels remplacés par leur rendu. */
function withGaps(text: string, gaps: GapSlots | undefined): ReactNode {
  if (!gaps || !text.includes(GAP_MARK)) return text
  return text.split(GAP_MARK).map((piece, index) => (
    <Fragment key={index}>
      {index > 0 && gaps.render(gaps.next++)}
      {piece}
    </Fragment>
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
