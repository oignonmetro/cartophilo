"""Range les lignes des tableaux « | Passage | Ce qu'il établit | » du glossaire dans l'ordre chronologique
des traités (puis des chapitres). La Vie de Plotin, écrite par Porphyre après les traités, va à la fin.
L'en-tête ne change pas : le tableau garde son identifiant, et sa progression."""
import glob, re, sys

HEAD = re.compile(r"^(\s*)\| Passage \| Ce qu'il établit \|\s*$")
ROW = re.compile(r"^\s*\|")


def key(row):
    cell = row.split('|')[1].strip()
    m = re.match(r'traités? (\d+)(?:-\d+)?(?:, chap\. (\d+))?', cell)
    if m:
        return (int(m.group(1)), int(m.group(2) or 0))
    m = re.search(r'Vie de Plotin\*?, (\d+)', cell)
    if m:
        return (1000, int(m.group(1)))
    return (2000, 0)


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
