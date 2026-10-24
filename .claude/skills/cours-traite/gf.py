"""Vérifier une citation, un repère ou une attribution sur la traduction GF.

Les volumes PDF sont dans C:\\Users\\Arthur\\Traités Plotin ; leur texte est
extrait une fois (pdftotext) dans un cache du dossier temporaire.

  python -I .claude/skills/cours-traite/gf.py cherche "fantôme sur" ["autre phrase" ...]
  python -I .claude/skills/cours-traite/gf.py chapitre 30 8        (traité 30, chap. 8)
  python -I .claude/skills/cours-traite/gf.py plan 6               (plan détaillé du traité 6)
  python -I .claude/skills/cours-traite/gf.py verifie <fichier.yaml> [id-de-leçon]
      (chaque citation « » du fichier, à partir de cette leçon, se retrouve-t-elle dans la GF ?)
  python -I .claude/skills/cours-traite/gf.py chapitres <fichier.yaml> [id-de-leçon]
      (chaque citation suivie d'un repère « traité N, chap. M » est-elle bien dans ce chapitre ?)
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


def _bornes(t):
    """Lignes du volume et bornes (début, fin) du texte du traité t, notes exclues ;
    t = 0 désigne la Vie de Plotin de Porphyre (volume 51-54)."""
    L = lines_of(54 if t == 0 else t)
    fin = [i for i, l in enumerate(L) if re.match(r"NOTES DU TRAIT. %d\b" % t, l.strip())]
    if fin:
        # le texte du traité commence après les notes du traité précédent du volume
        avant = [i for i, l in enumerate(L[:fin[0]]) if re.match(r"NOTES DE?S? TRAIT", l.strip())]
        return L, (avant[-1] if avant else 0), fin[0]
    commune = [i for i, l in enumerate(L) if re.match(r"NOTES DES TRAIT.S (\d+)-(\d+)", l.strip())]
    for i in commune:
        a, b = map(int, re.match(r"NOTES DES TRAIT.S (\d+)-(\d+)", L[i].strip()).groups())
        if a <= t <= b:
            # le texte de b commence au dernier « 1. » avant la marque, celui de a au précédent
            uns = [k for k in range(i) if re.match(r"1\. ", L[k])]
            return (L, uns[-2], uns[-1]) if t == a else (L, uns[-1], i)
    simples = [i for i, l in enumerate(L) if l.strip() == "NOTES"]
    if len(simples) == 5:  # volume 51-54 : 51, 52, 53, 54, puis la Vie de Plotin
        k = 4 if t == 0 else t - 51
        return L, (simples[k - 1] if k else 0), simples[k]
    return L, None, None


def chapitre_texte(t, c):
    """Texte du chapitre c du traité t, ou None si on ne le trouve pas.

    Un appel de note (« l'empreinte 2. Si ») ressemble à un début de chapitre ; on les
    distingue par les repères de ligne, qui repartent de [5] à chaque chapitre : un vrai
    début de chapitre est suivi d'un [5] avant tout autre repère, et le chapitre suivant ne
    commence qu'après le [5] du chapitre en cours. Un chapitre trop court pour avoir un [5]
    se cherche, à défaut, en début de ligne."""
    L, debut, fin = _bornes(t)
    if fin is None:
        return None
    R = " ".join(x.strip() for x in L[debut:fin] if x.strip())
    reperes = [(m.start(), int(m.group(1))) for m in re.finditer(r"\[(\d+)\]", R)]

    def suivant(pos):
        return next((v for p, v in reperes if p > pos), None)

    def a_un_5(a, b):
        return any(v == 5 and a < p < b for p, v in reperes)

    tete = r"(?<![\d\[])%d\. (?=[A-ZÀ-ÖØ-Þ«–])"
    debuts = [m.start() for m in re.finditer(tete % c, R) if suivant(m.start()) == 5]
    suites = [m.start() for m in re.finditer(tete % (c + 1), R) if suivant(m.start()) == 5]
    for s in reversed(debuts):
        fins = [x for x in suites if x > s and a_un_5(s, x)]
        seg = R[s:(fins[0] if fins else len(R))]
        if a_un_5(s, s + len(seg)):
            return seg
    # chapitre bref, sans repère : en début de ligne, jusqu'au chapitre suivant
    start = next((i for i in range(fin - 1, max(debut, fin - 4000) - 1, -1)
                  if re.match(r"%d\. " % c, L[i])), None)
    if start is None:
        return None
    out = [L[start]]
    for l in L[start + 1:fin]:
        if re.match(r"%d\. " % (c + 1), l):
            break
        out.append(l)
    return " ".join(x.strip() for x in out if x.strip())


def chapitre(t, c):
    texte = chapitre_texte(t, c)
    if texte is None:
        sys.exit(f"chapitre {c} du traité {t} introuvable")
    print(texte)


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
    s = s.replace("ici bas", "icibas")
    # La GF extraite colle les mots coupés en fin de ligne (« luimême ») : on colle partout.
    s = re.sub(r"\b(lui|elle|soi|toi|moi|eux|elles|nous|vous) (meme|memes)\b", r"\1\2", s)
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


REF = re.compile(
    r"\((?:\[\[traite(\d+)\|[^\]]*\]\]|traité (\d+))(?: \([^)]*\))?, chap\. ([\d-]+)"
    r"|\(chap\. ([\d-]+)"
    r"|\(même chapitre"
    r"|\(Porphyre, \*?Vie de Plotin\*?, (\d+)"
)
TRAITE = re.compile(r"\[\[traite(\d+)\||traité (\d+)")


def _chapitres_de(spec):
    a, _, b = spec.partition("-")
    return list(range(int(a), int(b or a) + 1))


def chapitres(path, depuis=None):
    """Chaque citation suivie d'un repère (traité N, chap. M) se trouve-t-elle dans CE chapitre ?
    Le repère qui suit une citation, dans le même paragraphe, est le sien ; « (chap. M) » seul
    vaut pour le dernier traité nommé avant lui."""
    s = _source(path, depuis)
    cache, n, nv, na = {}, 0, 0, 0
    for para in s.split(chr(10)):
        traite, chap, precedent = None, None, None
        pos = 0
        en_attente = []
        jetons = sorted([(m.start(), "q", m) for m in re.finditer(r"«([^«»]+)»", para)]
                        + [(m.start(), "r", m) for m in REF.finditer(para)]
                        + [(m.start(), "t", m) for m in TRAITE.finditer(para)])
        for _, genre, m in jetons:
            if genre == "t":
                traite = int(m.group(1) or m.group(2))
            elif genre == "q":
                en_attente.append(m.group(1))
            else:
                if m.group(5):
                    t_, cs = 0, [int(m.group(5))]
                elif m.group(3):
                    t_, cs = int(m.group(1) or m.group(2)), _chapitres_de(m.group(3))
                elif m.group(4):
                    t_, cs = traite, _chapitres_de(m.group(4))
                else:
                    t_, cs = traite, chap
                if t_ is None or not cs:
                    en_attente = []
                    continue
                if t_:
                    traite = t_
                chap = cs
                textes = []
                for c in cs:
                    if (t_, c) not in cache:
                        cache[(t_, c)] = chapitre_texte(t_, c)
                    textes.append(cache[(t_, c)])
                if any(x is None for x in textes):
                    nv += 1
                    print(f"NON VÉRIFIABLE : traité {t_ or 'Vie de Plotin'}, chap. {cs} (découpage introuvable)")
                    en_attente = []
                    continue
                corps = _flat(" ".join(textes))
                for q in en_attente:
                    for frag in re.split(r"\[[^\]]*\]|\.\.\.|\"", q):
                        f = _flat(frag)
                        if len(f) < 18 or f in corps:
                            continue
                        if precedent and f in precedent[1]:
                            na += 1
                            print(f"REPÈRE AVANT : « {frag.strip()[:70]} » est dans {precedent[0]}, "
                                  f"repère placé avant la citation au lieu d'après")
                            continue
                        n += 1
                        print(f"AILLEURS : « {frag.strip()[:90]} » n'est pas dans traité {t_ or 'Vie de Plotin'}, chap. {cs}")
                precedent = (f"traité {t_ or 'Vie de Plotin'}, chap. {cs}", corps)
                en_attente = []
    print(n, "citation(s) hors du chapitre annoncé ;", na, "repère(s) placé(s) avant ;", nv, "non vérifiable(s)")


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
    elif cmd == "chapitres":
        chapitres(args[0], args[1] if len(args) > 1 else None)
    elif cmd == "reprises":
        reprises(args[0], args[1] if len(args) > 1 else None)
    else:
        print(__doc__)
