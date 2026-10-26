"""Vérifier une citation ou un passage sur l'édition de référence d'une œuvre.

Le pendant de cours-traite/gf.py pour n'importe quelle œuvre : la source est
un PDF à texte sélectionnable (extrait une fois par pdftotext dans un cache du
dossier temporaire) ou un fichier texte déjà extrait (d'un scan, par exemple).

  python -I .claude/skills/cours-oeuvre/texte.py cherche <source> "phrase" ["autre phrase" ...]
  python -I .claude/skills/cours-oeuvre/texte.py passage <source> "début du passage" [nb de caractères]
  python -I .claude/skills/cours-oeuvre/texte.py verifie <source> <fichier.yaml> [id-de-leçon]
      (chaque citation « » du fichier, à partir de cette leçon, se retrouve-t-elle dans la source ?)
  python -I .claude/skills/cours-oeuvre/texte.py reprises <source> <fichier.yaml> [id-de-leçon]
      (passages repris de la source sans guillemets, à citer ou reformuler)

<source> peut être répété en séparant les chemins par « ; » (traduction et
notes dans deux fichiers). La recherche ignore accents, casse, forme des
apostrophes et coupures de mots en fin de ligne.
"""
import hashlib
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")
CACHE = os.path.join(tempfile.gettempdir(), "texte-oeuvres")


def textes(source):
    os.makedirs(CACHE, exist_ok=True)
    out = []
    for path in [p.strip() for p in source.split(";") if p.strip()]:
        if not os.path.exists(path):
            sys.exit(f"source introuvable : {path}")
        if path.lower().endswith(".pdf"):
            key = hashlib.sha1(os.path.abspath(path).encode("utf-8")).hexdigest()[:12]
            txt = os.path.join(CACHE, key + ".txt")
            if not os.path.exists(txt) or os.path.getmtime(txt) < os.path.getmtime(path):
                subprocess.run(["pdftotext", "-enc", "UTF-8", path, txt], check=True)
            path = txt
        out.append(unicodedata.normalize("NFC", open(path, encoding="utf-8").read()))
    return out


def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace(" ", " ").replace(" ", " ")
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()


def _flat(s):
    s = norm(s)
    # mots coupés en fin de ligne (« organi-\nsation ») : recollés ; les traits
    # d'union retirés partout, pour que « lui-même » coupé en fin de ligne se retrouve
    s = re.sub(r"-\s*\n\s*", "", s).replace("-", "")
    s = re.sub(r"\d+", " ", s)
    s = re.sub(r"[^a-z' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def cherche(source, phrases, width=350, maxi=4):
    corps = textes(source)
    for p in phrases:
        print("=====", p)
        n = 0
        # les mots de la phrase, séparés dans le texte par n'importe quoi d'autre
        # qu'une lettre (ponctuation, appels de note, repères de ligne, sauts de ligne)
        mots = re.findall(r"[a-z']+", re.sub(r"\d+", " ", norm(p)))
        motif = re.compile(r"[^a-z']+".join(map(re.escape, mots)))
        for t in corps:
            nt = norm(t)  # même longueur que t : les positions se correspondent
            for m in motif.finditer(nt):
                n += 1
                if n > maxi:
                    break
                print(t[max(0, m.start() - width):m.end() + width].replace("\n", " / "))
                print("--")
        if n == 0:
            print("(introuvable : citation à corriger ou à retirer)")


def passage(source, debut, longueur=3000):
    cible = norm(debut)
    for t in textes(source):
        i = norm(t).find(cible)
        if i >= 0:
            print(t[i:i + longueur])
            return
    sys.exit("début de passage introuvable")


def _source_yaml(path, depuis):
    L = open(path, encoding="utf-8").read().split("\n")
    if depuis:
        L = L[L.index("- id: " + depuis):]
    s = "\n".join(L)
    s = re.sub(r"\{/?[a-z]+\}", "", s).replace("___", "[T]").replace("**", "").replace("__", "").replace("*", "")
    return s.replace('\\"', '"')


def verifie(source, path, depuis=None):
    T = " ".join(_flat(t) for t in textes(source))
    n = 0
    for q in re.findall(r"«([^«»]+)»", _source_yaml(path, depuis)):
        for frag in re.split(r"\[[^\]]*\]|\.\.\.|…|\"", q):
            f = _flat(frag)
            if len(f) >= 18 and f not in T:
                n += 1
                print("INTROUVABLE :", frag.strip()[:140])
    print(n, "fragment(s) introuvable(s)")


def reprises(source, path, depuis=None, mots=8):
    T = " ".join(_flat(t) for t in textes(source))
    vus = set()
    s = re.sub(r"«[^«»]*»", " | ", _source_yaml(path, depuis))
    for ligne in s.split("\n"):
        if re.match(r"\s*answer:", ligne):
            continue
        for seg in ligne.split("|"):
            w = _flat(seg).split()
            i = 0
            while i <= len(w) - mots:
                if " ".join(w[i:i + mots]) in T:
                    j = i + mots
                    while j < len(w) and " ".join(w[i:j + 1]) in T:
                        j += 1
                    g = " ".join(w[i:j])
                    if g not in vus:
                        vus.add(g)
                        print("SANS GUILLEMETS :", g)
                    i = j
                else:
                    i += 1


if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["aide"]
    if cmd == "cherche" and len(args) >= 2:
        cherche(args[0], args[1:])
    elif cmd == "passage" and len(args) >= 2:
        passage(args[0], args[1], int(args[2]) if len(args) > 2 else 3000)
    elif cmd == "verifie" and len(args) >= 2:
        verifie(args[0], args[1], args[2] if len(args) > 2 else None)
    elif cmd == "reprises" and len(args) >= 2:
        reprises(args[0], args[1], args[2] if len(args) > 2 else None)
    else:
        print(__doc__)
