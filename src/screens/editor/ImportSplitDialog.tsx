import { Fragment, useMemo, useState } from 'react'
import { inputClass, Modal } from './Modal'
import { isCitation, reconstructPassage, splitMultiGap } from './textUnit'
import { api, type ImportedTextCardDTO, type SkippedRowDTO, type TreeUnit } from './types'

interface SegmentMeta {
  title: string
  label: string
  text: string
  /** Le texte a été retouché à la main : il n'est plus recalculé depuis les cartes. */
  textEdited: boolean
}

const PLACEHOLDER = `§1, Contre l'explication morale : « C'est par ___ que les disciples de Hegel… » (1/3) :: pure ignorance
§1, Contre l'explication morale : « … par ___ et autres choses semblables, en un mot : ___. » (1/3) :: l'accommodement ; moralement
Quand Marx dit « en un mot : moralement », il vise une méthode d'explication par la ___. :: convenance
§2, La véritable nature de l'accommodement : « … »  (1/2) :: …`

/**
 * Importer une longue liste de cartes et la découper en plusieurs leçons.
 *
 * 1. On colle la liste : une carte par ligne, `recto :: verso` (ou une
 *    tabulation, comme dans un export Quizlet).
 * 2. L'éditeur propose un découpage : une leçon par paragraphe annoncé
 *    (« §4, Intitulé : »), sinon une seule leçon. Entre deux cartes, un clic
 *    coupe ou fusionne ; chaque leçon se nomme, et, dans une unité de texte,
 *    son repère et son texte (reconstitué depuis ses cartes-citation) se
 *    relisent et se corrigent.
 * 3. « Créer » ajoute toutes les leçons à la fin de l'unité, en une fois.
 */
export function ImportSplitDialog({
  course,
  unit,
  onClose,
  onCreated,
}: {
  course: string
  unit: TreeUnit
  onClose: () => void
  onCreated: (firstLessonId: string) => void
}) {
  const isText = unit.isText
  const [step, setStep] = useState<'paste' | 'split'>('paste')
  const [raw, setRaw] = useState('')
  const [cards, setCards] = useState<ImportedTextCardDTO[]>([])
  const [skipped, setSkipped] = useState<SkippedRowDTO[]>([])
  const [starts, setStarts] = useState<number[]>([0])
  const [meta, setMeta] = useState<Record<number, SegmentMeta>>({})
  const [citationsFirst, setCitationsFirst] = useState(isText)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const segments = useMemo(
    () => starts.map((start, index) => ({ start, end: starts[index + 1] ?? cards.length })),
    [starts, cards.length],
  )

  /** Les réglages de chaque leçon, gardés d'un découpage à l'autre, complétés pour les nouvelles. */
  function rebuildMeta(nextStarts: number[], list: ImportedTextCardDTO[], previous: Record<number, SegmentMeta>) {
    const next: Record<number, SegmentMeta> = {}
    nextStarts.forEach((start, index) => {
      const end = nextStarts[index + 1] ?? list.length
      const slice = list.slice(start, end)
      const rebuilt = reconstructPassage(slice).text
      const old = previous[start]
      const paragraph = slice.find((card) => card.paragraph)?.paragraph
      next[start] = old
        ? { ...old, text: old.textEdited ? old.text : rebuilt }
        : {
            title: paragraph?.heading ?? `Leçon ${index + 1}`,
            label: paragraph ? `§${paragraph.number}` : isText ? `§${index + 1}` : '',
            text: rebuilt,
            textEdited: false,
          }
    })
    return next
  }

  async function analyze() {
    setBusy(true)
    setError(null)
    try {
      const data = await api<{ cards: ImportedTextCardDTO[]; skipped: SkippedRowDTO[] }>('/api/import-text-cards', {
        method: 'POST',
        body: { text: raw },
      })
      if (data.cards.length === 0) throw new Error('aucune carte reconnue (une carte par ligne, « recto :: verso »)')
      // Une nouvelle leçon à chaque changement de paragraphe annoncé.
      const auto = [0]
      data.cards.forEach((card, index) => {
        const previous = data.cards[index - 1]
        if (index > 0 && card.paragraph && previous?.paragraph && card.paragraph.number !== previous.paragraph.number) {
          auto.push(index)
        }
      })
      setCards(data.cards)
      setSkipped(data.skipped)
      setStarts(auto)
      setMeta(rebuildMeta(auto, data.cards, {}))
      setStep('split')
    } catch (err) {
      setError((err as Error).message)
    }
    setBusy(false)
  }

  function toggleCut(index: number) {
    if (index <= 0) return
    const next = starts.includes(index) ? starts.filter((s) => s !== index) : [...starts, index].sort((a, b) => a - b)
    setStarts(next)
    setMeta(rebuildMeta(next, cards, meta))
  }

  function patchMeta(start: number, patch: Partial<SegmentMeta>) {
    setMeta((current) => ({ ...current, [start]: { ...current[start]!, ...patch } }))
  }

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const lessons = segments.map(({ start, end }) => {
        const m = meta[start]!
        let slice = cards.slice(start, end)
        if (isText && citationsFirst) slice = [...slice.filter(isCitation), ...slice.filter((card) => !isCitation(card))]
        const points = isText
          ? slice.map((card) => ({ sentence: card.sentence, answer: card.answer, alt: [], fragment: card.fragment }))
          : // Une leçon classique ne lit qu'un trou par carte : les cartes à plusieurs trous sont déclinées.
            slice.flatMap((card) => splitMultiGap(card.sentence, card.answer).map((c) => ({ ...c, alt: [] })))
        return {
          title: m.title,
          passage: isText ? { label: m.label, text: m.text } : undefined,
          points,
        }
      })
      const data = await api<{ lessons: { id: string }[] }>(`/api/lessons?course=${course}&unit=${unit.id}`, {
        method: 'POST',
        body: { lessons },
      })
      onCreated(data.lessons[0]!.id)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (step === 'paste') {
    return (
      <Modal
        title={`Importer une liste dans « ${unit.title} »`}
        onClose={onClose}
        onSubmit={() => void analyze()}
        submitLabel="Analyser la liste →"
        submitDisabled={!raw.trim()}
        busy={busy}
        error={error}
        wide
        footer={<span>Étape 1 sur 2 · rien n’est encore écrit</span>}
      >
        <div className="flex flex-col gap-1 text-sm text-ink-soft">
          <p>
            Collez la liste : <strong>une carte par ligne</strong>, le recto (phrase avec <code>___</code>), puis{' '}
            <code>::</code> ou une tabulation, puis la réponse. Plusieurs trous : réponses séparées par <code>;</code>.
          </p>
          {isText && (
            <p>
              Un préfixe <code>§4, Intitulé :</code> ouvre une nouvelle leçon, les lignes suivantes y restent ; un{' '}
              <code>(1/3)</code> final devient le repère de fragment. Sans préfixe, vous couperez à la main à l’étape
              suivante.
            </p>
          )}
        </div>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          spellCheck={false}
          placeholder={PLACEHOLDER}
          className="min-h-0 flex-1 resize-none rounded-xl border-2 border-line bg-paper p-3 font-mono text-xs leading-relaxed text-ink outline-none focus:border-teal"
        />
      </Modal>
    )
  }

  const review = cards.filter((card) => card.needsReview).length
  return (
    <Modal
      title={`Découper en leçons · « ${unit.title} »`}
      onClose={onClose}
      onSubmit={() => void create()}
      submitLabel={`Créer ${segments.length} leçon${segments.length > 1 ? 's' : ''}`}
      busy={busy}
      error={error}
      wide
      footer={
        <>
          <button type="button" onClick={() => setStep('paste')} className="font-bold text-ink-soft underline">
            ← Modifier la liste
          </button>
          <span>
            Étape 2 sur 2 · {cards.length} cartes
            {review > 0 && <span className="font-bold text-amber-deep"> · {review} à relire</span>}
            {skipped.length > 0 && <span> · {skipped.length} ligne(s) ignorée(s)</span>}
          </span>
          {isText && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={citationsFirst} onChange={(e) => setCitationsFirst(e.target.checked)} />
              Citations avant explications
            </label>
          )}
        </>
      }
    >
      <p className="text-xs text-ink-faint">
        Survolez l’espace entre deux cartes pour <strong>couper</strong> la leçon à cet endroit ; « Fusionner » réunit
        une leçon à la précédente. Les réglages de chaque leçon se retouchent ici, avant création.
      </p>
      {skipped.length > 0 && (
        <details className="rounded-lg bg-ink/5 p-2 text-xs text-ink-soft">
          <summary className="cursor-pointer font-bold">{skipped.length} ligne(s) ignorée(s)</summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {skipped.map((row) => (
              <li key={row.line}>
                ligne {row.line} : {row.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      {segments.map(({ start, end }, index) => {
        const m = meta[start]!
        const slice = cards.slice(start, end)
        const citations = slice.filter(isCitation).length
        const conflicts = reconstructPassage(slice).conflicts
        return (
          <section key={start} className="flex flex-col gap-2 rounded-2xl border-2 border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-ink-faint">Leçon {index + 1}</span>
              {isText && (
                <input
                  value={m.label}
                  onChange={(event) => patchMeta(start, { label: event.target.value })}
                  aria-label="Repère"
                  className={`${inputClass} w-28 py-1 font-bold`}
                />
              )}
              <input
                value={m.title}
                onChange={(event) => patchMeta(start, { title: event.target.value })}
                aria-label="Titre de la leçon"
                className={`${inputClass} min-w-48 flex-1 py-1 font-bold`}
              />
              <span className="text-xs text-ink-faint">
                {slice.length} carte{slice.length > 1 ? 's' : ''}
                {isText && ` · ${citations} citation${citations > 1 ? 's' : ''}`}
              </span>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => toggleCut(start)}
                  className="rounded-lg border-2 border-line px-2 py-0.5 text-xs font-bold text-ink-soft hover:border-teal"
                >
                  ⤒ Fusionner avec la précédente
                </button>
              )}
            </div>

            {isText && (
              <details open={!m.text || conflicts.length > 0} className="rounded-xl bg-ink/4 px-3 py-2">
                <summary className="cursor-pointer text-xs font-bold text-ink-soft">
                  Texte du paragraphe {m.textEdited ? '(retouché)' : '(reconstitué depuis les cartes-citation)'}
                  {conflicts.length > 0 && (
                    <span className="text-amber-deep">
                      {' '}
                      · cartes divergentes pour le fragment {conflicts.join(', ')} : à vérifier
                    </span>
                  )}
                  {!m.text && <span className="text-ink-faint"> · vide : à coller, ou « Introduction »</span>}
                </summary>
                <textarea
                  value={m.text}
                  onChange={(event) => patchMeta(start, { text: event.target.value, textEdited: true })}
                  rows={4}
                  className={`${inputClass} mt-2 w-full resize-y font-serif`}
                />
                {m.textEdited && (
                  <button
                    type="button"
                    onClick={() => patchMeta(start, { text: reconstructPassage(slice).text, textEdited: false })}
                    className="text-xs font-bold text-ink-faint underline"
                  >
                    Recalculer depuis les cartes
                  </button>
                )}
              </details>
            )}

            <ol className="flex flex-col">
              {slice.map((card, offset) => {
                const at = start + offset
                return (
                  <Fragment key={at}>
                    <CardRow card={card} isText={isText} />
                    {offset < slice.length - 1 && (
                      <li className="group flex h-3 items-center">
                        <button
                          type="button"
                          onClick={() => toggleCut(at + 1)}
                          className="mx-auto hidden rounded-full border-2 border-dashed border-teal px-2 text-[0.65rem] leading-tight font-bold text-teal-deep group-hover:block"
                        >
                          ✂ Couper ici
                        </button>
                      </li>
                    )}
                  </Fragment>
                )
              })}
            </ol>
          </section>
        )
      })}
    </Modal>
  )
}

function CardRow({ card, isText }: { card: ImportedTextCardDTO; isText: boolean }) {
  const citation = isCitation(card)
  const parts = card.sentence.split('___')
  return (
    <li
      className={`flex items-start gap-2 rounded-lg px-2 py-1 text-xs ${card.needsReview ? 'bg-amber/15' : ''}`}
      title={card.needsReview ? 'À relire : guillemets, ou nombre de réponses différent du nombre de trous' : undefined}
    >
      {isText && (
        <span
          className={`mt-0.5 shrink-0 rounded px-1 text-[0.6rem] font-black uppercase ${
            citation ? 'bg-violet/15 text-violet-deep' : 'bg-sky/15 text-sky-deep'
          }`}
        >
          {citation ? `cit.${card.fragment ? ` ${card.fragment}` : ''}` : 'expl.'}
        </span>
      )}
      <span className="line-clamp-2 min-w-0 flex-1 leading-snug text-ink-soft">
        {parts.map((part, index) => (
          <Fragment key={index}>
            {part}
            {index < parts.length - 1 && <span className="rounded bg-teal/20 px-3" />}
          </Fragment>
        ))}
      </span>
      <span className="max-w-[35%] shrink-0 truncate font-bold text-teal-deep" title={card.answer}>
        {card.answer}
      </span>
    </li>
  )
}
