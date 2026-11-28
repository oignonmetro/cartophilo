import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCourse } from '@/content/CourseProvider'
import { availableCourses } from '@/content/loader'
import { dayKey, displayedStreak, levelFromXp, withoutDeferred } from '@/engine/progress'
import { dueCards } from '@/engine/srs'
import { EMPTY_CARDS, EMPTY_DEFERRED, useProgress } from '@/store/progressStore'
import { opensUnitDirectly, rememberTrack } from '@/lib/tracks'
import { useOpenUnit } from '@/lib/useOpenUnit'
import { FlameIcon, StarIcon, UnitIcon } from './icons'
import { TRACK_TONES } from './trackTones'

/**
 * Panneau latéral, sur ordinateur seulement (`lg:` et au-delà) : en deçà,
 * chaque écran garde son en-tête, pensé pour un téléphone.
 */
export function SidePanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside
      aria-label={label}
      className="hidden h-full w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r-2 border-line bg-paper/60 px-3 py-5 lg:flex [&>*]:shrink-0"
    >
      {children}
    </aside>
  )
}

export function SideHeading({ children }: { children: ReactNode }) {
  return <p className="mb-1 px-3 text-xs font-black tracking-widest text-ink-faint uppercase">{children}</p>
}

/** Gabarit commun des entrées du panneau, hors teinte. */
export const SIDE_ITEM = 'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left text-sm font-extrabold transition-colors'
export const SIDE_ITEM_IDLE = 'border-transparent text-ink-soft hover:bg-ink/5 hover:text-ink'

/**
 * Navigation de l'application sur ordinateur : les cours, les pistes du cours
 * ouvert (avec leur nom, que les onglets à icône seule du téléphone ne
 * disent pas), puis la révision, la série et le profil.
 */
export function AppSidebar({
  activeTrackId,
  onSelectTrack,
}: {
  /** Piste affichée ; aucune hors de l'accueil. */
  activeTrackId?: string
  /** Sur l'accueil : change de piste sur place. Ailleurs, la piste choisie ramène à l'accueil. */
  onSelectTrack?: (trackId: string) => void
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { course, manifest, switchCourse } = useCourse()
  const courses = useMemo(() => availableCourses(manifest), [manifest])
  const openUnit = useOpenUnit(course)
  const allCards = useProgress((state) => state.cards[course.id] ?? EMPTY_CARDS)
  const deferred = useProgress((state) => state.deferred[course.id] ?? EMPTY_DEFERRED)
  const xp = useProgress((state) => state.xp)
  const streak = useProgress((state) => state.streak)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const due = useMemo(
    () => dueCards(Object.values(withoutDeferred(allCards, deferred)), Date.now()).length,
    [allCards, deferred],
  )
  const { level } = levelFromXp(xp)
  const currentStreak = displayedStreak(streak, dayKey(Date.now()))

  async function pickCourse(courseId: string) {
    if (switchingTo) return
    if (courseId !== course.id) {
      setSwitchingTo(courseId)
      setError(null)
      try {
        await switchCourse(courseId)
      } catch (cause) {
        setError((cause as Error).message)
        return
      } finally {
        setSwitchingTo(null)
      }
    }
    if (pathname !== '/') navigate('/')
  }

  function pickTrack(trackId: string) {
    if (onSelectTrack) {
      onSelectTrack(trackId)
      return
    }
    const track = course.layout === 'library' ? course.tracks.find((each) => each.id === trackId) : undefined
    if (!track) return
    if (opensUnitDirectly(track)) {
      openUnit(track.units[0]!)
      return
    }
    rememberTrack(course.id, trackId)
    navigate('/')
  }

  return (
    <SidePanel label="Navigation">
      <nav aria-label="Cours">
        <SideHeading>Cours</SideHeading>
        {courses.map((entry) => {
          const active = entry.id === course.id
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => pickCourse(entry.id)}
              disabled={switchingTo !== null}
              aria-current={active ? 'true' : undefined}
              className={`${SIDE_ITEM} disabled:opacity-60 ${active ? 'border-line bg-ink/5 text-ink' : SIDE_ITEM_IDLE}`}
            >
              <span className="w-6 text-center text-lg" aria-hidden>
                {entry.flag}
              </span>
              <span className="flex-1">{entry.level ? `${entry.name} ${entry.level}` : entry.name}</span>
              {switchingTo === entry.id && <span className="text-ink-faint">…</span>}
            </button>
          )
        })}
        {error && <p className="px-3 pt-1 text-xs font-bold text-error">{error}</p>}
      </nav>

      {course.layout === 'library' && (
        <nav aria-label="Pistes">
          <SideHeading>Pistes</SideHeading>
          {course.tracks.map((track) => {
            const tone = TRACK_TONES[track.color] ?? TRACK_TONES.teal
            const active = track.id === activeTrackId
            return (
              <Fragment key={track.id}>
                {track.dividerBefore && <span aria-hidden className="mx-3 my-1 block h-px bg-line" />}
                <button
                  type="button"
                  onClick={() => pickTrack(track.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`${SIDE_ITEM} ${active ? `${tone.border} ${tone.soft} ${tone.text}` : SIDE_ITEM_IDLE}`}
                >
                  <span className={`flex w-6 justify-center ${active ? '' : tone.text}`}>
                    <UnitIcon name={track.icon} size={20} />
                  </span>
                  <span className="flex-1">{track.title}</span>
                </button>
              </Fragment>
            )
          })}
        </nav>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {due > 0 && (
          <button
            type="button"
            onClick={() => navigate('/revision')}
            title={`${due} élément${due > 1 ? 's' : ''} à réviser : les revoir maintenant, c'est ce qui les fera tenir`}
            className={`${SIDE_ITEM} border-amber bg-amber/10 text-amber`}
          >
            <span className="flex w-6 justify-center">
              <StarIcon filled size={18} />
            </span>
            <span className="flex-1">Réviser</span>
            <span className="rounded-full bg-amber px-2 py-px text-xs font-black text-white">{due}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-3 text-sm font-extrabold text-coral" title="Série en cours">
            <FlameIcon size={20} /> {currentStreak}
          </span>
          <button
            type="button"
            onClick={() => navigate('/profil')}
            aria-current={pathname === '/profil' ? 'page' : undefined}
            className="flex-1 rounded-full bg-violet px-3 py-1.5 text-sm font-extrabold text-white"
          >
            Profil · Niv. {level}
          </button>
        </div>
      </div>
    </SidePanel>
  )
}

/** Écran secondaire (profil, succès…) accompagné de la navigation sur ordinateur. */
export function WithSidebar({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full">
      <AppSidebar />
      {children}
    </div>
  )
}
