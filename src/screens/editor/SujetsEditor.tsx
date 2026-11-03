import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Liste des sujets de La vie (`content/courses/la-vie/sujets.yaml`), éditée
 * telle que la piste Sujets l'affiche : un groupe par type d'intitulé, des
 * sujets qu'on ajoute d'un Entrée et qu'on retire d'un clic, et un import de
 * liste (une ligne par sujet ; une ligne « # Titre » ouvre un groupe).
 *
 * Un sujet traité porte une unité (`unit`) : on le signale, et on demande
 * confirmation avant de le retirer. L'enregistrement réécrit tout le fichier
 * (`PUT /api/sujets`, voir `tools/content-editor/api-plugin.ts`).
 */

interface SubjectDTO {
  title: string
  unit?: string
}

interface GroupDTO {
  title: string
  note?: string
  subjects: SubjectDTO[]
}

/** Un fichier lu par le serveur donne des chaînes pour les sujets non traités. */
function normalize(raw: unknown): GroupDTO[] {
  if (!Array.isArray(raw)) return []
  return raw.map((g) => {
    const group = g as { group?: string; title?: string; note?: string; subjects?: unknown[] }
    return {
      title: group.group ?? group.title ?? '',
      note: group.note,
      subjects: (group.subjects ?? []).map((s) => (typeof s === 'string' ? { title: s } : (s as SubjectDTO))),
    }
  })
}

/** Les groupes tels que le serveur les attend (`group` y devient `title`). */
function payload(groups: GroupDTO[]) {
  return { groups }
}

/** Clef de comparaison : les espaces insécables des intitulés ne les distinguent pas. */
const key = (title: string) => title.replace(/[  ]/g, ' ').trim()

/** Ce que l'import va faire d'une liste collée : les groupes touchés et les doublons écartés. */
function parseImport(text: string, target: string, existing: Set<string>) {
  const added: { group: string; title: string }[] = []
  let duplicates = 0
  let group = target
  const seen = new Set(existing) // clefs, voir `key`
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const heading = /^#{1,6}\s*(.+)$/.exec(line)
    if (heading) {
      group = heading[1]!.trim()
      continue
    }
    // Puces, numéros et guillemets de tableur : « - … », « 12. … », « "…" ».
    const title = line
      .replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '')
      .replace(/^["«]\s*|\s*["»]$/g, '')
      .trim()
    if (!title) continue
    if (seen.has(key(title))) {
      duplicates++
      continue
    }
    seen.add(key(title))
    added.push({ group, title })
  }
  return { added, duplicates }
}

export function SujetsEditor() {
  const [groups, setGroups] = useState<GroupDTO[] | null>(null)
  const [original, setOriginal] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [importText, setImportText] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importTarget, setImportTarget] = useState(0)
  const [importNote, setImportNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/sujets')
      const data = normalize(await res.json())
      setGroups(data)
      setOriginal(JSON.stringify(data))
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const dirty = groups !== null && JSON.stringify(groups) !== original

  const save = useCallback(async () => {
    if (!groups) return
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch('/api/sujets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(groups)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      const saved = normalize(data)
      setGroups(saved)
      setOriginal(JSON.stringify(saved))
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      setError(String((err as Error).message))
    }
  }, [groups])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [save])

  const all = useMemo(() => new Set((groups ?? []).flatMap((g) => g.subjects.map((s) => key(s.title)))), [groups])
  const total = all.size

  function update(index: number, patch: Partial<GroupDTO>) {
    setGroups((current) => current!.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  function addSubject(index: number, title: string) {
    const text = title.trim()
    if (!text) return false
    if (all.has(key(text))) {
      window.alert('Ce sujet est déjà dans la liste.')
      return false
    }
    update(index, { subjects: [{ title: text }, ...groups![index]!.subjects] })
    return true
  }

  function removeSubject(index: number, subject: SubjectDTO) {
    if (subject.unit && !window.confirm(`« ${subject.title} » est traité (unité ${subject.unit}). Le retirer de la liste ?`)) return
    update(index, { subjects: groups![index]!.subjects.filter((s) => s !== subject) })
  }

  function removeGroup(index: number) {
    const group = groups![index]!
    if (!window.confirm(`Supprimer le groupe « ${group.title} » et ses ${group.subjects.length} sujets ?`)) return
    setGroups(groups!.filter((_, i) => i !== index))
  }

  function addGroup() {
    const title = window.prompt('Nom du nouveau groupe (type d’intitulé)')?.trim()
    if (!title) return
    setGroups([...groups!, { title, subjects: [] }])
  }

  const preview = useMemo(
    () => (groups && importOpen ? parseImport(importText, groups[importTarget]?.title ?? '', all) : null),
    [groups, importOpen, importText, importTarget, all],
  )

  function runImport() {
    if (!groups || !preview || preview.added.length === 0) return
    const next = groups.map((g) => ({ ...g, subjects: [...g.subjects] }))
    for (const { group, title } of preview.added) {
      let target = next.find((g) => g.title === group)
      if (!target) {
        target = { title: group, subjects: [] }
        next.push(target)
      }
      target.subjects.push({ title })
    }
    setGroups(next)
    setImportNote(
      `${preview.added.length} sujet${preview.added.length > 1 ? 's' : ''} ajouté${preview.added.length > 1 ? 's' : ''}` +
        (preview.duplicates ? `, ${preview.duplicates} doublon${preview.duplicates > 1 ? 's' : ''} écarté${preview.duplicates > 1 ? 's' : ''}` : '') +
        '. Pensez à enregistrer.',
    )
    setImportText('')
  }

  if (!groups) return <p className="p-6 text-sm text-ink-faint">{error ? `Erreur : ${error}` : 'Chargement…'}</p>

  const needle = filter.trim().toLowerCase()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-line px-4 py-2">
        <span className="text-sm font-black">Sujets de La vie ({total})</span>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Chercher un sujet…"
          aria-label="Chercher un sujet"
          className="min-w-48 flex-1 rounded-lg border-2 border-line bg-paper px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => setImportOpen((open) => !open)}
          className="rounded-lg border-2 border-line px-3 py-1 text-sm font-bold hover:bg-ink/5"
        >
          ⇪ {importOpen ? 'Fermer l’import' : 'Importer une liste…'}
        </button>
        <button type="button" onClick={addGroup} className="rounded-lg border-2 border-line px-3 py-1 text-sm font-bold hover:bg-ink/5">
          + Groupe
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={!dirty}
          className="rounded-lg border-2 border-line px-3 py-1 text-sm font-bold disabled:opacity-40"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || status === 'saving'}
          className="rounded-lg border-2 border-teal-deep bg-teal px-3 py-1 text-sm font-bold text-white disabled:opacity-40"
        >
          Enregistrer
        </button>
        {status === 'saved' && !dirty && <span className="text-xs font-bold text-teal-deep">Enregistré</span>}
        {error && <span className="text-xs font-bold text-error">{error}</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {importOpen && (
          <section className="mb-4 flex flex-col gap-2 rounded-xl border-2 border-line p-3">
            <p className="text-xs text-ink-soft">
              Collez une liste : un sujet par ligne (puces et numéros sont retirés). Une ligne « # Titre » ouvre un groupe,
              créé s’il n’existe pas ; sans titre, les sujets vont dans le groupe choisi. Les doublons sont écartés.
            </p>
            <label className="flex items-center gap-2 text-xs font-bold">
              Groupe par défaut
              <select
                value={importTarget}
                onChange={(event) => setImportTarget(Number(event.target.value))}
                className="rounded-lg border-2 border-line bg-paper px-2 py-1 text-sm"
              >
                {groups.map((g, i) => (
                  <option key={i} value={i}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value)
                setImportNote(null)
              }}
              rows={8}
              placeholder={'# Questions fermées\nLa vie est-elle un problème ?\nPeut-on penser la mort ?'}
              className="rounded-lg border-2 border-line bg-paper p-2 font-mono text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={runImport}
                disabled={!preview || preview.added.length === 0}
                className="rounded-lg border-2 border-teal-deep bg-teal px-3 py-1 text-sm font-bold text-white disabled:opacity-40"
              >
                Ajouter à la liste
              </button>
              <span className="text-xs text-ink-soft">
                {importNote ??
                  (preview && importText.trim()
                    ? `${preview.added.length} à ajouter${preview.duplicates ? `, ${preview.duplicates} doublon${preview.duplicates > 1 ? 's' : ''}` : ''}`
                    : '')}
              </span>
            </div>
          </section>
        )}

        {groups.map((group, index) => {
          const visible = needle ? group.subjects.filter((s) => s.title.toLowerCase().includes(needle)) : group.subjects
          if (needle && visible.length === 0) return null
          return (
            <details key={index} open={Boolean(needle) || undefined} className="mb-3 rounded-xl border-2 border-line">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2">
                <span className="flex-1 text-sm font-black">
                  {group.title} <span className="font-bold text-ink-faint">({group.subjects.length})</span>
                </span>
                <button
                  type="button"
                  title="Supprimer le groupe"
                  onClick={(event) => {
                    event.preventDefault()
                    removeGroup(index)
                  }}
                  className="rounded px-1 text-ink-faint hover:text-error"
                >
                  ✕
                </button>
              </summary>
              <div className="flex flex-col gap-2 border-t-2 border-line px-3 py-2">
                <AddField onAdd={(text) => addSubject(index, text)} />
                {visible.map((subject) => (
                  <div key={subject.title} className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-ink/5">
                    <span className="flex-1">{subject.title}</span>
                    {subject.unit && (
                      <span className="rounded bg-teal/15 px-1 text-[0.6rem] font-black text-teal-deep uppercase" title={subject.unit}>
                        traité
                      </span>
                    )}
                    <button
                      type="button"
                      title="Retirer le sujet"
                      onClick={() => removeSubject(index, subject)}
                      className="rounded px-1 text-ink-faint opacity-0 hover:text-error group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}

/** Champ d'ajout : Entrée ajoute le sujet en tête du groupe et vide le champ. */
function AddField({ onAdd }: { onAdd: (text: string) => boolean }) {
  const [value, setValue] = useState('')
  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && onAdd(value)) setValue('')
      }}
      placeholder="Ajouter un sujet (Entrée)"
      aria-label="Ajouter un sujet"
      className="rounded-lg border-2 border-dashed border-line bg-paper px-2 py-1 text-sm"
    />
  )
}
