import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourse } from '@/content/CourseProvider'
import { itemsOfCourse } from '@/content/course'
import { dayKey, displayedStreak, levelFromXp } from '@/engine/progress'
import { cardStrength, dueCards } from '@/engine/srs'
import { ACHIEVEMENTS, achievementStatus, itemsLearnedCount, lessonsCompletedCount } from '@/engine/achievements'
import { EMPTY_CARDS, useProgress } from '@/store/progressStore'
import { canVibrate } from '@/lib/haptics'
import { Button } from '@/components/Button'
import { AppUpdateCard } from '@/components/AppUpdateCard'
import { BoltIcon, ChestIcon, ChevronLeftIcon, FlameIcon } from '@/components/icons'

const STRENGTHS = ['new', 'learning', 'known', 'mastered'] as const

// Accordés au masculin : ils qualifient des « éléments » (« X éléments
// nouveaux »), pas des « cartes » comme le ferait croire le nom anglais des
// clés qu'ils traduisent.
const STRENGTH_LABELS: Record<(typeof STRENGTHS)[number], string> = {
  new: 'nouveau',
  learning: 'en cours',
  known: 'connu',
  mastered: 'maîtrisé',
}

const STRENGTH_TONE: Record<(typeof STRENGTHS)[number], string> = {
  new: 'bg-line',
  learning: 'bg-coral',
  known: 'bg-sky',
  mastered: 'bg-success',
}

const THEME_OPTIONS: { value: 'system' | 'light' | 'dark'; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]

export function ProfileScreen() {
  const navigate = useNavigate()
  const { course } = useCourse()
  const state = useProgress()
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const today = dayKey(Date.now())
  const { level, into, span } = levelFromXp(state.xp)
  const cards = useMemo(() => Object.values(state.cards[course.id] ?? EMPTY_CARDS), [state.cards, course.id])
  const due = useMemo(() => dueCards(cards, Date.now()).length, [cards])
  const totalItems = useMemo(() => itemsOfCourse(course).length, [course])

  const breakdown = useMemo(() => {
    const counts = Object.fromEntries(STRENGTHS.map((key) => [key, 0])) as Record<(typeof STRENGTHS)[number], number>
    for (const card of cards) counts[cardStrength(card)] += 1
    return counts
  }, [cards])

  const achievementValues = useMemo(
    () => ({
      items: itemsLearnedCount(state.cards),
      streak: state.streak.best,
      lessons: lessonsCompletedCount(state.lessons),
    }),
    [state.cards, state.lessons, state.streak.best],
  )
  const achievementsUnlocked = ACHIEVEMENTS.reduce(
    (total, family) => total + achievementStatus(family, achievementValues[family.id]).unlocked,
    0,
  )
  const achievementsTotal = ACHIEVEMENTS.reduce((total, family) => total + family.tiers.length, 0)

  function download() {
    const blob = new Blob([state.exportSave()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cartophilo-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Sauvegarde exportée.')
  }

  async function upload(file: File) {
    try {
      state.importSave(await file.text())
      setMessage('Sauvegarde restaurée.')
    } catch (error) {
      setMessage(`Import impossible : ${(error as Error).message}`)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden md:max-w-3xl">
      <header className="flex shrink-0 items-center gap-2 px-4 pt-4 md:px-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="rounded-full p-2 text-ink-faint hover:text-ink"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <h1 className="text-xl font-black">Profil</h1>
      </header>

      {/* `md:grid md:grid-cols-2` : une longue colonne de réglages devient
          vide dès qu'on l'étire à la largeur d'un écran de bureau. Chaque
          section garde sa propre carte (pas de fusion visuelle), mais les
          plus courtes (objectif, thème, sons…) se retrouvent deux par
          rangée plutôt qu'une sous l'autre ; les sections qui veulent
          rester pleine largeur (niveau, statistiques, succès, contenu
          travaillé, réinitialiser) portent `md:col-span-2`. */}
      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-5 pb-16 [&>*]:shrink-0 md:grid md:grid-cols-2 md:items-start md:gap-5 md:px-2">
        <section className="card-3d px-5 py-5 md:col-span-2">
          <p className="text-sm font-bold text-ink-soft">Niveau {level}</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-violet" style={{ width: `${(into / span) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            {into} / {span} XP vers le niveau {level + 1}
          </p>
        </section>

        <section className="grid grid-cols-3 gap-3 md:col-span-2">
          <Tile label="Série" value={String(displayedStreak(state.streak, today))} icon={<FlameIcon size={18} />} tone="text-coral" />
          <Tile label="XP total" value={String(state.xp)} icon={<BoltIcon size={18} />} tone="text-amber" />
          <Tile label="À réviser" value={String(due)} tone="text-teal" />
        </section>

        <button
          type="button"
          onClick={() => navigate('/succes')}
          className="card-3d flex items-center gap-3 px-5 py-4 text-left md:col-span-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
            <ChestIcon size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">Succès</span>
            <span className="block text-xs text-ink-faint">
              {achievementsUnlocked} / {achievementsTotal} paliers débloqués
            </span>
          </span>
          <ChevronLeftIcon size={18} className="rotate-180 shrink-0 text-ink-faint" />
        </button>

        <section className="card-3d px-5 py-5 md:col-span-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-faint">Contenu travaillé</h2>
          <p className="mt-1 text-2xl font-black">
            {cards.length}
            <span className="text-base font-bold text-ink-faint"> / {totalItems} éléments rencontrés</span>
          </p>

          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-line">
            {STRENGTHS.map((key) => (
              <div
                key={key}
                className={STRENGTH_TONE[key]}
                style={{ width: cards.length ? `${(breakdown[key] / cards.length) * 100}%` : '0%' }}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-ink-soft">
            {STRENGTHS.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${STRENGTH_TONE[key]}`} />
                {STRENGTH_LABELS[key]} · {breakdown[key]}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-3d flex flex-col gap-3 px-5 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-faint">Objectif quotidien</h2>
          <div className="flex gap-2">
            {[20, 30, 50, 80].map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => state.setDailyGoal(goal)}
                className={`flex-1 rounded-2xl border-2 py-3 text-sm font-extrabold ${
                  state.dailyGoal === goal ? 'border-teal bg-teal/15 text-teal' : 'border-line text-ink-soft'
                }`}
              >
                {goal} XP
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-faint">
            Aujourd'hui : {state.xpByDay[today] ?? 0} / {state.dailyGoal} XP
          </p>
        </section>

        <section className="card-3d flex flex-col gap-3 px-5 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-faint">Thème</h2>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => state.setTheme(value)}
                className={`flex-1 rounded-2xl border-2 py-3 text-sm font-extrabold ${
                  state.theme === value ? 'border-teal bg-teal/15 text-teal' : 'border-line text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="card-3d flex flex-col gap-3 px-5 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-faint">Sons</h2>
          <Switch
            label="Une note à chaque bonne réponse"
            on={state.sounds}
            onToggle={() => state.setSounds(!state.sounds)}
          />
          <p className="text-xs text-ink-faint">
            Rien ne se perd à les couper : une bonne réponse se voit déjà à l'écran.
          </p>
        </section>

        {canVibrate && (
          <section className="card-3d flex flex-col gap-3 px-5 py-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-faint">Vibrations</h2>
            <Switch
              label="Sentir les séries et la fin de session"
              on={state.haptics}
              onToggle={() => state.setHaptics(!state.haptics)}
            />
            <p className="text-xs text-ink-faint">
              Éteintes par défaut, et volontairement rares : elles ne marquent ni les bonnes ni les mauvaises
              réponses, seulement une série qui monte, une série qui se casse, et la session qui se termine.
            </p>
          </section>
        )}

        <section className="card-3d flex flex-col gap-3 px-5 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-faint">Correction</h2>
          <Switch
            label="Auto-correction ciblée"
            on={state.targetedCorrection}
            onToggle={() => state.setTargetedCorrection(!state.targetedCorrection)}
          />
          <p className="text-xs text-ink-faint">
            Après une erreur, réécrivez tout le mot par défaut — ça ancre mieux l'orthographe correcte. Activez pour
            ne corriger que la partie fautive, le reste de la réponse restant déjà affiché.
          </p>
        </section>

        <section className="card-3d flex flex-col gap-3 px-5 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-faint">Sauvegarde</h2>
          <p className="text-xs text-ink-soft">
            Toute la progression reste sur cet appareil. Exportez un fichier pour la transférer ou la conserver.
          </p>
          <div className="flex gap-3">
            <Button tone="neutral" className="flex-1 text-xs" onClick={download}>
              Exporter
            </Button>
            <Button tone="neutral" className="flex-1 text-xs" onClick={() => fileInput.current?.click()}>
              Importer
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
              event.target.value = ''
            }}
          />
          {message && <p className="text-xs font-bold text-teal">{message}</p>}
        </section>

        <div className="md:col-span-2">
          <AppUpdateCard />
        </div>

        <section className="flex flex-col gap-2 md:col-span-2">
          <Button
            tone="error"
            onClick={() => {
              if (confirm('Effacer toute la progression ? Cette action est irréversible.')) {
                state.reset()
                setMessage('Progression effacée.')
              }
            }}
          >
            Réinitialiser
          </Button>
        </section>
      </main>
    </div>
  )
}

/** Interrupteur d'un réglage : la même bascule pour les trois. */
function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors ${
          on ? 'border-teal bg-teal' : 'border-line bg-paper'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
            on ? 'left-[1.35rem] bg-white' : 'left-0.5 bg-ink-faint'
          }`}
        />
      </button>
    </label>
  )
}

function Tile({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone: string }) {
  return (
    <div className="card-3d flex flex-col items-center gap-1 px-2 py-4">
      <span className={`flex items-center gap-1 text-xl font-black ${tone}`}>
        {icon}
        {value}
      </span>
      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  )
}
