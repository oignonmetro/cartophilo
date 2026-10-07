import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { TableBankExercise, TableCellExercise, TableGap, TableOrderExercise } from '@/engine/exercises'
import { matchesAnswer, sameTableText, tableCellText, tableColumnTitle, tableRowText } from '@/engine/exercises'
import { plainInline } from '@/content/notes'
import { matchesLocation } from '@/content/work'
import type { Rating } from '@/engine/srs'
import { Button } from '@/components/Button'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { useKeyboardOpen } from '@/lib/useKeyboardOpen'
import { useNumberKeys } from '@/lib/useNumberKeys'
import { useProgress, type AnswerMode } from '@/store/progressStore'
import { NoteTable, Rich, TONES } from './RuleNote'
import { AnswerModeSwitch } from './AnswerModeSwitch'
import { RATINGS, RevealButtons } from './RevealButtons'
import { useSessionHaptics } from './useSessionHaptics'
import { useSessionSounds } from './useSessionSounds'

/**
 * Tableau à trous : un tableau du rappel de la leçon, troué (voir
 * `tableExercises`). Trois exercices le partagent :
 *
 *   - `TableBank` : une colonne vidée, ses cases proposées dans une banque ;
 *   - `TableCell` : une seule case, à écrire ou à révéler ;
 *   - `TableOrder` : les lignes d'un tableau de structure, à remettre dans
 *     l'ordre du texte.
 *
 * Sur un tableau de structure (voir `tableStructure`), la banque et la case
 * seule portent sur les repères : on y situe chaque moment dans le texte.
 */

const TONE = TONES.grammar

function TableHeader({ title, prompt, aside }: { title: string; prompt: string; aside?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-xs font-black tracking-wide text-violet uppercase">{prompt}</span>
        <span className="line-clamp-2 text-sm leading-snug font-bold text-ink-soft" title={title}>
          {title}
        </span>
      </div>
      {aside}
    </div>
  )
}

const sameGap = (a: TableGap, b: TableGap) => a.row === b.row && a.column === b.column

/**
 * Banque : on touche une case vide, puis le texte qui lui revient ; jamais de
 * glisser-déposer, peu fiable au doigt. Une case est toujours active, la
 * première vide puis la suivante : le plus souvent, on n'a qu'à toucher des
 * textes. Un texte refusé
 * tremble, et l'erreur compte pour le premier essai ; une fois tout replacé,
 * le tableau reste affiché, à relire d'un trait.
 */
export function TableBank({
  exercise,
  onDone,
}: {
  exercise: TableBankExercise
  /** `clean` : tout replacé sans une erreur. */
  onDone: (clean: boolean) => void
}) {
  const { table, holes } = exercise
  const sounds = useSessionSounds()
  // Une case remplie retient le jeton de banque qui l'a remplie.
  const [placed, setPlaced] = useState<Map<number, number>>(new Map())
  const [active, setActive] = useState<number | null>(holes.length > 0 ? 0 : null)
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)

  const done = placed.size === holes.length
  const used = new Set(placed.values())
  const column = holes[0]?.column ?? 0
  const heading = plainInline(tableColumnTitle(table, column))

  // Jetons encore dans la banque, dans l'ordre affiché : le numéro de chacun est sa touche.
  const remaining = exercise.bank.map((_, token) => token).filter((token) => !used.has(token))
  useNumberKeys(!done, remaining.length, (index) => place(remaining[index]!))

  function place(token: number) {
    if (active === null || done) return
    const text = exercise.bank[token] ?? ''
    if (sameTableText(text, tableCellText(table, holes[active]!))) {
      const next = new Map(placed).set(active, token)
      setPlaced(next)
      sounds.note(Math.min(next.size - 1, 7))
      const order = [...holes.keys()]
      const rotated = [...order.slice(active + 1), ...order.slice(0, active + 1)]
      const following = rotated.find((index) => !next.has(index)) ?? null
      setActive(following)
      return
    }
    setMistakes((count) => count + 1)
    setWrong(token)
    window.setTimeout(() => setWrong(null), 350)
  }

  const renderCell = useCallback(
    (row: number, column: number) => {
      const index = holes.findIndex((gap) => sameGap(gap, { row, column }))
      if (index === -1) return undefined
      const token = placed.get(index)
      if (token !== undefined) {
        return (
          <span className="block rounded-md bg-success/12 px-1 py-0.5 text-ink">
            <Rich text={exercise.bank[token] ?? ''} />
          </span>
        )
      }
      const isActive = active === index
      return (
        <button
          type="button"
          onClick={() => setActive(index)}
          aria-label="Case vide"
          aria-pressed={isActive}
          className={`flex min-h-9 w-full min-w-12 items-center justify-center rounded-lg border-2 border-dashed px-2 py-1 text-xs font-black transition-colors ${
            isActive ? 'border-violet bg-violet/12 text-violet-deep' : 'border-line bg-cream/60 text-ink-faint'
          }`}
        >
          ?
        </button>
      )
    },
    [active, exercise.bank, holes, placed],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <TableHeader
        title={exercise.title}
        prompt={
          done
            ? 'Le tableau complété'
            : exercise.locate
              ? 'Situez chaque moment dans le texte'
              : heading
                ? `Remplissez la colonne « ${heading} »`
                : 'Remplissez la colonne'
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <NoteTable block={table} tone={TONE} renderCell={renderCell} />
      </div>

      {done ? (
        <div className="shrink-0">
          <Button block tone={mistakes === 0 ? 'success' : 'violet'} onClick={() => onDone(mistakes === 0)}>
            Continuer
          </Button>
        </div>
      ) : (
        <div className="flex max-h-[38%] shrink-0 flex-wrap justify-center gap-2 overflow-y-auto md:max-h-[34%]">
          {remaining.map((token, rank) => {
            const text = exercise.bank[token] ?? ''
            return (
              <motion.button
                key={token}
                type="button"
                onClick={() => place(token)}
                animate={wrong === token ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-2xl border-2 px-3 py-2 text-center text-sm leading-snug text-ink transition-colors ${
                  wrong === token ? 'border-error bg-error/10' : 'border-line bg-paper hover:border-violet/60'
                }`}
              >
                <span
                  aria-hidden
                  className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current align-middle text-[0.65rem] text-ink-faint"
                >
                  {rank + 1}
                </span>
                <Rich text={text} />
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Une seule case : à écrire, jugée comme une phrase à trou, ou à révéler puis
 * à s'auto-évaluer. Le choix est celui des cartes de texte (voir
 * `PassageCard`, `passageModes`), retenu par type d'écran : une case de
 * tableau se joue comme une carte, au milieu d'elles.
 */
export function TableCell({
  exercise,
  onAnswer,
}: {
  exercise: TableCellExercise
  /** `rating` : présent pour une auto-évaluation, absent pour une réponse écrite. */
  onAnswer: (correct: boolean, rating?: Rating) => void
}) {
  const { table, hole } = exercise
  const expected = tableCellText(table, hole)
  const isDesktop = useIsDesktop()
  const device = isDesktop ? 'desktop' : 'mobile'
  const mode = useProgress((state) => state.passageModes[device])
  const setPassageMode = useProgress((state) => state.setPassageMode)
  const setMode = (next: AnswerMode) => setPassageMode(device, next)
  const keyboardOpen = useKeyboardOpen()
  const sounds = useSessionSounds()
  const haptics = useSessionHaptics()

  const [revealed, setRevealed] = useState(false)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const input = useRef<HTMLInputElement>(null)
  const answered = revealed || checked !== null

  useEffect(() => {
    setRevealed(false)
    setValue('')
    setChecked(null)
  }, [exercise.id])

  useEffect(() => {
    if (mode !== 'write' || answered) return
    const id = window.setTimeout(() => input.current?.focus(), 250)
    return () => window.clearTimeout(id)
  }, [mode, answered, exercise.id])

  function check(candidate: string) {
    const plain = plainInline(expected)
    // Un repère se juge comme un emplacement : « 126a », « 126 » valent « 126a-128e ».
    const correct = matchesAnswer(plain, [], candidate) || (exercise.locate === true && matchesLocation(plain, candidate))
    setValue(candidate)
    setChecked(correct)
    setRevealed(true)
    sounds.success(correct)
    haptics.answered(exercise, correct)
  }

  // Raccourcis, réservés à l'ordinateur, comme sur une carte de texte :
  // Entrée révèle ou fait continuer ; 1, 2, 3 notent une case révélée.
  useEffect(() => {
    if (!isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      if (mode === 'reveal' && checked === null) {
        if (!revealed && event.key === 'Enter') {
          event.preventDefault()
          setRevealed(true)
          return
        }
        if (revealed) {
          const match = RATINGS.find((candidate) => candidate.key === event.key)
          if (match) {
            event.preventDefault()
            onAnswer(match.rating !== 'again', match.rating)
          }
        }
        return
      }
      if (event.key !== 'Enter' || checked === null) return
      event.preventDefault()
      onAnswer(checked)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, mode, revealed, checked, onAnswer])

  const renderCell = useCallback(
    (row: number, column: number) => {
      if (!sameGap(hole, { row, column })) return undefined
      const tone = !answered
        ? 'border-violet bg-violet/12'
        : checked === false
          ? 'border-error text-teal-deep'
          : checked === true
            ? 'border-success text-success'
            : 'border-teal text-teal-deep'
      return (
        <span className={`inline-block min-w-12 border-b-4 px-1 font-extrabold ${tone}`}>
          {answered ? <Rich text={expected} /> : '?'}
        </span>
      )
    },
    [answered, checked, expected, hole],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <TableHeader
        title={exercise.title}
        prompt={exercise.locate ? 'Situez ce moment dans le texte' : 'Complétez la case'}
        aside={<AnswerModeSwitch mode={mode} disabled={answered} onChange={setMode} />}
      />

      <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:justify-[safe_center]">
        <NoteTable block={table} tone={TONE} renderCell={renderCell} />
      </div>

      <div className={`flex shrink-0 flex-col ${keyboardOpen ? 'gap-2' : 'gap-3'}`}>
        {mode === 'write' && !answered && (
          <>
            <input
              ref={input}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                if (value.trim()) check(value)
              }}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Réponse"
              placeholder={exercise.locate ? 'Le repère' : 'Votre réponse'}
              className="w-full rounded-2xl border-2 border-line bg-paper px-4 py-3 text-base font-bold outline-none focus:border-violet md:text-lg"
            />
            <Button block tone="violet" disabled={value.trim().length === 0} onClick={() => check(value)}>
              Vérifier
            </Button>
            {!keyboardOpen && (
              <button
                type="button"
                onClick={() => check('')}
                className="self-center text-sm font-bold text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-soft"
              >
                Je ne sais pas
              </button>
            )}
          </>
        )}

        {checked !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-3 text-center text-sm ${
              checked ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'
            }`}
          >
            {checked ? (
              <p className="font-extrabold text-success">Exact.</p>
            ) : value.trim() ? (
              <>
                <p className="text-error">
                  <span className="font-bold">Votre réponse : </span>
                  <span className="line-through">{value}</span>
                </p>
                <p className="text-ink-soft">La bonne réponse est affichée dans le tableau.</p>
              </>
            ) : (
              <p className="font-bold text-error">La bonne réponse est affichée dans le tableau.</p>
            )}
          </motion.div>
        )}

        {checked !== null ? (
          <div className="flex flex-col items-center gap-2">
            <Button block tone={checked ? 'success' : 'error'} onClick={() => onAnswer(checked)}>
              Continuer
            </Button>
            {!checked && value.trim() && (
              <button
                type="button"
                onClick={() => onAnswer(true)}
                className="text-sm font-bold text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-soft"
              >
                J'avais bon
              </button>
            )}
          </div>
        ) : mode === 'reveal' && !revealed ? (
          <Button block tone="violet" onClick={() => setRevealed(true)}>
            Révéler
          </Button>
        ) : mode === 'reveal' && revealed ? (
          <RevealButtons isDesktop={isDesktop} onRate={(rating) => onAnswer(rating !== 'again', rating)} />
        ) : null}
      </div>
    </div>
  )
}

/**
 * Remise en ordre d'un tableau de structure : ses moments, mélangés dans la
 * banque du bas, à toucher dans l'ordre du texte. Chacun ne montre que ce
 * qu'il est (son étiquette, son contenu) ; son repère (« 128e-130a ») ne se
 * révèle qu'une fois placé, sans quoi il suffirait de ranger des numéros.
 * Même mécanique que la banque : une erreur se signale aussitôt, la carte
 * refusée tremblant ; une fois tout placé, le fil complet reste affiché.
 */
export function TableOrder({
  exercise,
  onDone,
}: {
  exercise: TableOrderExercise
  /** `clean` : tout rangé sans une erreur. */
  onDone: (clean: boolean) => void
}) {
  const { table, rows, column } = exercise
  const sounds = useSessionSounds()
  const [placed, setPlaced] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const done = placed === rows.length

  // Le dernier moment placé reste en vue, au-dessus de la banque.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [placed])

  function pick(index: number) {
    if (done) return
    if (index === placed) {
      setPlaced(placed + 1)
      sounds.note(Math.min(placed, 7))
      return
    }
    setMistakes((count) => count + 1)
    setWrong(index)
    window.setTimeout(() => setWrong(null), 350)
  }

  const rowText = (index: number) => {
    const [first, ...rest] = tableRowText(table, rows[index]!, column)
    return (
      <>
        {first && (
          <p className="text-sm leading-snug font-bold text-ink">
            <Rich text={first} />
          </p>
        )}
        {rest.map((text, k) => (
          <p key={k} className="text-xs leading-snug text-ink-soft">
            <Rich text={text} />
          </p>
        ))}
      </>
    )
  }

  const remaining = exercise.bank.filter((index) => index >= placed)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <TableHeader
        title={exercise.title}
        prompt={
          exercise.locate
            ? done
              ? 'Les moments, dans l’ordre du texte'
              : 'Remettez les moments dans l’ordre du texte'
            : done
              ? 'Les lignes, dans l’ordre du tableau'
              : 'Remettez les lignes dans l’ordre du tableau'
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto rounded-blob border-2 border-line bg-paper px-3 py-3 md:px-5">
        {placed === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">
            {exercise.locate
              ? 'Touchez le moment qui vient en premier dans le texte.'
              : 'Touchez la ligne qui vient en premier dans le tableau.'}
          </p>
        )}
        <ol className="flex flex-col items-center">
          {rows.slice(0, placed).map((row, index) => (
            <li key={row} className="flex w-full max-w-md flex-col items-center">
              {index > 0 && (
                <span className="py-1 text-lg leading-none font-black text-violet" aria-hidden>
                  ↓
                </span>
              )}
              <div className="w-full rounded-xl border-2 border-success/50 px-3 py-2 text-center">
                <p className="text-xs font-black text-violet-deep">
                  <Rich text={tableCellText(table, { row, column })} />
                </p>
                {rowText(index)}
              </div>
            </li>
          ))}
        </ol>
        <div ref={end} />
      </div>

      {done ? (
        <div className="shrink-0">
          <Button block tone={mistakes === 0 ? 'success' : 'violet'} onClick={() => onDone(mistakes === 0)}>
            Continuer
          </Button>
        </div>
      ) : (
        <div className="flex max-h-[42%] shrink-0 flex-col gap-2 overflow-y-auto md:max-h-[38%]">
          {remaining.map((index) => (
            <motion.button
              key={index}
              type="button"
              onClick={() => pick(index)}
              animate={wrong === index ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
              transition={{ duration: 0.3 }}
              className={`shrink-0 rounded-2xl border-2 px-3 py-2 text-center transition-colors ${
                wrong === index ? 'border-error bg-error/10' : 'border-line bg-paper hover:border-violet/60'
              }`}
            >
              {rowText(index)}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
