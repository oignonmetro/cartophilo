"""Vérifier les citations de Marx sur les éditions dont on a le PDF, Éditions sociales d'abord.

Sur le modèle de gf.py (Plotin). Les PDF sont dans C:\\Users\\Arthur\\Œuvres ; leur texte est
extrait une fois (pdftotext) dans un cache du dossier temporaire. Seuls servent les fichiers
reconnus par EDITIONS (motif du nom de fichier, sigle, rang de préférence) : en ajouter une
ligne quand l'utilisateur ajoute un volume, les Éditions sociales au rang 0.

  python -I .claude/skills/glossaire-marx/textes.py editions
  python -I .claude/skills/glossaire-marx/textes.py cherche "met sa vie dans l'objet" ["autre phrase" ...]
  python -I .claude/skills/glossaire-marx/textes.py verifie <fichier.yaml>
      (chaque citation « » du rappel et des cartes : dans quelle édition se trouve-t-elle ?
       Une citation absente des PDF n'est pas fausse pour autant (NotebookLM a pu suivre une
       autre traduction, ou un texte dont on n'a pas le PDF) : si elle est utile, elle reste.
       Quand une édition des Éditions sociales donne le passage dans d'autres mots, la
       préférer, et reprendre la citation sur elle : `cherche` montre le texte autour.)

La recherche ignore accents, casse, forme des apostrophes et des espaces, et les coupures
de mots en fin de ligne. Une citation coupée par [...] se cherche segment par segment.
"""
import glob
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")
PDF_DIR = r"C:\Users\Arthur\Œuvres"
CACHE = os.path.join(tempfile.gettempdir(), "textes-marx")

# (motif du nom de fichier, sigle affiché, rang : 0 = Éditions sociales, préférée ; au 2026-11-06,
# l'utilisateur a mis dans Œuvres les Éditions sociales de toutes les œuvres de Marx utiles, hors Pléiade)
EDITIONS = [
    (r"^Manuscrits 1844", "ES, Manuscrits de 1844 (Bottigelli)", 0),
    (r"^L.?id[ée]ologie allemande", "ES, L'Idéologie allemande", 0),
    (r"^Le Capital \(Livre 1\)", "ES, Le Capital, livre I", 0),
    (r"^Manuscrits de 1857", "ES, Grundrisse", 0),
    (r"^Contribution", "ES, Contribution à la critique de l'économie politique", 0),
    (r"^Critique Du Programme De Gotha", "ES, Critique du programme de Gotha", 0),
    (r"^Manifeste du Parti communiste", "ES, Manifeste du Parti communiste", 0),
    (r"^Écrits philosophiques", "ES, Écrits philosophiques (Sève)", 0),
    (r"^Œuvres I\. Économie", "Pléiade, Œuvres I (Rubel)", 1),
    (r"^Œuvres III\. Philosophie", "Pléiade, Œuvres III (Rubel)", 1),
]


def norm(s):
    s = s.replace("\u2019", "'").replace("\u2018", "'").replace("\u00a0", " ").replace("\u202f", " ")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", s)
    s = re.sub(r"[«»\"“”–—\-–—]", " ", s)
    s = re.sub(r"\s+([,;:.!?)])", r"", s)
    return re.sub(r"\s+", " ", s).strip()


def corpus():
    os.makedirs(CACHE, exist_ok=True)
    out = []
    for pdf in sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf"))):
        nom = os.path.basename(pdf)
        for motif, sigle, rang in EDITIONS:
            if re.search(motif, nom):
                txt = os.path.join(CACHE, re.sub(r"\W+", "_", sigle) + ".txt")
                if not os.path.exists(txt):
                    subprocess.run(["pdftotext", "-enc", "UTF-8", pdf, txt], check=True)
                brut = open(txt, encoding="utf-8").read()
                out.append((rang, sigle, brut, norm(brut), lettres(brut)))
    return sorted(out, key=lambda x: x[0])


def lettres(s):
    # sans les appels de note du PDF ([116], [xxiv])
    s = re.sub(r"\[(?:\d+|[ivxlc]+)\]", "", norm(s))
    return re.sub(r"[^a-z0-9]", "", s)


def segments(citation):
    parts = re.split(r"\[\s*(?:\.\.\.|…)\s*\]|\[[^\]]*\]", citation)
    return [lettres(p) for p in parts if len(lettres(p)) >= 10]


def ou(citation, cps):
    segs = segments(citation)
    if not segs:
        return None
    return [sigle for _, sigle, _, _, l in cps if all(s in l for s in segs)]


def proche(citation, cps, mots=5):
    """La meilleure édition et le texte autour, quand la citation n'est pas trouvée telle quelle."""
    w = norm(citation).split()
    best = None
    for rang, sigle, brut, n, _ in cps:
        for k in range(0, max(1, len(w) - mots + 1), 2):
            frag = " ".join(w[k:k + mots])
            i = n.find(frag)
            if i >= 0:
                score = sum(1 for x in w if x in n[max(0, i - 400):i + 400])
                if best is None or (rang, -score) < (best[0], -best[1]):
                    best = (rang, score, sigle, n[max(0, i - 150):i + 350])
                break
    return best


def citations(path):
    t = open(path, encoding="utf-8").read().replace("\u00a0", " ")
    t = t.replace("___", " [...] ")
    t = t.replace('\\"', '"')
    t = re.sub(r"\{/?[a-z]+\}|\*\*|__|\[\[[^|\]]*\||\]\]", "", t)
    out = []
    for m in re.finditer(r"«\s*(.+?)\s*»", t, re.S):
        c = re.sub(r"\s+", " ", m.group(1))
        if len(c) < 20:
            continue
        if c not in out:
            out.append(c)
    return out


def verifie(path):
    cps = corpus()
    n_es = n_autre = n_abs = 0
    for c in citations(path):
        ed = ou(c, cps)
        if ed is None:
            continue
        if ed:
            tag = ed[0]
            n_es += tag.startswith("ES")
            n_autre += not tag.startswith("ES")
            print(f"✓ [{tag}] « {c[:90]}{'…' if len(c) > 90 else ''} »")
        else:
            n_abs += 1
            p = proche(c, cps)
            print(f"✗ « {c[:110]}{'…' if len(c) > 110 else ''} »")
            if p:
                print(f"    proche dans {p[2]} : …{p[3]}…")
    print(f"\n{n_es} citation(s) dans les Éditions sociales, {n_autre} dans une autre édition, {n_abs} absente(s) des PDF.")


def cherche(phrases):
    cps = corpus()
    for ph in phrases:
        f = norm(ph)
        trouve = False
        for _, sigle, _, n, _ in cps:
            for m in list(re.finditer(re.escape(f), n))[:3]:
                trouve = True
                print(f"[{sigle}] …{n[max(0, m.start() - 200):m.end() + 300]}…\n")
        if not trouve:
            print(f"introuvable : {ph}")


def editions():
    for rang, sigle, brut, _, _ in corpus():
        print(f"{rang}  {sigle}  ({len(brut)} caractères)")


if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["aide"]
    if cmd == "verifie":
        verifie(args[0])
    elif cmd == "cherche":
        cherche(args)
    elif cmd == "editions":
        editions()
    else:
        print(__doc__)
