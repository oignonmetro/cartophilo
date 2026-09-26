import { useEffect, useState } from 'react'
import { Field, inputClass, Modal } from './Modal'
import { nextParagraphLabel } from './textUnit'
import { api, type TreeTrack, type TreeUnit } from './types'

type UnitType = 'classic' | 'text'

const UNIT_TYPES: { id: UnitType; title: string; description: string; example: string }[] = [
  {
    id: 'classic',
    title: 'Unité classique',
    description: 'Des leçons faites d’un rappel de cours puis de cartes à trou, jouées dans un ordre mélangé.',
    example: 'Une notion, une thèse, un auteur',
  },
  {
    id: 'text',
    title: 'Unité de texte',
    description:
      'Un texte à comprendre puis à savoir citer : une leçon par paragraphe (texte, explication, cartes-citation, cartes-explication), jouées dans l’ordre, et « Lire le texte » dans l’app.',
    example: 'Un chapitre, une note, un extrait',
  },
]

/**
 * Création d'une unité : son genre d'abord (classique ou de texte), puis ses
 * réglages et sa première leçon, en un seul formulaire plutôt qu'une suite
 * de questions. Le genre ne se choisit qu'ici : c'est la première leçon qui
 * le porte (un `passage`), et toutes celles qu'on ajoute ensuite en héritent.
 */
export function NewUnitDialog({
  course,
  track,
  onClose,
  onCreated,
}: {
  course: string
  track: TreeTrack
  onClose: () => void
  onCreated: (unitId: string, lessonId: string) => void
}) {
  // Une piste « Textes » ne contient que des unités de texte : le genre y est proposé d'emblée.
  const [type, setType] = useState<UnitType>(track.id === 'textes' ? 'text' : 'classic')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [group, setGroup] = useState('')
  const [intro, setIntro] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonLabel, setLessonLabel] = useState('§1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groups = [...new Set(track.units.map((unit) => unit.group).filter((g): g is string => Boolean(g)))]
  const ready = title.trim() && lessonTitle.trim()

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const data = await api<{ unit: { id: string }; lesson: { id: string } }>(
        `/api/unit?course=${course}&track=${track.id}`,
        {
          method: 'POST',
          body: {
            type,
            title,
            subtitle,
            group,
            intro: type === 'text' ? intro : '',
            firstLessonTitle: lessonTitle,
            firstLessonLabel: type === 'text' ? lessonLabel : undefined,
          },
        },
      )
      onCreated(data.unit.id, data.lesson.id)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Nouvelle unité dans « ${track.title} »`}
      onClose={onClose}
      onSubmit={() => void submit()}
      submitLabel="Créer l’unité"
      submitDisabled={!ready}
      busy={busy}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3">
        {UNIT_TYPES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setType(option.id)}
            aria-pressed={type === option.id}
            className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition ${
              type === option.id ? 'border-teal bg-teal/10' : 'border-line hover:border-ink/20'
            }`}
          >
            <span className="text-sm font-black">{option.title}</span>
            <span className="text-xs leading-snug text-ink-soft">{option.description}</span>
            <span className="mt-auto pt-1 text-xs font-bold text-ink-faint">{option.example}</span>
          </button>
        ))}
      </div>

      <Field label="Titre de l’unité">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={type === 'text' ? 'Le bonheur du sage et les biens extérieurs' : 'L’Intellect'}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sous-titre" hint={type === 'text' ? 'La référence : œuvre, livre, chapitre, lignes.' : undefined}>
          <input
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            placeholder={type === 'text' ? 'Éthique à Nicomaque, X, 8, 1178a9-b8' : 'facultatif'}
            className={inputClass}
          />
        </Field>
        <Field label="Groupe" hint="Facultatif : réunit plusieurs unités sous un même repli.">
          <input
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            list="editor-groups"
            placeholder="La morale d’Aristote"
            className={inputClass}
          />
          <datalist id="editor-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </Field>
      </div>
      {type === 'text' && (
        <Field label="Présentation" hint="Facultative : deux ou trois phrases de situation, affichées avant la première leçon.">
          <textarea
            value={intro}
            onChange={(event) => setIntro(event.target.value)}
            rows={3}
            placeholder="Texte de…, dans la traduction de… Il répond au problème de…"
            className={`${inputClass} resize-y`}
          />
        </Field>
      )}

      <div className="rounded-xl bg-ink/4 p-3">
        <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Première leçon</p>
        <div className={type === 'text' ? 'grid grid-cols-[8rem_1fr] gap-3' : ''}>
          {type === 'text' && (
            <Field label="Repère">
              <LabelInput value={lessonLabel} onChange={setLessonLabel} />
            </Field>
          )}
          <Field label="Titre">
            <input
              value={lessonTitle}
              onChange={(event) => setLessonTitle(event.target.value)}
              placeholder={type === 'text' ? 'Le bonheur de la vertu morale est humain' : 'Titre de la leçon'}
              className={inputClass}
            />
          </Field>
        </div>
        {type === 'text' && (
          <p className="mt-2 text-xs text-ink-faint">
            Un texte difficile ? Commencez par une leçon « Introduction » (sans texte cité) qui pose le problème et
            les notions. Pour une longue liste de cartes déjà écrites, créez l’unité puis utilisez « Importer une
            liste ».
          </p>
        )}
      </div>
    </Modal>
  )
}

/** Un repère de leçon, avec les valeurs courantes à un clic. */
function LabelInput({
  value,
  onChange,
  suggestion,
}: {
  value: string
  onChange: (value: string) => void
  suggestion?: string
}) {
  const chips = [...new Set([suggestion ?? '§1', 'Introduction', 'Ouverture'])]
  return (
    <div className="flex flex-col gap-1.5">
      <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      <div className="flex flex-wrap gap-1">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-bold ${
              value === chip ? 'border-teal bg-teal/10 text-teal-deep' : 'border-line text-ink-faint hover:text-ink-soft'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Nouvelle leçon dans une unité : pour une unité de texte, son repère avec. */
export function NewLessonDialog({
  course,
  unit,
  onClose,
  onCreated,
}: {
  course: string
  unit: TreeUnit
  onClose: () => void
  onCreated: (lessonId: string) => void
}) {
  const suggestion = nextParagraphLabel(unit.lessons.map((lesson) => lesson.label))
  const [title, setTitle] = useState('')
  const [label, setLabel] = useState(suggestion)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const data = await api<{ lesson: { id: string } }>(`/api/lesson?course=${course}&unit=${unit.id}`, {
        method: 'POST',
        body: { title, label: unit.isText ? label : undefined },
      })
      onCreated(data.lesson.id)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Nouvelle leçon dans « ${unit.title} »`}
      onClose={onClose}
      onSubmit={() => void submit()}
      submitLabel="Créer la leçon"
      submitDisabled={!title.trim()}
      busy={busy}
      error={error}
    >
      <div className={unit.isText ? 'grid grid-cols-[8rem_1fr] gap-3' : ''}>
        {unit.isText && (
          <Field label="Repère">
            <LabelInput value={label} onChange={setLabel} suggestion={suggestion} />
          </Field>
        )}
        <Field label="Titre">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={unit.isText ? 'Ce que fait ce paragraphe' : 'Titre de la leçon'}
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  )
}

/** Réglages d'une unité déjà là : titre, sous-titre, groupe, présentation. */
export function UnitSettingsDialog({
  course,
  unit,
  onClose,
  onSaved,
}: {
  course: string
  unit: TreeUnit
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<{ title: string; subtitle: string; group: string; intro: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ title: string; subtitle: string; group: string; intro: string }>(
      `/api/unit?course=${course}&unit=${unit.id}`,
    )
      .then(setForm)
      .catch((err) => setError((err as Error).message))
  }, [course, unit.id])

  async function submit() {
    if (!form) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/unit?course=${course}&unit=${unit.id}`, { method: 'PUT', body: form })
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const set = (key: keyof NonNullable<typeof form>) => (event: { target: { value: string } }) =>
    setForm((current) => (current ? { ...current, [key]: event.target.value } : current))

  return (
    <Modal
      title={`Réglages de l’unité${unit.isText ? ' de texte' : ''}`}
      onClose={onClose}
      onSubmit={() => void submit()}
      submitLabel="Enregistrer"
      submitDisabled={!form?.title.trim()}
      busy={busy}
      error={error}
    >
      {!form ? (
        <p className="text-sm text-ink-faint">Chargement…</p>
      ) : (
        <>
          <Field label="Titre">
            <input value={form.title} onChange={set('title')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sous-titre">
              <input value={form.subtitle} onChange={set('subtitle')} className={inputClass} />
            </Field>
            <Field label="Groupe">
              <input value={form.group} onChange={set('group')} className={inputClass} />
            </Field>
          </div>
          <Field
            label="Présentation"
            hint="Affichée avant la première leçon et en tête de « Lire le texte ». Mêmes marqueurs qu’un rappel."
          >
            <textarea value={form.intro} onChange={set('intro')} rows={5} className={`${inputClass} resize-y`} />
          </Field>
        </>
      )}
    </Modal>
  )
}
