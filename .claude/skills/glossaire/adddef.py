"""Usage : adddef.py <id> <définition> — insère la définition à sa place alphabétique dans definitions.yaml."""
import sys
uid, text = sys.argv[1], sys.argv[2]
p = 'content/courses/plotin/definitions.yaml'
t = open(p, encoding='utf-8').read()
lines = t.splitlines(True)
assert not any(l.startswith(uid + ':') for l in lines), 'déjà là'
line = f"{uid}: '" + text.replace("'", "''") + "'\n"
i = next((k for k, l in enumerate(lines) if l.startswith('g-') and l.split(':')[0] > uid), len(lines))
lines.insert(i, line)
open(p, 'w', encoding='utf-8', newline='\n').write(''.join(lines))
