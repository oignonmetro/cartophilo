import { motion } from 'framer-motion'
import type { RuleExercise } from '@/engine/exercises'
import { parseInline, parseNotes, splitAside, type Inline, type NoteRule } from '@/content/notes'
import type { UnitColor } from '@/content/schema'
import { Button } from '@/components/Button'

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:justify-[safe_center]">
      <p className={`shrink-0 text-center text-xs font-black uppercase tracking-widest ${tone.eyebrow}`}>Rappel</p>

      {/*
       * La carte défile pour son propre compte, dans l'espace qu'il reste
       * une fois le bouton posé en dessous (voir plus bas), sur le même
       * principe que `GrammarGap`/`ClozeSentence` : sans lui, un rappel plus
       * long que l'écran (ou une fenêtre de bureau simplement moins haute)
       * repousse « C'est parti » hors du cadre, sans aucun signe qu'il faille
       * faire défiler pour l'atteindre — visible d'un bout à l'autre, jamais
       * caché sous une carte qui déborde. Sur ordinateur, `md:flex-none
       * md:overflow-visible` annule ce découpage (voir la même remarque dans
       * `GrammarGap`) et `justify-[safe_center]` (ci-dessus) recentre le bloc
       * entier — `safe` (et non un simple `justify-center`) compte : sans
       * lui, un rappel encore trop long pour une fenêtre de bureau plus
       * basse déborderait de façon centrée, à parts égales au-dessus ET en
       * dessous de la zone visible, poussant « C'est parti » encore plus
       * bas au lieu de le laisser atteignable par un simple défilement.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto md:flex-none md:overflow-visible">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card-3d mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-6 md:px-10 md:py-10"
        >
          <header className="flex flex-col gap-3">
            <span className={`h-1.5 w-10 rounded-full ${tone.accent}`} />
            <h2 className="text-2xl leading-tight font-black text-balance md:text-3xl">{exercise.title}</h2>
          </header>

          <NoteBlocks notes={exercise.notes} tone={tone} />
        </motion.div>
      </div>

      <div className="w-full max-w-lg shrink-0 self-center pt-1">
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
 * `colorClass` porte la teinte d'un `color` ancestor jusqu'aux `strong`
 * qu'il contient : un `<strong>` fixe sa propre couleur (`text-ink` par
 * défaut), qui gagnerait sinon toujours sur la couleur héritée de son
 * parent — la couleur ne se voit sur le texte en gras que si on la lui
 * passe explicitement.
 */
function Spans({ spans, colorClass }: { spans: Inline[]; colorClass?: string }) {
  return (
    <>
      {spans.map((span, index) => {
        switch (span.kind) {
          case 'strong':
            return (
              <strong key={index} className={`font-black ${colorClass ?? 'text-ink'}`}>
                <Spans spans={span.children} colorClass={colorClass} />
              </strong>
            )
          case 'em':
            return (
              <em key={index} className="italic">
                <Spans spans={span.children} colorClass={colorClass} />
              </em>
            )
          case 'underline':
            return (
              <span key={index} className="font-bold underline decoration-2 underline-offset-[3px]">
                <Spans spans={span.children} colorClass={colorClass} />
              </span>
            )
          case 'form':
            return (
              <em key={index} className="text-ink italic">
                {span.text}
              </em>
            )
          case 'color': {
            const tint = INLINE_COLORS[span.color]
            return (
              <span key={index} className={`font-bold ${tint}`}>
                <Spans spans={span.children} colorClass={tint} />
              </span>
            )
          }
          default:
            return <span key={index}>{span.text}</span>
        }
      })}
    </>
  )
}
