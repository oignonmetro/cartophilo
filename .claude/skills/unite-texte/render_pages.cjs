// Rend en PNG lisibles les pages préparées par pdf_pages.py (TIFF de scan,
// SVG de tracés), avec sharp, déjà présent dans le projet.
// Usage, depuis la racine du dépôt : node .claude/skills/unite-texte/render_pages.cjs DOSSIER_COURT
const fs = require('fs')
const path = require('path')
const sharp = require(path.join(process.cwd(), 'node_modules', 'sharp'))

const dir = process.argv[2]
;(async () => {
  for (const name of fs.readdirSync(dir).sort()) {
    const ext = path.extname(name)
    if (ext !== '.tif' && ext !== '.svg') continue
    const out = path.join(dir, name.replace(ext, '.png'))
    const input = fs.readFileSync(path.join(dir, name))
    const image = sharp(input, { density: 72, limitInputPixels: false })
    // Un scan en double page (6000 px de large) se lit mieux ramené à 2400.
    await (ext === '.tif' ? image.resize({ width: 2400 }) : image).png().toFile(out)
    console.log(out)
  }
})().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
