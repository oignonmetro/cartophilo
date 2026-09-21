import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ServerResponse } from 'node:http'
import type { Plugin, Connect } from 'vite'
import { parseDocument, Document, Scalar, YAMLSeq, YAMLMap, isMap } from 'yaml'
import { importQuizletRows } from '../content/quizletImport.ts'

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
}

interface TreeUnit {
  id: string
  title: string
  group: string | null
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
}

function readYamlDoc(path: string): Document {
  return parseDocument(readFileSync(path, 'utf8'))
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
        }))
        units.push({
          id: unitId,
          title: String(unitData.title ?? unitId),
          group: unitData.group ? String(unitData.group) : null,
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

      server.middlewares.use('/api/lesson', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const course = url.searchParams.get('course')
        const unit = url.searchParams.get('unit')
        const lesson = url.searchParams.get('lesson')

        if (!course || !unit || !lesson) {
          sendJson(res, 400, { error: 'course, unit et lesson sont requis' })
          return
        }
        const unitFile = join(contentDir, course, 'units', `${unit}.yaml`)

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
            sendJson(res, 200, {
              title: String(lessonData.title ?? lesson),
              notes: String(lessonData.notes ?? ''),
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
            const body = JSON.parse(await readBody(req)) as { notes: string; points?: PointDTO[] }
            const doc = readYamlDoc(unitFile)
            const idx = findLessonIndex(doc, lesson)
            if (idx === -1) {
              sendJson(res, 404, { error: `leçon "${lesson}" introuvable dans ${unit}` })
              return
            }
            // On modifie le scalaire existant plutôt que de remplacer le nœud :
            // ça garde son style bloc (`|`) au lieu de retomber sur un style
            // par défaut (guillemets, échappement des retours à la ligne) qui
            // rendrait le fichier illisible à la main par la suite.
            const notesScalar = doc.getIn(['lessons', idx, 'notes'], true) as { value: unknown } | undefined
            if (notesScalar && typeof notesScalar === 'object' && 'value' in notesScalar) {
              notesScalar.value = body.notes
            } else {
              doc.setIn(['lessons', idx, 'notes'], body.notes)
            }
            if (body.points) {
              const pointsSeq = doc.getIn(['lessons', idx, 'points'])
              if (pointsSeq instanceof YAMLSeq) syncPoints(pointsSeq, body.points)
              else doc.setIn(['lessons', idx, 'points'], body.points.map(buildPointNode))
            }
            // Jamais d'espace après `[` ni avant `]` dans un tableau en flux
            // (`alt: ["a", "b"]`) : le style déjà en usage dans tout le contenu.
            writeFileSync(unitFile, doc.toString({ lineWidth: 0, flowCollectionPadding: false }), 'utf8')
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        sendJson(res, 405, { error: 'méthode non supportée' })
      })
    },
  }
}
