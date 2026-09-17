import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, Connect } from 'vite'
import { parseDocument, Document } from 'yaml'

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
  units: TreeUnit[]
}

interface TreeCourse {
  id: string
  name: string
  tracks: TreeTrack[]
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
    const name = String(courseDoc.get('name') ?? courseId)
    const layout = courseDoc.get('layout')
    if (layout !== 'library') continue // les sections `path` n'ont pas encore de contenu réel

    const tracksNode = courseDoc.get('tracks')
    const tracks: TreeTrack[] = []
    if (Array.isArray(tracksNode)) {
      for (const track of tracksNode as unknown[]) {
        const t = track as Record<string, unknown>
        const unitIds = Array.isArray(t.units) ? (t.units as string[]) : []
        const units: TreeUnit[] = []
        for (const unitId of unitIds) {
          const unitFile = join(contentDir, courseId, 'units', `${unitId}.yaml`)
          let unitDoc: Document
          try {
            unitDoc = readYamlDoc(unitFile)
          } catch {
            continue
          }
          const lessonsNode = unitDoc.get('lessons')
          const lessons: TreeLesson[] = Array.isArray(lessonsNode)
            ? (lessonsNode as unknown[]).map((lesson) => {
                const l = lesson as Record<string, unknown>
                return { id: String(l.id), title: String(l.title ?? l.id) }
              })
            : []
          units.push({
            id: unitId,
            title: String(unitDoc.get('title') ?? unitId),
            group: unitDoc.get('group') ? String(unitDoc.get('group')) : null,
            lessons,
          })
        }
        tracks.push({ id: String(t.id), title: String(t.title ?? t.id), units })
      }
    }
    courses.push({ id: courseId, name, tracks })
  }

  return courses
}

/** Trouve l'index d'une leçon dans le tableau `lessons` d'un document d'unité. */
function findLessonIndex(unitDoc: Document, lessonId: string): number {
  const lessonsNode = unitDoc.get('lessons')
  if (!Array.isArray(lessonsNode)) return -1
  return (lessonsNode as unknown[]).findIndex((lesson) => (lesson as Record<string, unknown>).id === lessonId)
}

function sendJson(res: Connect.ServerResponse | any, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
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
            const lessonNode = doc.getIn(['lessons', idx]) as Record<string, unknown>
            sendJson(res, 200, { title: String(lessonNode.title ?? lesson), notes: String(lessonNode.notes ?? '') })
          } catch (error) {
            sendJson(res, 500, { error: String((error as Error).message) })
          }
          return
        }

        if (req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req)) as { notes: string }
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
            writeFileSync(unitFile, doc.toString({ lineWidth: 0 }), 'utf8')
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
