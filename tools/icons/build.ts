/**
 * Génère les icônes PNG de l'application à partir de `public/favicon.svg`
 * (icônes plates) et `public/favicon-foreground.svg` (calque avant des
 * icônes adaptatives/maskable, sans le fond).
 *
 *   npm run icons
 *
 * Les fichiers produits sont versionnés : le build de l'APK et le manifeste
 * PWA les consomment tels quels, sans dépendance de génération d'images.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const source = readFileSync(join(root, 'public', 'favicon.svg'))
const foreground = readFileSync(join(root, 'public', 'favicon-foreground.svg'))
const outDir = join(root, 'public', 'icons')

/** Fond plein du logo (voir favicon.svg) : celui des icônes adaptatives. */
const PURPLE = '#3B2748'

/**
 * Marge du calque avant d'une icône adaptative/maskable : l'OS (Android, ou
 * Chrome pour le PWA « ajouter à l'écran d'accueil ») découpe la forme finale
 * lui-même (cercle, carré arrondi...) et doit pouvoir rogner jusqu'à cette
 * marge sans jamais mordre sur le dessin. Le fond, lui, doit couvrir tout le
 * canevas : c'est lui qui remplit une fois la forme découpée, jamais une
 * copie réduite du logo entier sur un fond vide (voir le calque avant,
 * `favicon-foreground.svg`, qui ne contient que le dessin, pas le fond).
 */
const MASKABLE_PADDING = 0.2

async function render(size: number, name: string, padding = 0) {
  await write(outDir, name, size, source, padding, PURPLE)
  console.log(`  ✓ icons/${name} (${size}×${size})`)
}

/**
 * Icônes du lanceur Android.
 *
 * Les densités suivent la convention Android (48 dp de base). Le calque avant
 * des icônes adaptatives fait 108 dp, dont seuls les 72 dp centraux sont
 * garantis visibles : d'où la marge appliquée au dessin.
 */
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const ADAPTIVE_PADDING = (1 - 72 / 108) / 2

async function renderAndroid() {
  const resDir = join(root, 'android', 'app', 'src', 'main', 'res')
  if (!existsSync(resDir)) {
    console.log('  · projet Android absent, icônes de lanceur ignorées')
    return
  }

  for (const [density, scale] of Object.entries(DENSITIES)) {
    const dir = join(resDir, `mipmap-${density}`)
    mkdirSync(dir, { recursive: true })

    const legacy = Math.round(48 * scale)
    const adaptive = Math.round(108 * scale)

    await write(dir, 'ic_launcher.png', legacy, source, 0, PURPLE)
    await write(dir, 'ic_launcher_round.png', legacy, source, 0, PURPLE)
    // Calque avant : seulement le dessin, le fond est composé par Android
    // à partir de ic_launcher_background (transparent ici pour le laisser
    // transparaître).
    await write(dir, 'ic_launcher_foreground.png', adaptive, foreground, ADAPTIVE_PADDING, null)
  }

  // Fond plein de l'icône adaptative : le violet du logo, jamais la couleur
  // de la page (voir le calque avant) — sans quoi la forme finale, une fois
  // découpée par Android, montrerait un liseré ou un fond vide autour d'un
  // dessin réduit au lieu d'être remplie jusqu'au bord.
  writeFileSync(
    join(resDir, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${PURPLE}</color>\n</resources>\n`,
    'utf8',
  )

  console.log('  ✓ icônes de lanceur Android (5 densités)')
}

async function write(
  dir: string,
  name: string,
  size: number,
  svg: Buffer,
  padding: number,
  background: string | null,
) {
  const inner = Math.round(size * (1 - padding * 2))
  const art = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer()
  const offset = Math.round((size - inner) / 2)

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: art, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toFile(join(dir, name))
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  await render(192, 'icon-192.png')
  await render(512, 'icon-512.png')
  // Icône maskable : fond plein (violet) jusqu'au bord, calque avant seul
  // (sans fond) dans la marge de sécurité — jamais le logo entier réduit
  // sur un fond de page, qui laisserait un grand vide une fois découpé.
  await write(outDir, 'icon-512-maskable.png', 512, foreground, MASKABLE_PADDING, PURPLE)
  console.log(`  ✓ icons/icon-512-maskable.png (512×512)`)
  await renderAndroid()

  writeFileSync(
    join(outDir, 'README.md'),
    'Icônes générées par `npm run icons` à partir de `public/favicon.svg` et\n`public/favicon-foreground.svg`.\nNe pas éditer à la main.\n',
    'utf8',
  )
}

void main()
