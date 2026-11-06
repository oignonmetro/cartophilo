"""Range les lignes des tableaux « | Passage | Ce qu'il établit | » du glossaire de Marx dans l'ordre
chronologique des œuvres, d'après leur titre en tête de case (les lignes d'une même œuvre gardent leur ordre).
L'en-tête ne change pas : le tableau garde son identifiant, et sa progression. Une œuvre inconnue va à la fin,
et le programme la signale : l'ajouter à ŒUVRES."""
import glob, re, sys, unicodedata

ŒUVRES = [
    ('differences', 1841),  # Différence de la philosophie de la nature…
    ('vol de bois', 1842),
    ('critique du droit politique', 1843),
    ('philosophie du droit de hegel', 1843),
    ('question juive', 1844),
    ('manuscrits', 1844),
    ('james mill', 1844),
    ('notes de lecture', 1844),
    ('sainte famille', 1845),
    ('theses sur feuerbach', 1845),
    ('ideologie allemande', 1846),
    ('misere de la philosophie', 1847),
    ('travail salarie et capital', 1849),
    ('manifeste', 1848),
    ('luttes de classes', 1850),
    ('18 brumaire', 1852),
    ('grundrisse', 1857),
    ('contribution', 1859),
    ('salaire, prix et profit', 1865),
    ('capital', 1867),
    ('guerre civile', 1871),
    ('programme de gotha', 1875),
]


def plat(s):
    s = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in s if not unicodedata.combining(c)).lower().replace('*', '')


inconnues = set()


def key(row):
    cell = plat(row.split('|')[1])
    for titre, annee in ŒUVRES:
        if titre in cell:
            return annee
    inconnues.add(row.split('|')[1].strip())
    return 9999


HEAD = re.compile(r"^(\s*)\| Passage \| Ce qu'il établit \|\s*$")
ROW = re.compile(r"^\s*\|")
changed = []
for p in sorted(glob.glob(sys.argv[1])):
    lines = open(p, encoding='utf-8').read().split('\n')
    out, i, touched = [], 0, False
    while i < len(lines):
        out.append(lines[i])
        if HEAD.match(lines[i]):
            j = i + 1
            rows = []
            while j < len(lines) and ROW.match(lines[j]):
                rows.append(lines[j]); j += 1
            ordered = sorted(rows, key=key)
            touched |= ordered != rows
            out.extend(ordered)
            i = j
            continue
        i += 1
    if touched:
        open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
        changed.append(p)
print(len(changed), 'fichier(s) :', ', '.join(c.split('/')[-1].split('\\')[-1] for c in changed))
for c in sorted(inconnues):
    print('œuvre inconnue, à ajouter à ŒUVRES :', c)
