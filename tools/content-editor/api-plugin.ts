import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ServerResponse } from 'node:http'
import type { Plugin, Connect } from 'vite'
import { parseDocument, Document, Scalar, YAMLSeq, YAMLMap, isMap } from 'yaml'
import { importQuizletRows, importTextUnitRows } from '../content/quizletImport.ts'

/**
 * API de développement pour l'éditeur de contenu : lit et réécrit les
 * fichiers `content/courses/**` du dépôt directement, en préservant leur
 * mise en forme YAML (commentaires, style bloc des `notes:`) grâce à
 * l'API Document de `yaml` plutôt qu'un aller-retour parse/stringify naïf,
 * qui perdrait tout ça.
 *
 * N'existe qu'en `vite dev` (jamais bundlé, jamais exposé en prod) : c'est
 * un outil local, pas une fonctionnalité de l'app.
 */

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const contentDir = join(root, 'content', 'courses')

interface TreeLesson {
  id: string
  title: string
  /** Repère d'une leçon de texte (« §1 », « Introduction ») ; `null` ailleurs. */
  label: string | null
}

interface TreeUnit {
  id: string
  title: string
  group: string | null
  /** Unité de texte : au moins une de ses leçons porte un `passage`. */
  isText: boolean
  lessons: TreeLesson[]
}

interface TreeTrack {
  id: string
  title: string
  kind: string
  units: TreeUnit[]
}

interface TreeCourse {
  id: string
  name: string
  tracks: TreeTrack[]
}

/**
 * Un point de grammaire tel que renvoyé/reçu par l'API — mêmes champs que
 * `grammarPointSchema` (`src/content/schema.ts`), sans `options` ni
 * `translation` : l'éditeur ne les touche jamais, voir `content/philosophie.md`
 * (jamais renseignés sur un point de grammaire philosophique).
 */
interface PointDTO {
  id: string
  sentence: string
  answer: string
  alt: string[]
  explanation?: string
  /** Repère de fragment d'une carte-citation (« 1/3 »), leçons de texte seulement. */
  fragment?: string
}

/** Le paragraphe cité d'une leçon de texte ; `text` vide pour une introduction. */
interface PassageDTO {
  label: string
  text: string
}

/** Une leçon à créer d'un coup, avec son contenu (voir `POST /api/lessons`). */
interface NewLessonDTO {
  title: string
  notes?: string
  passage?: PassageDTO
  points: Omit<PointDTO, 'id'>[]
}

function readYamlDoc(path: string): Document {
  return parseDocument(readFileSync(path, 'utf8'))
}

/**
 * Réécrit un document YAML entier (pas seulement le nœud modifié : `toString`
 * régénère tout le fichier) avec le style déjà en usage dans le contenu du
 * dépôt : jamais d'espace dans un tableau en flux (`alt: ["a", "b"]`), jamais
 * de retour à la ligne forcé (`lineWidth: 0`, une leçon existante pliée à la
 * main resterait sinon coincée sur une seule longue ligne dès son premier
 * passage par l'éditeur).
 *
 * `indentSeq` diffère selon le fichier, et il faut le préciser au bon
 * endroit plutôt que de le fixer une bonne fois ici : un fichier d'unité
 * écrit ses listes (`lessons:`, `points:`…) sans indentation propre
 * (`lessons:\n- id: …`, le défaut ici), alors que chaque `course.yaml`
 * indente les siennes (`tracks:\n  - id: …`, le défaut de la bibliothèque
 * `yaml`, à demander explicitement). Se tromper de style reformate tout le
 * fichier au passage, pour un seul champ changé.
 */
function writeYamlDoc(path: string, doc: Document, opts: { indentSeq?: boolean } = {}): void {
  const indentSeq = opts.indentSeq ?? false
  writeFileSync(path, doc.toString({ lineWidth: 0, flowCollectionPadding: false, indentSeq }), 'utf8')
}

function courseIds(): string[] {
  return readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

function buildTree(): TreeCourse[] {
  const courses: TreeCourse[] = []

  for (const courseId of courseIds()) {
    const courseFile = join(contentDir, courseId, 'course.yaml')
    let courseDoc: Document
    try {
      courseDoc = readYamlDoc(courseFile)
    } catch {
      continue
    }
    // `Document.get` renvoie le nœud `yaml` (YAMLSeq/YAMLMap), pas un
    // tableau/objet JS : `.toJS()` convertit tout le document d'un coup, ce
    // qui suffit pour la simple lecture de l'arborescence (la préservation
    // du style ne compte que pour l'écriture, voir le PUT plus bas).
    const courseData = courseDoc.toJS() as Record<string, unknown>
    const name = String(courseData.name ?? courseId)
    if (courseData.layout !== 'library') continue // les sections `path` n'ont pas encore de contenu réel

    const tracksData = Array.isArray(courseData.tracks) ? (courseData.tracks as Record<string, unknown>[]) : []
    const tracks: TreeTrack[] = []
    for (const t of tracksData) {
      const unitIds = Array.isArray(t.units) ? (t.units as string[]) : []
      const units: TreeUnit[] = []
      for (const unitId of unitIds) {
        const unitFile = join(contentDir, courseId, 'units', `${unitId}.yaml`)
        let unitData: Record<string, unknown>
        try {
          unitData = readYamlDoc(unitFile).toJS() as Record<string, unknown>
        } catch {
          continue
        }
        const lessonsData = Array.isArray(unitData.lessons) ? (unitData.lessons as Record<string, unknown>[]) : []
        const lessons: TreeLesson[] = lessonsData.map((l) => ({
          id: String(l.id),
          title: String(l.title ?? l.id),
          label: l.passage ? String((l.passage as Record<string, unknown>).label ?? '') : null,
        }))
        units.push({
          id: unitId,
          title: String(unitData.title ?? unitId),
          group: unitData.group ? String(unitData.group) : null,
          isText: lessonsData.some((l) => Boolean(l.passage)),
          lessons,
        })
      }
      tracks.push({ id: String(t.id), title: String(t.title ?? t.id), kind: String(t.kind ?? 'grammar'), units })
    }
    courses.push({ id: courseId, name, tracks })
  }

  return courses
}

/** Trouve l'index d'une leçon dans le tableau `lessons` d'un document d'unité. */
function findLessonIndex(unitDoc: Document, lessonId: string): number {
  const lessons = (unitDoc.toJS() as Record<string, unknown>).lessons
  if (!Array.isArray(lessons)) return -1
  return (lessons as Record<string, unknown>[]).findIndex((lesson) => lesson.id === lessonId)
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

/** Chaîne entre guillemets doubles, le style déjà en usage dans tout le contenu. */
function dq(value: string): Scalar {
  const scalar = new Scalar(value)
  scalar.type = Scalar.QUOTE_DOUBLE
  return scalar
}

/** `alt: ["…", "…"]` en flux sur une ligne, ou `alt: []` si vide — jamais en bloc. */
function altSeq(values: string[]): YAMLSeq {
  const seq = new YAMLSeq()
  seq.flow = true
  for (const value of values) seq.items.push(dq(value))
  return seq
}

/** Construit le nœud d'un point tout neuf, avec le style de guillemets déjà en usage. */
function buildPointNode(point: PointDTO): YAMLMap {
  const map = new YAMLMap()
  map.set('id', point.id)
  if (point.fragment) map.set('fragment', dq(point.fragment))
  map.set('sentence', dq(point.sentence))
  map.set('answer', dq(point.answer))
  map.set('alt', altSeq(point.alt))
  if (point.explanation) map.set('explanation', dq(point.explanation))
  return map
}

/**
 * Applique la liste de points reçue à la `YAMLSeq` existante : un point dont
 * l'id existe déjà voit ses champs mis à jour en place (ce qui préserve le
 * style du nœud existant, comme pour `notes` plus bas) ; un id absent du
 * document est un point tout neuf, créé avec le style de guillemets déjà en
 * usage ; un id présent dans le document mais absent de la liste reçue a été
 * supprimé côté éditeur. L'ordre final suit celui de la liste reçue — un
 * simple réordonnancement ne recrée donc aucun nœud, il ne fait que
 * réordonner les mêmes.
 */
function syncPoints(seq: YAMLSeq, points: PointDTO[]): void {
  const existingById = new Map<string, unknown>()
  for (const item of seq.items) {
    if (isMap(item)) existingById.set(String(item.get('id')), item)
  }

  seq.items = points.map((point) => {
    const existing = existingById.get(point.id)
    if (existing && isMap(existing)) {
      setScalar(existing, 'sentence', point.sentence)
      setScalar(existing, 'answer', point.answer)
      existing.set('alt', altSeq(point.alt))
      if (point.explanation) setScalar(existing, 'explanation', point.explanation)
      else existing.delete('explanation')
      if (point.fragment) setScalar(existing, 'fragment', point.fragment)
      else existing.delete('fragment')
      return existing
    }
    return buildPointNode(point)
  })
}

/** Modifie la valeur d'un scalaire existant en place, plutôt que de le remplacer. */
function setScalar(map: YAMLMap, key: string, value: string): void {
  const node = map.get(key, true) as { value: unknown } | undefined
  if (node && typeof node === 'object' && 'value' in node) node.value = value
  else map.set(key, dq(value))
}

/**
 * Écrit `notes`, en choisissant le style bloc (`|`) dès que le texte tient
 * sur plusieurs lignes — celui qu'un rappel écrit à la main prend toujours,
 * et le seul lisible une fois relu tel quel. Sans ce choix explicite, une
 * leçon créée depuis l'éditeur (voir `buildNewLessonNode`) démarre avec un
 * `notes: ''` en guillemets, et le premier rappel un peu long qu'on y tape
 * resterait figé dans ce même style — une longue ligne entre guillemets,
 * les retours à la ligne échappés en `\n`, illisible à la main.
 */
function setNotes(doc: Document, lessonIdx: number, notes: string): void {
  const wantsBlock = notes.includes('\n')
  const existing = doc.getIn(['lessons', lessonIdx, 'notes'], true)
  if (existing instanceof Scalar) {
    existing.value = notes
    existing.type = wantsBlock ? Scalar.BLOCK_LITERAL : undefined
    return
  }
  const scalar = new Scalar(notes)
  if (wantsBlock) scalar.type = Scalar.BLOCK_LITERAL
  doc.setIn(['lessons', lessonIdx, 'notes'], scalar)
}

/**
 * Écrit le `passage` d'une leçon de texte : son repère, et son texte s'il y
 * en a un (une leçon d'introduction n'en a pas, voir `passageSchema`). Le
 * texte passe en style bloc dès qu'il compte plusieurs alinéas, comme
 * `notes` (voir `setNotes`).
 */
function passageNode(passage: PassageDTO): YAMLMap {
  const map = new YAMLMap()
  map.set('label', dq(passage.label))
  const text = passage.text.trim()
  if (text) {
    const scalar = new Scalar(text)
    scalar.type = text.includes('\n') ? Scalar.BLOCK_LITERAL : Scalar.QUOTE_DOUBLE
    map.set('text', scalar)
  }
  return map
}

function setPassage(doc: Document, lessonIdx: number, passage: PassageDTO): void {
  const lesson = doc.getIn(['lessons', lessonIdx], true)
  if (!isMap(lesson)) return
  // Remis à sa place habituelle, juste avant `points`, pour que le fichier
  // reste lisible à la main dans l'ordre titre, rappel, texte, cartes.
  lesson.delete('passage')
  const node = passageNode(passage)
  const pointsIdx = lesson.items.findIndex((pair) => String((pair.key as Scalar | string)?.toString()) === 'points')
  const pair = doc.createPair('passage', node)
  if (pointsIdx === -1) lesson.items.push(pair)
  else lesson.items.splice(pointsIdx, 0, pair)
}

const slugPattern = /^[a-z0-9][a-z0-9-]*$/

/**
 * Dérive un identifiant d'unité à partir de son titre : minuscules, accents
 * retirés, tout ce qui n'est pas `a-z0-9` réduit à un tiret unique, jamais de
 * tiret en tête ni en queue — le format qu'exige `slugPattern`. Un titre qui
 * ne laisserait aucun caractère exploitable (uniquement des accents ou de la
 * ponctuation) retombe sur `unite` plutôt que de produire un identifiant vide.
 */
function slugify(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slugPattern.test(slug) ? slug : 'unite'
}

/**
 * Un identifiant d'unité unique dans le cours, dérivé du titre par `slugify`
 * : ajoute `-2`, `-3`… au premier qui entrerait en collision, avec une unité
 * déjà référencée dans `course.yaml` ou un fichier déjà présent sur disque
 * (une unité retirée de `course.yaml` sans que son fichier soit supprimé,
 * par exemple).
 */
function uniqueUnitId(course: string, title: string, tracksData: Record<string, unknown>[]): string {
  const used = new Set<string>()
  for (const t of tracksData) {
    for (const unitId of Array.isArray(t.units) ? (t.units as string[]) : []) used.add(unitId)
  }
  const base = slugify(title)
  let id = base
  let n = 2
  while (used.has(id) || existsSync(join(contentDir, course, 'units', `${id}.yaml`))) {
    id = `${base}-${n}`
    n++
  }
  return id
}

/** Le champ qui porte le contenu d'une leçon, selon la nature héritée de sa piste. */
function lessonContentKey(kind: string): 'vocab' | 'verbs' | 'points' {
  if (kind === 'vocab') return 'vocab'
  if (kind === 'conjugation') return 'verbs'
  return 'points'
}

/**
 * Nature (`vocab`/`grammar`/`conjugation`) de la piste qui référence cette
 * unité dans `course.yaml` — une leçon en hérite pour savoir sous quel champ
 * ranger son contenu (voir `lessonContentKey`). `grammar` par défaut si la
 * piste reste introuvable : c'est la nature de tout le contenu philosophique
 * actif (voir `content/philosophie.md`).
 */
function findTrackKindForUnit(courseId: string, unitId: string): string {
  try {
    const tracks = (readYamlDoc(join(contentDir, courseId, 'course.yaml')).toJS() as Record<string, unknown>).tracks
    if (Array.isArray(tracks)) {
      for (const track of tracks as Record<string, unknown>[]) {
        const units = Array.isArray(track.units) ? (track.units as string[]) : []
        if (units.includes(unitId)) return String(track.kind ?? 'grammar')
      }
    }
  } catch {
    // Fichier illisible ou absent : retombe sur le défaut ci-dessous.
  }
  return 'grammar'
}

/**
 * Id de la prochaine leçon d'une unité, sur le même gabarit que celles déjà
 * en place (`<unité>-l<n>`) — même principe que `nextPointId` côté client,
 * appliqué ici aux leçons.
 */
function nextLessonId(unitId: string, existingIds: string[]): string {
  const prefix = `${unitId}-l`
  let max = 0
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) continue
    const n = Number(id.slice(prefix.length))
    if (Number.isFinite(n)) max = Math.max(max, n)
  }
  return `${prefix}${max + 1}`
}

/**
 * Nœud d'une leçon toute neuve : titre donné, rappel vide, et un tableau de
 * contenu vide (`points`/`vocab`/`verbs` selon `kind`) — vide, donc
 * momentanément en dessous du minimum que `content:check` exige (trois
 * points, voir `content/philosophie.md`) : la leçon existe pour qu'on la
 * remplisse depuis l'éditeur, pas pour rester telle quelle.
 */
function buildNewLessonNode(
  id: string,
  title: string,
  kind: string,
  content: { notes?: string; passage?: PassageDTO; points?: Omit<PointDTO, 'id'>[] } = {},
): YAMLMap {
  const map = new YAMLMap()
  map.set('id', id)
  map.set('title', dq(title))
  const notes = content.notes ?? ''
  const notesScalar = new Scalar(notes)
  if (notes.includes('\n')) notesScalar.type = Scalar.BLOCK_LITERAL
  map.set('notes', notesScalar)
  if (content.passage) map.set('passage', passageNode(content.passage))
  const seq = new YAMLSeq()
  const points = content.points ?? []
  if (points.length === 0) seq.flow = true
  points.forEach((point, index) => seq.items.push(buildPointNode({ ...point, id: `${id}-p${index + 1}` })))
  map.set(lessonContentKey(kind), seq)
  return map
}

/** Une unité est-elle une unité de texte ? Au moins une leçon porte un `passage`. */
function isTextUnitDoc(doc: Document): boolean {
  const lessons = (doc.toJS() as Record<string, unknown>).lessons
  return Array.isArray(lessons) && (lessons as Record<string, unknown>[]).some((lesson) => Boolean(lesson.passage))
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export function contentEditorApi(): Plugin {
  return {
    name: 'content-editor-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/tree', (_req, res) => {
        sendJson(res, 200, buildTree())
      })

      // Même conversion que `tools/content/from-quizlet.ts`, mais qui rend
      // directement des points exploitables par `PointsEditor` au lieu
      // d'écrire un bassin YAML à recopier à la main (voir `quizletImport.ts`).
      server.middlewares.use('/api/import-points', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'méthode non supportée' })
          return
        }
        try {
          const body = JSON.parse(await readBody(req)) as { text: string; termSep?: string; rowSep?: string }
          if (!body.text || !body.text.trim()) {
            sendJson(res, 400, { error: 'texte vide' })
            return
          }
          const result = importQuizletRows(body.text, { termSep: body.termSep, rowSep: body.rowSep })
          sendJson(res, 200, result)
        } catch (error) {
          sendJson(res, 500, { error: String((error as Error).message) })
        }
      })

      // Lecture d'une longue liste de cartes pour la découper ensuite en
      // leçons dans l'éditeur (voir `ImportSplitDialog`) : les cartes à
      // plusieurs trous y restent entières, et les préfixes « §n, titre : »
      // et « (k/n) » sont reconnus (voir `importTextUnitRows`).
      server.middlewares.use('/api/import-text-cards', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'méthode non supportée' })
          return
        }
        try {
          const body = JSON.parse(await readBody(req)) as { text: string }
          if (!body.text || !body.text.trim()) {
            sendJson(res, 400, { error: 'texte vide' })
            return
          }
          sendJson(res, 200, importTextUnitRows(body.text))
        } catch (error) {
          sendJson(res, 500, { error: String((error as Error).message) })
        }
      })

      // Plusieurs leçons d'un coup, ajoutées à la fin d'une unité, avec leur
      // contenu : c'est la dernière étape du découpage d'une liste importée.
      // Les identifiants (leçons, cartes) sont attribués ici, jamais par le
      // client.
      server.middlewares.use('/api/lessons', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'méthode non supportée' })
          return
        }
        const url = new URL(req.url ?? '', 'http://localhost')
        const course = url.searchParams.get('course')
        const unit = url.searchParams.get('unit')
        if (!course || !unit) {
          sendJson(res, 400, { error: 'course et unit sont requis' })
          return
        }
        try {
          const body = JSON.parse(await readBody(req)) as { lessons: NewLessonDTO[] }
          if (!Array.isArray(body.lessons) || body.lessons.length === 0) {
            sendJson(res, 400, { error: 'aucune leçon à créer' })
            return
          }
          const unitFile = join(contentDir, course, 'units', `${unit}.yaml`)
          const doc = readYamlDoc(unitFile)
          const lessonsSeq = doc.getIn(['lessons'])
          if (!(lessonsSeq instanceof YAMLSeq)) throw new Error(`"${unit}" n'a pas de tableau lessons`)
          const existingIds = (((doc.toJS() as Record<string, unknown>).lessons as Record<string, unknown>[]) ?? []).map(
            (l) => String(l.id),
          )
          const kind = findTrackKindForUnit(course, unit)
          const created: { id: string; title: string }[] = []
          for (const lesson of body.lessons) {
            const title = lesson.title.trim() || 'Leçon sans titre'
            const id = nextLessonId(unit, [...existingIds, ...created.map((c) => c.id)])
            lessonsSeq.items.push(buildNewLessonNode(id, title, kind, lesson))
            created.push({ id, title })
          }
          writeYamlDoc(unitFile, doc)
          sendJson(res, 200, { ok: true, lessons: created })
        } catch (error) {
          sendJson(res, 500, { error: String((error as Error).message) })
        }
      })

      server.middlewares.use('/api/lesson', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const course = url.searchParams.get('course')
        const unit = url.searchParams.get('unit')
        const lesson = url.searchParams.get('lesson')

        if (!course || !unit) {
          sendJson(res, 400, { error: 'course et unit sont requis' })
          return
        }
        const unitFile = join(contentDir, course, 'units', `${unit}.yaml`)

        // Pas de `lesson` : création d'une leçon toute neuve dans cette unité,
        // plutôt que d'en modifier une qui existe déjà (voir GET/PUT plus bas).
        if (req.method === 'POST') {
          try {
            const body = JSON.parse(await readBody(req)) as { title?: string; label?: string }
            const title = body.title?.trim()
            if (!title) {
              sendJson(res, 400, { error: 'titre requis' })
              return
            }
            const doc = readYamlDoc(unitFile)
            // Dans une unité de texte, toute leçon neuve a son repère, même
            // vide : c'est ce qui la fait jouer comme une leçon de texte.
            const passage = isTextUnitDoc(doc) ? { label: body.label?.trim() ?? '', text: '' } : undefined
            const existingIds = ((doc.toJS() as Record<string, unknown>).lessons as Record<string, unknown>[] | undefined ?? []).map(
              (l) => String(l.id),
            )
            const id = nextLessonId(unit, existingIds)
            const kind = findTrackKindForUnit(course, unit)
            const lessonsSeq = doc.getIn(['lessons'])
            if (!(lessonsSeq instanceof YAMLSeq)) throw new Error(`"${unit}" n'a pas de tableau lessons`)
            lessonsSeq.items.push(buildNewLessonNode(id, title, kind, { passage }))
            writeYamlDoc(unitFile, doc)
            sendJson(res, 200, { ok: true, lesson: { id, title } })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        if (!lesson) {
          sendJson(res, 400, { error: 'lesson est requis' })
          return
        }

        if (req.method === 'GET') {
          try {
            const doc = readYamlDoc(unitFile)
            const idx = findLessonIndex(doc, lesson)
            if (idx === -1) {
              sendJson(res, 404, { error: `leçon "${lesson}" introuvable dans ${unit}` })
              return
            }
            const lessons = (doc.toJS() as Record<string, unknown>).lessons as Record<string, unknown>[]
            const lessonData = lessons[idx]
            const kind = String(lessonData.kind ?? 'grammar')
            const points = kind === 'grammar' ? (lessonData.points as PointDTO[] | undefined) : undefined
            const passage = lessonData.passage as Record<string, unknown> | undefined
            sendJson(res, 200, {
              title: String(lessonData.title ?? lesson),
              notes: String(lessonData.notes ?? ''),
              passage: passage ? { label: String(passage.label ?? ''), text: String(passage.text ?? '') } : null,
              kind,
              // `alt` est optionnel dans le contenu (beaucoup de points n'en ont
              // jamais eu besoin, voir content/courses/hors-programme) mais pas
              // dans le DTO envoyé au client, qui suppose un tableau toujours
              // présent (`point.alt.join(...)` dans `PointsEditor`) : sans ce
              // filet, une leçon dont aucun point ne porte `alt` fait planter
              // l'onglet Exercices dès l'ouverture.
              points: points ? points.map((point) => ({ ...point, alt: point.alt ?? [] })) : null,
            })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        if (req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req)) as {
              title?: string
              notes: string
              points?: PointDTO[]
              passage?: PassageDTO | null
            }
            const doc = readYamlDoc(unitFile)
            const idx = findLessonIndex(doc, lesson)
            if (idx === -1) {
              sendJson(res, 404, { error: `leçon "${lesson}" introuvable dans ${unit}` })
              return
            }
            if (body.title !== undefined) {
              const title = body.title.trim()
              if (!title) {
                sendJson(res, 400, { error: 'titre requis' })
                return
              }
              const lessonNode = doc.getIn(['lessons', idx])
              if (isMap(lessonNode)) setScalar(lessonNode, 'title', title)
            }
            setNotes(doc, idx, body.notes)
            if (body.passage) setPassage(doc, idx, body.passage)
            if (body.points) {
              const pointsSeq = doc.getIn(['lessons', idx, 'points'])
              if (pointsSeq instanceof YAMLSeq) syncPoints(pointsSeq, body.points)
              else doc.setIn(['lessons', idx, 'points'], body.points.map(buildPointNode))
            }
            writeYamlDoc(unitFile, doc)
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        if (req.method === 'DELETE') {
          try {
            const doc = readYamlDoc(unitFile)
            const idx = findLessonIndex(doc, lesson)
            if (idx === -1) {
              sendJson(res, 404, { error: `leçon "${lesson}" introuvable dans ${unit}` })
              return
            }
            const lessonsSeq = doc.getIn(['lessons'])
            if (!(lessonsSeq instanceof YAMLSeq)) throw new Error(`"${unit}" n'a pas de tableau lessons`)
            // `unitSchema.lessons` exige au moins une leçon (voir
            // `src/content/schema.ts`) : retirer la dernière laisserait
            // l'unité invalide, pas seulement momentanément vide.
            if (lessonsSeq.items.length <= 1) {
              sendJson(res, 400, {
                error: "impossible de supprimer la dernière leçon d'une unité : supprimez l'unité entière",
              })
              return
            }
            lessonsSeq.items.splice(idx, 1)
            writeYamlDoc(unitFile, doc)
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        sendJson(res, 405, { error: 'méthode non supportée' })
      })

      // Une unité toute neuve, dans une piste existante. `unitSchema.lessons`
      // exige au moins une leçon (voir `src/content/schema.ts`) : la
      // création groupe donc toujours l'unité et sa première leçon, jamais
      // l'une sans l'autre — sans quoi le fichier écrit serait invalide dès
      // sa naissance, pas seulement momentanément le temps de le remplir.
      server.middlewares.use('/api/unit', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const course = url.searchParams.get('course')

        // Réglages d'une unité déjà là (voir `UnitSettingsDialog`).
        if (req.method === 'GET') {
          const unit = url.searchParams.get('unit')
          if (!course || !unit) {
            sendJson(res, 400, { error: 'course et unit sont requis' })
            return
          }
          try {
            const doc = readYamlDoc(join(contentDir, course, 'units', `${unit}.yaml`))
            const data = doc.toJS() as Record<string, unknown>
            sendJson(res, 200, {
              title: String(data.title ?? unit),
              subtitle: String(data.subtitle ?? ''),
              group: String(data.group ?? ''),
              intro: String(data.intro ?? ''),
              isText: isTextUnitDoc(doc),
            })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        // Modifie les réglages d'une unité déjà là : titre (requis),
        // sous-titre, groupe, présentation. Un champ absent du corps n'est pas
        // touché ; un champ vide est retiré du fichier. Jamais l'id ni les
        // leçons.
        if (req.method === 'PUT') {
          const unit = url.searchParams.get('unit')
          if (!course || !unit) {
            sendJson(res, 400, { error: 'course et unit sont requis' })
            return
          }
          try {
            const body = JSON.parse(await readBody(req)) as {
              title?: string
              subtitle?: string
              group?: string
              intro?: string
            }
            const title = body.title?.trim()
            if (!title) {
              sendJson(res, 400, { error: 'titre requis' })
              return
            }
            const unitFile = join(contentDir, course, 'units', `${unit}.yaml`)
            const doc = readYamlDoc(unitFile)
            const root = doc.contents
            if (!isMap(root)) throw new Error(`"${unit}" n'a pas de nœud racine exploitable`)
            setScalar(root, 'title', title)
            for (const key of ['subtitle', 'group'] as const) {
              const value = body[key]
              if (value === undefined) continue
              if (value.trim()) setScalar(root, key, value.trim())
              else root.delete(key)
            }
            if (body.intro !== undefined) {
              const intro = body.intro.trim()
              if (!intro) root.delete('intro')
              else {
                const scalar = new Scalar(intro)
                scalar.type = Scalar.BLOCK_LITERAL
                root.set('intro', scalar)
              }
            }
            writeYamlDoc(unitFile, doc)
            sendJson(res, 200, { ok: true, unit: { id: unit, title } })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        // Supprime une unité déjà là : la retire de la piste qui la
        // référence dans course.yaml, puis efface son fichier. Contrairement
        // à une leçon (voir DELETE /api/lesson), une piste peut toujours
        // redescendre à zéro unité (voir content/README.md « Publier le
        // squelette d'un niveau »).
        if (req.method === 'DELETE') {
          const unit = url.searchParams.get('unit')
          if (!course || !unit) {
            sendJson(res, 400, { error: 'course et unit sont requis' })
            return
          }
          try {
            const courseFile = join(contentDir, course, 'course.yaml')
            const courseDoc = readYamlDoc(courseFile)
            const courseData = courseDoc.toJS() as Record<string, unknown>
            const tracksData = Array.isArray(courseData.tracks) ? (courseData.tracks as Record<string, unknown>[]) : []
            const trackIdx = tracksData.findIndex((t) =>
              (Array.isArray(t.units) ? (t.units as string[]) : []).includes(unit),
            )
            if (trackIdx === -1) {
              sendJson(res, 404, { error: `unité "${unit}" introuvable dans ce cours` })
              return
            }
            const units = tracksData[trackIdx]!.units as string[]
            const itemIdx = units.indexOf(unit)
            const unitsSeq = courseDoc.getIn(['tracks', trackIdx, 'units'])
            if (!(unitsSeq instanceof YAMLSeq)) throw new Error(`piste "${tracksData[trackIdx]!.id}" sans tableau units`)
            unitsSeq.items.splice(itemIdx, 1)
            writeYamlDoc(courseFile, courseDoc, { indentSeq: true })

            const unitFile = join(contentDir, course, 'units', `${unit}.yaml`)
            if (existsSync(unitFile)) unlinkSync(unitFile)

            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'méthode non supportée' })
          return
        }
        const track = url.searchParams.get('track')
        if (!course || !track) {
          sendJson(res, 400, { error: 'course et track sont requis' })
          return
        }
        try {
          const body = JSON.parse(await readBody(req)) as {
            title?: string
            firstLessonTitle?: string
            /** `text` : unité de texte (voir content/textes.md) ; `classic` par défaut. */
            type?: 'classic' | 'text'
            subtitle?: string
            group?: string
            intro?: string
            /** Repère de la première leçon d'une unité de texte (« §1 », « Introduction »). */
            firstLessonLabel?: string
          }
          const title = body.title?.trim()
          const firstLessonTitle = body.firstLessonTitle?.trim()
          if (!title || !firstLessonTitle) {
            sendJson(res, 400, { error: 'titre et titre de la première leçon requis' })
            return
          }

          const courseFile = join(contentDir, course, 'course.yaml')
          const courseDoc = readYamlDoc(courseFile)
          const courseData = courseDoc.toJS() as Record<string, unknown>
          const tracksData = Array.isArray(courseData.tracks) ? (courseData.tracks as Record<string, unknown>[]) : []
          const trackIdx = tracksData.findIndex((t) => t.id === track)
          if (trackIdx === -1) {
            sendJson(res, 404, { error: `piste "${track}" introuvable` })
            return
          }
          // Dérivé du titre plutôt que demandé à part : voir `uniqueUnitId`
          // pour la déduplication (le titre seul ne garantit rien).
          const id = uniqueUnitId(course, title, tracksData)
          const unitFile = join(contentDir, course, 'units', `${id}.yaml`)

          const kind = String(tracksData[trackIdx]!.kind ?? 'grammar')
          const firstLessonId = `${id}-l1`

          const isText = body.type === 'text'
          const unitMap = new YAMLMap()
          unitMap.set('id', id)
          unitMap.set('title', dq(title))
          if (body.subtitle?.trim()) unitMap.set('subtitle', dq(body.subtitle.trim()))
          // Une unité de texte porte l'icône de la feuille et la couleur de
          // sa piste, comme celles déjà écrites (voir content/textes.md).
          if (isText) {
            unitMap.set('icon', 'page')
            unitMap.set('color', String(tracksData[trackIdx]!.color ?? 'coral'))
          }
          if (body.group?.trim()) unitMap.set('group', dq(body.group.trim()))
          if (body.intro?.trim()) {
            const intro = new Scalar(body.intro.trim())
            intro.type = Scalar.BLOCK_LITERAL
            unitMap.set('intro', intro)
          }
          const lessonsSeq = new YAMLSeq()
          lessonsSeq.items.push(
            buildNewLessonNode(firstLessonId, firstLessonTitle, kind, {
              passage: isText ? { label: body.firstLessonLabel?.trim() ?? '', text: '' } : undefined,
            }),
          )
          unitMap.set('lessons', lessonsSeq)
          const unitDoc = new Document(unitMap)
          writeYamlDoc(unitFile, unitDoc)

          const unitsSeq = courseDoc.getIn(['tracks', trackIdx, 'units'])
          if (unitsSeq instanceof YAMLSeq) unitsSeq.items.push(id)
          else courseDoc.setIn(['tracks', trackIdx, 'units'], [id])
          writeYamlDoc(courseFile, courseDoc, { indentSeq: true })

          sendJson(res, 200, { ok: true, unit: { id, title }, lesson: { id: firstLessonId, title: firstLessonTitle } })
        } catch (error) {
          sendJson(res, 500, { error: String((error as Error).message) })
        }
      })
    },
  }
}
