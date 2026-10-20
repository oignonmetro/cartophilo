"""Vérifier une citation, un repère ou une attribution sur la traduction GF.

Les volumes PDF sont dans C:\\Users\\Arthur\\Traités Plotin ; leur texte est
extrait une fois (pdftotext) dans un cache du dossier temporaire.

  python -I .claude/skills/cours-traite/gf.py cherche "fantôme sur" ["autre phrase" ...]
  python -I .claude/skills/cours-traite/gf.py chapitre 30 8        (traité 30, chap. 8)
  python -I .claude/skills/cours-traite/gf.py plan 6               (plan détaillé du traité 6)
  python -I .claude/skills/cours-traite/gf.py verifie <fichier.yaml> [id-de-leçon]
      (chaque citation « » du fichier, à partir de cette leçon, se retrouve-t-elle dans la GF ?)
  python -I .claude/skills/cours-traite/gf.py reprises <fichier.yaml> [id-de-leçon]
      (passages repris de la GF sans guillemets, à citer ou reformuler)

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


def _flat(s):
    s = s.replace("’", "'").replace(" ", " ")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"\d+", " ", s)
    s = re.sub(r"[^a-z' ]+", " ", s)
    s = s.replace("eux memes", "euxmemes").replace("ici bas", "icibas")
    return re.sub(r"\s+", " ", s).strip()


def _corpus():
    return " ".join(_flat(open(txt, encoding="utf-8").read()) for _, _, txt in volumes())


def _source(path, depuis):
    L = open(path, encoding="utf-8").read().split(chr(10))
    if depuis:
        L = L[L.index("- id: " + depuis):]
    s = chr(10).join(L)
    s = re.sub(r"\{/?[a-z]+\}", "", s).replace("___", "[T]").replace("**", "").replace("__", "")
    return s.replace('\\"', '"')


def verifie(path, depuis=None):
    """Chaque citation entre « » doit se retrouver dans la GF."""
    T = _corpus(); n = 0
    for q in re.findall(r"«([^«»]+)»", _source(path, depuis)):
        for frag in re.split(r"\[[^\]]*\]|\.\.\.|\"", q):
            f = _flat(frag)
            if len(f) >= 18 and f not in T:
                n += 1; print("INTROUVABLE :", frag.strip()[:140])
    print(n, "fragment(s) introuvable(s)")


def reprises(path, depuis=None, mots=8):
    """Suites de mots reprises de la GF hors guillemets (paraphrase à citer)."""
    T = _corpus(); vus = set()
    s = re.sub(r"«[^«»]*»", " | ", _source(path, depuis))
    for ligne in s.split(chr(10)):
        if re.match(r"\s*answer:", ligne):
            continue
        for seg in ligne.split("|"):
            w = _flat(seg).split(); i = 0
            while i <= len(w) - mots:
                if " ".join(w[i:i + mots]) in T:
                    j = i + mots
                    while j < len(w) and " ".join(w[i:j + 1]) in T:
                        j += 1
                    g = " ".join(w[i:j])
                    if g not in vus:
                        vus.add(g); print("SANS GUILLEMETS :", g)
                    i = j
                else:
                    i += 1


if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["aide"]
    if cmd == "cherche":
        cherche(args)
    elif cmd == "chapitre":
        chapitre(int(args[0]), int(args[1]))
    elif cmd == "plan":
        plan(int(args[0]))
    elif cmd == "verifie":
        verifie(args[0], args[1] if len(args) > 1 else None)
    elif cmd == "reprises":
        reprises(args[0], args[1] if len(args) > 1 else None)
    else:
        print(__doc__)
