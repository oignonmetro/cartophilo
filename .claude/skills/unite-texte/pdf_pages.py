"""Prépare la lecture d'un PDF sans texte extractible (pdftotext ne rend rien).

Deux cas rencontrés :
  - scan en fax noir et blanc (images CCITT) : chaque page est emballée dans
    un TIFF, que sharp sait décoder ;
  - texte dessiné en tracés vectoriels (aucune image, aucun texte) : chaque
    page est convertie en SVG.

Usage : python pdf_pages.py fichier.pdf DOSSIER_COURT
puis :   node render_pages.cjs DOSSIER_COURT        (depuis la racine du dépôt)

DOSSIER_COURT doit avoir un chemin court (par exemple %TEMP%/pages) : la
bibliothèque d'images échoue au-delà de la limite de longueur de chemin de
Windows.
"""
import os, re, struct, sys
import pypdf

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
reader = pypdf.PdfReader(src)
TOKEN = re.compile(rb'[-+]?\d*\.?\d+|[A-Za-z*]+|\S')


def mul(a, b):
    return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]


def ccitt_tiff(obj):
    params = obj.get('/DecodeParms') or {}
    if isinstance(params, list):
        params = params[0]
    params = params.get_object() if hasattr(params, 'get_object') else params
    k = int(params.get('/K', 0))
    black_is_1 = bool(params.get('/BlackIs1', False))
    width, height, data = int(obj['/Width']), int(obj['/Height']), obj._data
    compression = 4 if k < 0 else 3
    entries = [(256, 4, 1, width), (257, 4, 1, height), (258, 3, 1, 1), (259, 3, 1, compression),
               (262, 3, 1, 1 if black_is_1 else 0), (273, 4, 1, 0), (277, 3, 1, 1), (278, 4, 1, height),
               (279, 4, 1, len(data))]
    if compression == 3:
        entries.append((292, 4, 1, 0 if k == 0 else 1))
    entries.sort()
    offset = 8 + 2 + len(entries) * 12 + 4
    ifd = struct.pack('<H', len(entries))
    for tag, kind, count, value in entries:
        value = offset if tag == 273 else value
        ifd += struct.pack('<HHIHH', tag, kind, count, value, 0) if kind == 3 else struct.pack('<HHII', tag, kind, count, value)
    return b'II*\x00' + struct.pack('<I', 8) + ifd + struct.pack('<I', 0) + data


def vector_svg(page):
    width, height = [float(x) for x in page.mediabox][2:]
    ctm = [1, 0, 0, 1, 0, 0]; stack = []; ops = []; path = []; fill = '#000'; parts = []

    def T(x, y):
        return (x*ctm[0]+y*ctm[2]+ctm[4], x*ctm[1]+y*ctm[3]+ctm[5])

    for token in TOKEN.findall(page.get_contents().get_data()):
        try:
            ops.append(float(token)); continue
        except ValueError:
            pass
        op = token.decode('latin1')
        if op == 'cm': ctm = mul(ops[-6:], ctm)
        elif op == 'q': stack.append(ctm[:])
        elif op == 'Q': ctm = stack.pop() if stack else ctm
        elif op == 'm': x, y = T(*ops[-2:]); path.append(f'M{x:.1f} {height-y:.1f}')
        elif op == 'l': x, y = T(*ops[-2:]); path.append(f'L{x:.1f} {height-y:.1f}')
        elif op == 'c':
            a = ops[-6:]
            path.append('C' + ' '.join(f'{x:.1f} {height-y:.1f}' for x, y in [T(a[0], a[1]), T(a[2], a[3]), T(a[4], a[5])]))
        elif op == 'h': path.append('Z')
        elif op == 're':
            x, y, w, h = ops[-4:]
            path.append('M' + ' L'.join(f'{a:.1f} {height-b:.1f}' for a, b in [T(x, y), T(x+w, y), T(x+w, y+h), T(x, y+h)]) + 'Z')
        elif op == 'rg': fill = '#%02x%02x%02x' % tuple(int(v*255) for v in ops[-3:])
        elif op in ('f', 'F', 'f*'):
            if path:
                rule = 'evenodd' if op == 'f*' else 'nonzero'
                parts.append(f'<path d="{"".join(path)}" fill="{fill}" fill-rule="{rule}"/>')
            path = []
        elif op in ('n', 'S', 's', 'B', 'B*', 'b', 'b*'): path = []
        ops = []
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width*2:.0f}" height="{height*2:.0f}" '
            f'viewBox="0 0 {width} {height}"><rect width="100%" height="100%" fill="#fff"/>{"".join(parts)}</svg>')


for number, page in enumerate(reader.pages, 1):
    resources = page.get('/Resources') or {}
    xobjects = resources.get('/XObject')
    images = []
    if xobjects:
        xobjects = xobjects.get_object()
        images = [xobjects[name].get_object() for name in xobjects]
    ccitt = [img for img in images if img.get('/Filter') == '/CCITTFaxDecode']
    jpeg = [img for img in images if img.get('/Filter') == '/DCTDecode']
    if ccitt:
        open(f'{out}/p{number:02d}.tif', 'wb').write(ccitt_tiff(ccitt[0]))
        print(number, 'scan CCITT -> tif')
    elif jpeg:
        open(f'{out}/p{number:02d}.jpg', 'wb').write(jpeg[0]._data)
        print(number, 'scan JPEG -> jpg (lisible directement)')
    else:
        open(f'{out}/p{number:02d}.svg', 'w', encoding='utf-8').write(vector_svg(page))
        print(number, 'tracés -> svg')
