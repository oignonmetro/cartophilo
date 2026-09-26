import { useRef, useState } from 'react'
import { PassageText } from '@/components/PassageText'
import { inputClass } from './Modal'
import { citationCardFromSelection, isCitation } from './textUnit'
import type { PassageDTO, PointDTO } from './types'

/**
 * Onglet « Texte » d'une leçon de texte : son repère, le paragraphe cité tel
 * qu'il sera lu dans l'app, et de quoi en tirer des cartes-citation sans
 * rien recopier : on sélectionne le morceau à faire retrouver, on choisit la
 * portée (sa phrase, ou tout le paragraphe), la carte est créée trouée à cet
 * endroit. Une leçon d'introduction n'a pas de texte : le rappel et les
 * cartes-explication suffisent.
 */
export function PassageEditor({
  passage,
  onChange,
  points,
  onAddCard,
  onShowCards,
}: {
  passage: PassageDTO
  onChange: (passage: PassageDTO) => void
  points: PointDTO[]
  onAddCard: (card: { sentence: string; answer: string }) => void
  onShowCards: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const isIntro = passage.label.trim().toLowerCase() === 'introduction'
  const citations = points.filter(isCitation).length

  function readSelection() {
    const el = textareaRef.current
    if (!el) return
    setSelection(el.selectionEnd > el.selectionStart ? { start: el.selectionStart, end: el.selectionEnd } : null)
  }

  function addCard(scope: 'sentence' | 'paragraph') {
    if (!selection) return
    const card = citationCardFromSelection(passage.text, selection.start, selection.end, scope)
    if (!card) return
    onAddCard(card)
    setLastAdded(card.answer)
  }

  const selected = selection ? passage.text.slice(selection.start, selection.end).trim() : ''

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 flex-1 flex-col gap-3 border-r-2 border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black tracking-wide text-ink-soft uppercase">Repère</span>
          <input
            value={passage.label}
            onChange={(event) => onChange({ ...passage, label: event.target.value })}
            placeholder="§1, l. 1-3, 1178a9-22…"
            className={`${inputClass} w-44 py-1`}
          />
          {['Introduction', 'Ouverture'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChange({ ...passage, label: chip })}
              className="rounded-full border border-line px-2 py-0.5 text-[0.7rem] font-bold text-ink-faint hover:text-ink-soft"
            >
              {chip}
            </button>
          ))}
        </div>

        {/*
         * Facultatif : seulement utile quand l'unité articule plusieurs
         * textes (voir content/textes.md « Une unité, plusieurs textes »),
         * pour que « Lire le texte » et l'en-tête de révision distinguent de
         * quel ouvrage vient ce paragraphe.
         */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black tracking-wide text-ink-soft uppercase">Référence</span>
          <input
            value={passage.source ?? ''}
            onChange={(event) => onChange({ ...passage, source: event.target.value || undefined })}
            placeholder="Facultatif : l'ouvrage cité, si l'unité en articule plusieurs"
            className={`${inputClass} min-w-64 flex-1 py-1`}
          />
        </div>

        {isIntro ? (
          <p className="rounded-xl bg-ink/4 p-4 text-sm text-ink-soft">
            Leçon d’introduction : pas de texte cité. Elle prépare la lecture par son <strong>rappel</strong> (le
            problème, les notions, les débats) et ses <strong>cartes-explication</strong>.
          </p>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={passage.text}
              onChange={(event) => onChange({ ...passage, text: event.target.value })}
              onSelect={readSelection}
              onKeyUp={readSelection}
              onMouseUp={readSelection}
              spellCheck={false}
              placeholder="Collez ici le paragraphe, tel qu’il est cité dans la traduction retenue. Une ligne vide sépare deux alinéas."
              className="min-h-40 flex-1 resize-none rounded-2xl border-2 border-line bg-paper p-4 font-serif text-[0.95rem] leading-relaxed text-ink outline-none focus:border-teal"
            />
            <div className="flex flex-col gap-2 rounded-xl bg-ink/4 p-3">
              <p className="text-xs text-ink-soft">
                <strong>Créer une carte-citation :</strong> sélectionnez dans le texte ce qu’il faudra savoir
                restituer (la thèse d’abord, pas un mot qui se devine), puis choisissez ce que la carte citera.
              </p>
              <p className={`truncate text-xs ${selected ? 'font-bold text-ink' : 'text-ink-faint'}`}>
                {selected ? `Trou : « ${selected} »` : 'Aucune sélection'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => addCard('sentence')}
                  className="rounded-lg border-2 border-teal-deep bg-teal px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  Trouer dans sa phrase
                </button>
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => addCard('paragraph')}
                  className="rounded-lg border-2 border-line bg-paper px-3 py-1.5 text-xs font-bold text-ink-soft disabled:opacity-40"
                >
                  Trouer dans tout le paragraphe
                </button>
              </div>
              {lastAdded && (
                <p className="text-xs text-teal-deep">
                  Carte ajoutée (trou : « {lastAdded} »).{' '}
                  <button type="button" onClick={onShowCards} className="font-bold underline">
                    Voir les cartes
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ink/3 px-6 py-6">
        <p className="mb-3 text-center text-xs font-black tracking-widest text-ink-faint uppercase">
          Aperçu · {citations} carte{citations > 1 ? 's' : ''}-citation
        </p>
        <div className="card-3d mx-auto flex w-full max-w-lg flex-col gap-3 self-center px-6 py-6">
          <p className="text-xs font-black tracking-widest text-violet uppercase">
            {passage.source && `${passage.source} · `}
            {isIntro ? passage.label : `Le texte · ${passage.label || '…'}`}
          </p>
          {!isIntro && passage.text.trim() ? (
            <PassageText text={passage.text} />
          ) : (
            <p className="text-sm text-ink-faint">{isIntro ? 'Pas de texte cité.' : 'Le texte apparaîtra ici.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
