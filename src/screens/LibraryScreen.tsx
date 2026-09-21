import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { LibraryCourse, Track, TreatiseEntry, Unit } from '@/content/schema'
import { countLabel, courseLabel, itemsOfUnit, unitLetters } from '@/content/course'
import type { LessonProgressMap } from '@/engine/progress'
import { dayKey, displayedStreak, levelFromXp, masteryOf, unitMastery } from '@/engine/progress'
import { buildUnitPath, currentDestination } from '@/engine/unitPath'
import { dueCards, type CardState } from '@/engine/srs'
import { EMPTY_CARDS, EMPTY_LESSON_PROGRESS, EMPTY_STEPS, useProgress } from '@/store/progressStore'
import { useCourse } from '@/content/CourseProvider'
import { availableCourses } from '@/content/loader'
import { ProgressRing } from '@/components/ProgressRing'
import { CoursePicker } from '@/components/CoursePicker'
import { NoteBlocks, TONES } from '@/components/session/RuleNote'
import { BoltIcon, ChevronLeftIcon, FlameIcon, StarIcon, UnitIcon } from '@/components/icons'

/**
 * Onglet ouvert par défaut : la première piste qui a effectivement une liste
 * à montrer.
 *
 * Une piste à une seule unité (voir `selectTrack`) n'affiche jamais rien en
 * elle-même — son clic redirige aussitôt vers l'unité. La retenir comme
 * onglet par défaut laisserait l'écran s'ouvrir sur une liste à un seul
 * élément que le clic lui-même ne montre jamais.
 */
function defaultTrackId(tracks: readonly Track[]): string {
  return (tracks.find((track) => track.units.length !== 1) ?? tracks[0]!).id
}

/** Avancement d'une unité sur son parcours, pour la carte de la bibliothèque. */
function doneNodes(
  unit: Unit,
  lessons: LessonProgressMap,
  steps: Record<string, number>,
): { count: number; total: number } {
  const path = buildUnitPath(unit, lessons, steps)
  return { count: path.filter((node) => node.status === 'done').length, total: path.length }
}

type UnitOrGroup = { kind: 'unit'; unit: Unit } | { kind: 'group'; group: string; units: Unit[] }

/**
 * Replie les unités consécutives qui portent le même `group` (voir
 * `content/README.md`), pour une piste trop longue à parcourir d'un seul
 * tenant — cinq unités sur l'esthétique de Kant, par exemple. Une unité sans
 * `group` reste seule, exactement comme avant ce repli.
 *
 * Seules les unités *consécutives* se replient ensemble : un même `group`
 * qui reprendrait plus loin, séparé par une unité d'un autre groupe,
 * formerait un second repli plutôt que de rouvrir le premier — la piste
 * garde ainsi l'ordre de déclaration du contenu.
 */
function groupUnits(units: readonly Unit[]): UnitOrGroup[] {
  const result: UnitOrGroup[] = []
  for (const unit of units) {
    const last = result[result.length - 1]
    if (unit.group && last?.kind === 'group' && last.group === unit.group) {
      last.units.push(unit)
    } else if (unit.group) {
      result.push({ kind: 'group', group: unit.group, units: [unit] })
    } else {
      result.push({ kind: 'unit', unit })
    }
  }
  // Un groupe qui ne finit par ne contenir qu'une seule unité (son seul
  // membre déclaré, ou le seul resté après un voisin d'un autre groupe)
  // n'apporte plus rien : le repli n'a de sens qu'à partir de deux unités à
  // distinguer sous un même en-tête, sans quoi il double la carte de l'unité
  // d'un niveau de repli vide.
  return result.map((entry) => (entry.kind === 'group' && entry.units.length === 1 ? { kind: 'unit', unit: entry.units[0]! } : entry))
}

const ENNEAD_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

/**
 * Titre thématique de chaque Ennéade, dans la progression voulue par
 * Porphyre en organisant les cinquante-quatre traités : des questions
 * morales et anthropologiques les plus accessibles (Ennéade I), au monde
 * sensible et aux principes qui le régissent (II et III), puis aux trois
 * hypostases supra-sensibles de plus en plus élusives, l'âme (IV),
 * l'intellect (V) et l'Un (VI), le principe le plus haut d'où procède toute
 * la réalité sensible.
 */
const ENNEAD_TITLES = [
  'Morale et anthropologie',
  'Le monde sensible',
  'Le monde sensible',
  "L'âme",
  "L'intellect",
  "L'Un",
] as const

/** Entrées d'un index (voir `treatiseEntrySchema`), groupées par Ennéade et triées dans l'ordre de Porphyre. */
function groupEntries(entries: readonly TreatiseEntry[]): { ennead: number; entries: TreatiseEntry[] }[] {
  const byEnnead = new Map<number, TreatiseEntry[]>()
  for (const entry of entries) {
    const bucket = byEnnead.get(entry.ennead) ?? []
    bucket.push(entry)
    byEnnead.set(entry.ennead, bucket)
  }
  return [...byEnnead.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ennead, group]) => ({
      ennead,
      entries: group.slice().sort((a, b) => a.numberInEnnead - b.numberInEnnead),
    }))
}

/**
 * Écran d'accueil des cours en accès libre.
 *
 * Trois onglets — vocabulaire, grammaire, conjugaison — chacun avec sa
 * couleur. Rien n'est verrouillé : à la place du parcours, un anneau de
 * maîtrise par unité indique où l'on en est, et les unités s'ouvrent en
 * accordéon pour éviter un niveau de navigation supplémentaire.
 */

/** Chaque piste a sa teinte : on sait au premier regard où l'on se trouve. */
const TRACK_TONES: Record<string, { text: string; bg: string; soft: string; border: string; css: string; deep: string }> = {
  teal: {
    text: 'text-teal',
    bg: 'bg-teal',
    soft: 'bg-teal/10',
    border: 'border-teal',
    css: 'var(--color-teal)',
    deep: 'var(--color-teal-deep)',
  },
  violet: {
    text: 'text-violet',
    bg: 'bg-violet',
    soft: 'bg-violet/10',
    border: 'border-violet',
    css: 'var(--color-violet)',
    deep: 'var(--color-violet-deep)',
  },
  sky: {
    text: 'text-sky',
    bg: 'bg-sky',
    soft: 'bg-sky/10',
    border: 'border-sky',
    css: 'var(--color-sky)',
    deep: 'var(--color-sky-deep)',
  },
  coral: {
    text: 'text-coral',
    bg: 'bg-coral',
    soft: 'bg-coral/10',
    border: 'border-coral',
    css: 'var(--color-coral)',
    deep: 'var(--color-coral-deep)',
  },
  amber: {
    text: 'text-amber',
    bg: 'bg-amber',
    soft: 'bg-amber/10',
    border: 'border-amber',
    css: 'var(--color-amber)',
    deep: 'var(--color-amber-deep)',
  },
  yellow: {
    text: 'text-yellow',
    bg: 'bg-yellow',
    soft: 'bg-yellow/10',
    border: 'border-yellow',
    css: 'var(--color-yellow)',
    deep: 'var(--color-yellow-deep)',
  },
  green: {
    text: 'text-green',
    bg: 'bg-green',
    soft: 'bg-green/10',
    border: 'border-green',
    css: 'var(--color-green)',
    deep: 'var(--color-green-deep)',
  },
  red: {
    text: 'text-red',
    bg: 'bg-red',
    soft: 'bg-red/10',
    border: 'border-red',
    css: 'var(--color-red)',
    deep: 'var(--color-red-deep)',
  },
  orange: {
    text: 'text-orange',
    bg: 'bg-orange',
    soft: 'bg-orange/10',
    border: 'border-orange',
    css: 'var(--color-orange)',
    deep: 'var(--color-orange-deep)',
  },
  blue: {
    text: 'text-blue',
    bg: 'bg-blue',
    soft: 'bg-blue/10',
    border: 'border-blue',
    css: 'var(--color-blue)',
    deep: 'var(--color-blue-deep)',
  },
}

export function LibraryScreen({ course }: { course: LibraryCourse }) {
  const navigate = useNavigate()
  const { manifest, switchCourse } = useCourse()
  const lessons = useProgress((state) => state.lessons[course.id] ?? EMPTY_LESSON_PROGRESS)
  const steps = useProgress((state) => state.steps[course.id] ?? EMPTY_STEPS)
  const cards = useProgress((state) => state.cards[course.id] ?? EMPTY_CARDS)
  const xp = useProgress((state) => state.xp)
  const streak = useProgress((state) => state.streak)

  const [activeTrackId, setActiveTrackId] = useState(defaultTrackId(course.tracks))
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickableCourses = useMemo(() => availableCourses(manifest), [manifest])

  // `course` change de référence quand on bascule de niveau : l'onglet actif
  // se réinitialise plutôt que de garder celui (potentiellement inexistant)
  // du cours précédent.
  useEffect(() => {
    setActiveTrackId(defaultTrackId(course.tracks))
  }, [course.id])

  // Les replis de groupe (voir `groupUnits`) partent fermés, et se
  // réinitialisent au changement de piste plutôt que de garder ouvert un
  // groupe qu'on ne reverra qu'en y revenant plus tard.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  useEffect(() => {
    setOpenGroups(new Set())
  }, [activeTrackId])
  const toggleGroup = (group: string) => {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  // Fiche ouverte d'un index de référence (voir `TreatiseIndexView`) : nulle
  // hors d'une telle piste, réinitialisée au changement de piste comme les
  // replis ci-dessus.
  const [openTreatise, setOpenTreatise] = useState<TreatiseEntry | null>(null)
  useEffect(() => {
    setOpenTreatise(null)
  }, [activeTrackId])

  // Ouvrir une unité mène droit à son étape courante — pas à un écran de
  // parcours à traverser pour la retrouver (voir `currentDestination`).
  const openUnit = (unit: Unit) => {
    const destination = currentDestination(unit.id, buildUnitPath(unit, lessons, steps))
    if (!destination) return
    navigate('lessonId' in destination ? `/lecon/${destination.lessonId}` : `/etape/${destination.unitId}/${destination.stepId}`)
  }

  // Une piste à une seule unité n'a rien à choisir en son sein : cliquer son
  // onglet mène directement à l'unité plutôt que
  // d'afficher une liste à un seul élément qu'il faudrait rouvrir tout de
  // suite. Ce n'est donc jamais l'onglet actif — `defaultTrackId` l'exclut.
  const selectTrack = (id: string) => {
    const target = course.tracks.find((candidate) => candidate.id === id)
    if (target && target.units.length === 1) {
      openUnit(target.units[0]!)
      return
    }
    setActiveTrackId(id)
  }

  const track = course.tracks.find((candidate) => candidate.id === activeTrackId) ?? course.tracks[0]!
  const tone = TRACK_TONES[track.color] ?? TRACK_TONES.teal

  const { level } = levelFromXp(xp)
  const currentStreak = displayedStreak(streak, dayKey(Date.now()))

  const trackItemIds = useMemo(
    () => track.units.flatMap((unit) => itemsOfUnit(unit).map((item) => item.id)),
    [track],
  )
  const trackMastery = useMemo(() => masteryOf(trackItemIds, cards), [trackItemIds, cards])

  // Toutes pistes confondues : mélanger vocabulaire, grammaire et
  // conjugaison ancre mieux qu'une révision par nature d'exercice. `cards`
  // est déjà restreint au cours affiché.
  const due = useMemo(() => dueCards(Object.values(cards), Date.now()).length, [cards])

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden md:max-w-3xl">
      <header className="sticky top-0 z-20 shrink-0 border-b-2 border-line bg-cream/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={`${courseLabel(course)}, changer de niveau`}
            className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-ink/5 active:bg-ink/10"
          >
            <span className="text-2xl" aria-hidden>
              {course.flag}
            </span>
            {course.level && (
              <span className="rounded-full bg-scrim px-2 py-0.5 text-[0.65rem] font-black tracking-wide text-white">
                {course.level}
              </span>
            )}
            <ChevronLeftIcon size={14} className="-rotate-90 text-ink-faint" />
          </button>
          <div className="flex items-center gap-4 text-sm font-extrabold">
            <span className="flex items-center gap-1 text-coral">
              <FlameIcon size={20} /> {currentStreak}
            </span>
            <span className="flex items-center gap-1 text-amber">
              <BoltIcon size={20} /> {xp}
            </span>
            <button
              type="button"
              onClick={() => navigate('/profil')}
              className="rounded-full bg-violet px-3 py-1 text-white"
            >
              Niv. {level}
            </button>
          </div>
        </div>

        <TrackTabs tracks={course.tracks} activeId={track.id} onSelect={selectTrack} />
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-16 [&>*]:shrink-0 md:px-2">
        <TrackTitle track={track} tone={tone} />

        {/* Avant le résumé de piste, et non dedans : c'est l'action du jour,
            celle qui fait revenir ce qui a été appris. Elle vaut pour les
            trois pistes à la fois — mélanger les natures d'exercices vaut
            mieux que réviser le vocabulaire d'un bloc. */}
        {due > 0 && <ReviewCallout due={due} onReview={() => navigate('/revision')} />}

        <TrackSummary track={track} known={trackMastery.known} seen={trackMastery.seen} />

        {track.entries ? (
          <TreatiseIndexView
            entries={track.entries}
            tone={tone}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
            onOpenTreatise={setOpenTreatise}
          />
        ) : track.units.length === 0 ? (
          <EmptyTrack tone={tone} />
        ) : (
          // `md:grid md:grid-cols-2` : une liste d'unités qui reste sur une
          // seule colonne s'étire dans le vide dès que le conteneur
          // s'élargit sur ordinateur (voir `md:max-w-3xl` plus haut). Un
          // repli de groupe (voir `GroupSection`) garde sa pleine largeur
          // (`md:col-span-2`, posé sur le composant lui-même) : c'est un
          // en-tête avant tout, pas une carte à côté d'une autre.
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start md:gap-3">
            {groupUnits(track.units).map((entry) =>
              entry.kind === 'group' ? (
                <GroupSection
                  key={entry.group}
                  group={entry.group}
                  units={entry.units}
                  tone={tone}
                  cards={cards}
                  open={openGroups.has(entry.group)}
                  onToggle={() => toggleGroup(entry.group)}
                >
                  {entry.units.map((unit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      tone={tone}
                      mastery={unitMastery(unit, cards)}
                      done={doneNodes(unit, lessons, steps)}
                      onOpen={() => openUnit(unit)}
                    />
                  ))}
                </GroupSection>
              ) : (
                <UnitCard
                  key={entry.unit.id}
                  unit={entry.unit}
                  tone={tone}
                  mastery={unitMastery(entry.unit, cards)}
                  done={doneNodes(entry.unit, lessons, steps)}
                  onOpen={() => openUnit(entry.unit)}
                />
              ),
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {pickerOpen && (
          <CoursePicker
            courses={pickableCourses}
            activeId={course.id}
            onSelect={switchCourse}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openTreatise && <TreatiseSheet entry={openTreatise} onClose={() => setOpenTreatise(null)} />}
      </AnimatePresence>
    </div>
  )
}

/**
 * Onglets à icône seule : un libellé sous chaque icône se tronquait dès
 * qu'un cours avait plus de trois ou quatre pistes (« LA MÉ... »,
 * « L'ÉPIS... » sur les six domaines du hors-programme). Le titre complet
 * de la piste active s'affiche ailleurs, une seule fois, au lieu de se
 * répéter en miniature illisible sous chaque icône (voir `TrackTitle`).
 */
function TrackTabs({
  tracks,
  activeId,
  onSelect,
}: {
  tracks: Track[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-1 px-3 pb-2" role="tablist">
      {tracks.map((track) => {
        const tone = TRACK_TONES[track.color] ?? TRACK_TONES.teal
        const active = track.id === activeId
        return (
          <Fragment key={track.id}>
            {/* Isole un sous-ensemble de pistes plutôt que de les distinguer
                par la couleur ou l'ordre seuls — la morale, par exemple,
                reste aussi à l'oral quand les autres pistes du hors-programme
                n'y sont pas. */}
            {track.dividerBefore && <span aria-hidden className="my-2 w-px shrink-0 bg-line" />}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={track.title}
              onClick={() => onSelect(track.id)}
              className="relative min-w-0 flex-1 rounded-xl px-2 py-2.5 text-center"
            >
              {/* La pilule glisse d'un onglet à l'autre : le changement se voit sans clignoter. */}
              {active && (
                <motion.span
                  layoutId="track-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className={`absolute inset-0 rounded-xl ${tone.soft} border-2 ${tone.border}`}
                />
              )}
              <span className={`relative flex items-center justify-center ${active ? tone.text : 'text-ink-faint'}`}>
                <UnitIcon name={track.icon} size={22} />
              </span>
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}

/**
 * Titre de la piste active, affiché une seule fois au-dessus de son contenu
 * — ce que l'icône seule, dans l'onglet, ne dit plus (voir `TrackTabs`).
 */
function TrackTitle({ track, tone }: { track: Track; tone: (typeof TRACK_TONES)[string] }) {
  return (
    <AnimatePresence mode="wait">
      <motion.h2
        key={track.id}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`px-1 text-lg font-extrabold ${tone.text}`}
      >
        {track.title}
      </motion.h2>
    </AnimatePresence>
  )
}

/** Piste sans la moindre unité : le niveau existe, son contenu arrive encore. */
function EmptyTrack({ tone }: { tone: (typeof TRACK_TONES)[string] }) {
  return (
    <section
      className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed ${tone.border} px-6 py-10 text-center`}
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tone.soft} ${tone.text}`}>
        <UnitIcon name="clock" size={24} />
      </span>
      <p className="text-sm font-extrabold text-ink">Cette piste est en préparation</p>
      <p className="max-w-xs text-xs text-ink-soft">
        Les premières leçons arrivent bientôt. En attendant, une autre piste ou un autre niveau vous attend.
      </p>
    </section>
  )
}

/**
 * Appel à réviser, en tête d'écran.
 *
 * C'est le cœur du système : les leçons font découvrir, les révisions font
 * revenir et approfondir. Tant qu'elles restaient un bouton discret au fond
 * d'un panneau de piste, l'app n'était qu'une liste de leçons à cocher.
 *
 * Toujours en amber, jamais dans la teinte de la piste active : la révision
 * mélange les trois pistes (voir plus haut), un ton fixe le dit d'un coup
 * d'œil. Le teal d'origine coïncidait par hasard avec l'onglet Vocabulaire
 * actif au premier lancement et jurait dès qu'on passait sur Grammaire
 * (violet) ou Conjugaison (sky) — amber n'est jamais la couleur d'une piste,
 * et c'est déjà celle de l'XP dans l'en-tête.
 */
function ReviewCallout({ due, onReview }: { due: number; onReview: () => void }) {
  return (
    <button
      type="button"
      onClick={onReview}
      className="card-3d flex items-center gap-4 border-amber bg-amber/10 px-5 py-4 text-left"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber text-white">
        <StarIcon filled size={24} />
      </span>
      <span className="flex-1">
        <span className="block text-base font-extrabold text-ink">
          {due} élément{due > 1 ? 's' : ''} à réviser
        </span>
        <span className="mt-0.5 block text-xs text-ink-soft">
          Les revoir maintenant, c'est ce qui les fera tenir.
        </span>
      </span>
      <span className="text-xs font-black uppercase text-amber">Réviser</span>
    </button>
  )
}

/**
 * Sous-titre de la piste, en tête de liste des unités.
 *
 * Portait autrefois un anneau de progression dans un pavé teinté arrondi —
 * exactement la forme des cartes d'unité juste en dessous, sans en avoir
 * l'affordance (pas de flèche, rien à ouvrir). Ça se lisait comme une carte
 * cassée plutôt qu'un résumé volontaire, surtout à 0 % où l'anneau reste
 * vide. Un simple texte, sans cadre, ne laisse plus ce doute — et il
 * n'apparaît que s'il y a effectivement quelque chose à résumer : tant que
 * rien n'a été ni vu ni su dans la piste, l'onglet au-dessus suffit.
 */
function TrackSummary({ track, known, seen }: { track: Track; known: number; seen: number }) {
  if (!track.subtitle || (known === 0 && seen === 0)) return null
  return <p className="px-1 text-sm leading-snug font-extrabold text-ink">{track.subtitle}</p>
}

function UnitCard({
  unit,
  tone,
  mastery,
  done,
  onOpen,
}: {
  unit: Unit
  tone: (typeof TRACK_TONES)[string]
  mastery: { known: number; seen: number; total: number; ratio: number }
  /** Étapes franchies sur le parcours de l'unité, et total. */
  done: { count: number; total: number }
  onOpen: () => void
}) {
  // Pour une unité d'alphabet, les lettres qu'elle enseigne disent mieux ce
  // qui attend l'apprenant qu'une phrase de description — elles remplacent
  // le sous-titre plutôt que de s'y ajouter.
  const subtitle = unitLetters(unit) ?? unit.subtitle

  return (
    <section className="card-3d overflow-hidden">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 px-4 py-4 text-left">
        <ProgressRing
          ratio={mastery.ratio}
          seenRatio={mastery.total === 0 ? 0 : mastery.seen / mastery.total}
          color={tone.css}
        />
        <span className="flex-1">
          {/* `unit.level` (B2.1/B2.2) reste dans les données mais n'est plus
              affiché : c'était une convention maison, pas une échelle
              officielle, et son badge prêtait à confusion avec le CECRL. */}
          <span className="text-base leading-tight font-extrabold">{unit.title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-ink-soft">{subtitle}</span>}
          <span className={`mt-0.5 block text-xs font-bold ${done.count > 0 ? tone.text : 'text-ink-faint'}`}>
            {done.count} / {done.total} étapes · {countLabel(unit.kind, mastery.total)}
          </span>
        </span>
        <span className="-rotate-180 text-ink-faint">
          <ChevronLeftIcon size={20} />
        </span>
      </button>
    </section>
  )
}

/**
 * Repli d'unités qui partagent un même `group` (voir `groupUnits`) : un
 * en-tête au même gabarit qu'une carte d'unité, qui déroule ses unités en
 * dessous plutôt que de les étaler toutes dans la liste — utile dès qu'une
 * piste couvre plusieurs unités sur un même auteur ou une même œuvre.
 */
function GroupSection({
  group,
  units,
  tone,
  cards,
  open,
  onToggle,
  children,
}: {
  group: string
  units: Unit[]
  tone: (typeof TRACK_TONES)[string]
  cards: Record<string, CardState>
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const itemIds = useMemo(() => units.flatMap((unit) => itemsOfUnit(unit).map((item) => item.id)), [units])
  const mastery = masteryOf(itemIds, cards)

  return (
    <div className="flex flex-col gap-3 md:col-span-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="card-3d flex w-full items-center gap-4 px-4 py-4 text-left"
      >
        <ProgressRing
          ratio={mastery.ratio}
          seenRatio={mastery.total === 0 ? 0 : mastery.seen / mastery.total}
          color={tone.css}
        />
        <span className="flex-1">
          <span className="text-base leading-tight font-extrabold">{group}</span>
          <span className="mt-0.5 block text-xs font-bold text-ink-faint">
            {units.length} unité{units.length > 1 ? 's' : ''}
          </span>
        </span>
        <span className={`text-ink-faint transition-transform ${open ? 'rotate-90' : '-rotate-90'}`}>
          <ChevronLeftIcon size={20} />
        </span>
      </button>

      {/* Un simple repli plutôt qu'une hauteur animée : aucun autre écran de
          l'app n'anime `height: auto`, et le fondu suffit à faire sentir
          l'ouverture sans réinventer un mécanisme absent d'ailleurs. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="ml-3 flex flex-col gap-3 border-l-2 border-line pl-3 md:grid md:grid-cols-2 md:items-start md:gap-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Piste-index de référence (voir Plotin, Repérage) : une liste plate
 * d'entrées cliquables, groupées par Ennéade en replis, même gabarit que
 * `GroupSection` mais sans anneau de maîtrise ni révision espacée, ces
 * entrées n'étant pas des cartes pratiquées (voir `treatiseEntrySchema`).
 * Cliquer une entrée ouvre sa fiche (voir `TreatiseSheet`) ; les exercices,
 * quand ils existeront, viendront d'un bouton commun à toute la piste
 * plutôt que d'ici.
 */
function TreatiseIndexView({
  entries,
  tone,
  openGroups,
  onToggleGroup,
  onOpenTreatise,
}: {
  entries: readonly TreatiseEntry[]
  tone: (typeof TRACK_TONES)[string]
  openGroups: Set<string>
  onToggleGroup: (group: string) => void
  onOpenTreatise: (entry: TreatiseEntry) => void
}) {
  const groups = useMemo(() => groupEntries(entries), [entries])

  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start md:gap-3">
      {groups.map(({ ennead, entries: group }) => {
        const key = `ennead-${ennead}`
        const open = openGroups.has(key)
        return (
          <div key={key} className="flex flex-col gap-3 md:col-span-2">
            <button
              type="button"
              onClick={() => onToggleGroup(key)}
              aria-expanded={open}
              className="card-3d flex w-full items-center gap-4 px-4 py-4 text-left"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.soft} text-sm font-black ${tone.text}`}
              >
                {ENNEAD_NUMERALS[ennead - 1]}
              </span>
              <span className="flex-1">
                <span className="text-base leading-tight font-extrabold">{ENNEAD_TITLES[ennead - 1]}</span>
                <span className="mt-0.5 block text-xs font-bold text-ink-faint">
                  {group.length} traité{group.length > 1 ? 's' : ''}
                </span>
              </span>
              <span className={`text-ink-faint transition-transform ${open ? 'rotate-90' : '-rotate-90'}`}>
                <ChevronLeftIcon size={20} />
              </span>
            </button>

            {/* Même mécanique de repli que `GroupSection` : voir sa remarque
                sur le choix d'un fondu plutôt qu'une hauteur animée. */}
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="ml-3 flex flex-col gap-2 border-l-2 border-line pl-3 md:grid md:grid-cols-2 md:items-start md:gap-2"
                >
                  {group.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onOpenTreatise(entry)}
                      className="card-3d flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={`shrink-0 text-xs font-black ${tone.text}`}>
                        {ENNEAD_NUMERALS[entry.ennead - 1]}, {entry.numberInEnnead}
                      </span>
                      <span className="flex-1 text-sm leading-snug font-bold text-ink">{entry.title}</span>
                      <span
                        className="shrink-0 text-[0.65rem] font-bold text-ink-faint"
                        title="Rang chronologique de rédaction"
                      >
                        [{entry.chrono}]
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Fiche d'un traité, en feuille depuis le bas (même mécanique que
 * `CoursePicker`) : sa position chez Porphyre et son rang chronologique de
 * rédaction, puis son résumé, pas encore rédigé pour la plupart des
 * traités, d'où le message d'attente plutôt qu'un bloc vide.
 */
function TreatiseSheet({ entry, onClose }: { entry: TreatiseEntry; onClose: () => void }) {
  const tone = TONES.grammar
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-end justify-center bg-scrim/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col gap-4 rounded-blob bg-paper p-5"
      >
        <h2 className="shrink-0 text-lg leading-tight font-extrabold text-ink">
          <span className={`font-black ${tone.eyebrow}`}>
            {ENNEAD_NUMERALS[entry.ennead - 1]}, {entry.numberInEnnead} [{entry.chrono}]
          </span>{' '}
          <span className="text-ink-faint">:</span> <em>{entry.title}</em>
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {entry.summary ? (
            <NoteBlocks notes={entry.summary} tone={tone} />
          ) : (
            <p className="text-sm text-ink-faint">Résumé à venir.</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-1 shrink-0 rounded-2xl border-2 border-line py-3 text-center font-extrabold text-ink-soft"
        >
          Fermer
        </button>
      </motion.div>
    </motion.div>
  )
}
