"""Vérifier une citation, un repère ou une attribution sur la traduction GF.

Les volumes PDF sont dans C:\\Users\\Arthur\\Traités Plotin ; leur texte est
extrait une fois (pdftotext) dans un cache du dossier temporaire.

  python -I .claude/skills/cours-traite/gf.py cherche "fantôme sur" ["autre phrase" ...]
  python -I .claude/skills/cours-traite/gf.py chapitre 30 8        (traité 30, chap. 8)
  python -I .claude/skills/cours-traite/gf.py plan 6               (plan détaillé du traité 6)

La recherche ignore accents, casse et forme des apostrophes. Les lignes de
la traduction ne sont marquées que toutes les cinq ([5], [10]...) : un repère
ne se donne que s'il est encadré par ces marques sans ambiguïté.
"""
import glob
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")
PDF_DIR = r"C:\Users\Arthur\Traités Plotin"
CACHE = os.path.join(tempfile.gettempdir(), "gf-plotin")


def volumes():
    os.makedirs(CACHE, exist_ok=True)
    out = []
    for pdf in sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf"))):
        m = re.search(r"Traités (\d+)-(\d+)", os.path.basename(pdf))
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2))
        txt = os.path.join(CACHE, f"t{a}-{b}.txt")
        if not os.path.exists(txt):
            subprocess.run(["pdftotext", "-enc", "UTF-8", pdf, txt], check=True)
        out.append((a, b, txt))
    return out


def norm(s):
    s = s.replace("\u2019", "'").replace("\u2018", "'").replace("\u00a0", " ")
    s = unicodedata.normalize("NFC", s)
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").lower()


def lines_of(t):
    for a, b, txt in volumes():
        if a <= t <= b:
            return open(txt, encoding="utf-8").read().split("\n")
    sys.exit(f"pas de volume pour le traité {t}")


def cherche(phrases, width=350, maxi=4):
    for p in phrases:
        print("=====", p)
        n = 0
        for a, b, txt in volumes():
            t = unicodedata.normalize("NFC", open(txt, encoding="utf-8").read())
            nt = norm(t)
            for m in re.finditer(re.escape(norm(p)), nt):
                n += 1
                if n > maxi:
                    break
                print(f"-- traités {a}-{b}")
                print(t[max(0, m.start() - width):m.end() + width].replace("\n", " / "))
        if n == 0:
            print("(introuvable : citation à corriger ou à retirer)")


def chapitre(t, c):
    L = lines_of(t)
    end = [i for i, l in enumerate(L) if re.match(r"NOTES DU TRAIT. %d\b" % t, l.strip())]
    if not end:
        sys.exit("marque « NOTES DU TRAITÉ » introuvable")
    e = end[0]
    start = next((i for i in range(e - 1, max(0, e - 4000), -1)
                  if re.match(r"%d\. " % c, L[i])), None)
    if start is None:
        sys.exit(f"chapitre {c} introuvable")
    out = [L[start]]
    for l in L[start + 1:e]:
        if re.match(r"%d\. " % (c + 1), l):
            break
        out.append(l)
    print(" ".join(x.strip() for x in out if x.strip()))


def plan(t):
    for a, b, txt in volumes():
        if a <= t <= b:
            L = open(txt, encoding="utf-8").read().split("\n")
            idx = [i for i, l in enumerate(L) if l.strip().startswith("PLAN DÉTAILLÉ DU TRAIT")]
            k = t - a
            if k >= len(idx):
                sys.exit("plan introuvable")
            i = idx[k] + 1
            while i < len(L) and not re.match(r"\s*(1|I)\. ", L[i]) and not L[i].startswith("Sur ") or i == idx[k] + 1:
                if L[i].strip():
                    print(L[i])
                i += 1
                if i - idx[k] > 80:
                    break
            return


if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["aide"]
    if cmd == "cherche":
        cherche(args)
    elif cmd == "chapitre":
        chapitre(int(args[0]), int(args[1]))
    elif cmd == "plan":
        plan(int(args[0]))
    else:
        print(__doc__)
