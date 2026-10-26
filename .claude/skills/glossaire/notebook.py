"""Procédure NotebookLM d'une entrée du glossaire : questions, journal, contrôle.

Le programme ne parle pas à NotebookLM : il dit quelle question poser, garde
les réponses, et refuse la publication tant que la procédure n'est pas faite.
Journaux : .claude/skills/glossaire/journaux/<entrée>/ (hors dépôt).
Relectures de l'utilisateur : .claude/skills/glossaire/relectures.json (versionné).

Usage : voir SKILL.md, § 2.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
JOURNAUX = os.path.join(ICI, "journaux")
RELECTURES = os.path.join(ICI, "relectures.json")
MIN_REPONSE = 300  # caractères : en dessous, ce ne sont plus des notes utilisables
# Réponses courtes et sans redite (choix de l'utilisateur, 2026-10-26) : NotebookLM recitait
# à chaque réponse les mêmes passages, et chaque réponse se lisait puis se recopiait en entier.
BREF = "Réponds en 250 mots au plus, sans introduction ni récapitulatif."
DEJA = "Ne reprends pas les passages déjà donnés ({passages}) : apporte du neuf, ou dis qu'il n'y en a pas."

# Les questions élémentaires vont par deux groupes, réponse en tableau court (même choix) ;
# les difficultés, les thèses et les relances restent une par message.
ELEMENTAIRES = [
    ("B-statut", "Sur {notion}, réponds en un tableau court à trois lignes. Nature : qu'est-ce, ontologiquement (une réalité à part, une puissance, une partie, un état, une activité, une relation), et à quoi le voit-on dans le texte ? Rang : à quel niveau de la réalité (l'Un, l'Intellect, l'Âme, les corps), et pourquoi celui-là ? Origine : de quoi cela procède-t-il, et en quel sens précis en vient-il (don, trace, image, illumination, partie détachée ou non) ? Pour chaque ligne, la raison de Plotin et un passage (traité, chapitre)."),
    ("B-portee", "Sur {notion}, réponds en un tableau court à quatre lignes. Démarcation : en quoi se distingue-t-elle de {voisines}, et pourquoi Plotin ne les confond-il pas ? Extension : quels êtres l'ont, lesquels ne l'ont pas, et pourquoi ? Fonction : qu'est-ce qui ne tiendrait plus sans elle dans la pensée de Plotin ? Mécanisme : comment produit-elle {effets}, étape par étape ? Pour chaque ligne, la raison de Plotin et un passage (traité, chapitre).{deja_entrees}"),
]
DIFFICULTES = [
    ("C-paradoxes", "Dans ce que Plotin dit à propos de {notion}, quelles thèses paraissent contre-intuitives ou paradoxales à un lecteur d'aujourd'hui ? Pour chacune, la raison exacte qu'en donne Plotin, avec passages et citations."),
    ("C-systeme", "Quels points de ce que Plotin dit à propos de {notion} ne se comprennent que si l'on connaît d'autres thèses de Plotin (par exemple la procession, l'incorporéité de l'âme, la contemplation, la présence de l'âme au corps) ? Pour chacun : la thèse présupposée, et en quoi elle éclaire le point."),
    ("C-objections", "Quelles objections ou difficultés Plotin soulève-t-il lui-même à propos de {notion}, et comment y répond-il ? Pour chacune, l'objection, la réponse pas à pas, passages et citations."),
    ("C-contresens", "Quels contresens commet-on à propos de {notion} (sens courant du mot, sens chez Platon, Aristote ou les stoïciens) ? Pour chacun, ce que Plotin dit à la place, avec passages."),
]
THESE = "Comment Plotin établit-il que {these} ? Donne l'argument prémisse par prémisse, le passage (traité, chapitre) et la citation où chaque prémisse est posée, et ce qu'il faut savoir du reste de sa pensée pour suivre l'argument."
IMAGE = "Pourquoi Plotin dit-il, à propos de {notion} : « {image} » ? Que dit littéralement cette image ou cette épithète, terme à terme (qu'est-ce qui correspond à quoi), et qu'est-ce qu'elle fait comprendre que la formule abstraite ne dirait pas ? Passage et citation."
RELANCE = "Je ne comprends pas pourquoi {point}. Explique pas à pas le raisonnement de Plotin, sans sauter d'étape, en disant d'où vient chaque prémisse (passage, citation)."
MANQUE = "Une entrée à propos de {notion} chez Plotin couvre déjà ceci. Étapes : {etapes}. Passages : {passages}. Quels passages, arguments, distinctions ou difficultés importants manquent, et pourquoi chacun importe-t-il ?"


def norm(s):
    s = unicodedata.normalize("NFKD", s.replace(" ", " "))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"\{/?[a-z]+\}|\*|_|`|\[\[[^|\]]*\||\]\]", "", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def chemin(entree, *p):
    return os.path.join(JOURNAUX, entree, *p)


def charge(entree):
    f = chemin(entree, "journal.json")
    if not os.path.exists(f):
        sys.exit(f"Pas de journal pour {entree} : commencer par `debut`.")
    return json.load(open(f, encoding="utf-8"))


def garde(entree, j):
    os.makedirs(chemin(entree), exist_ok=True)
    json.dump(j, open(chemin(entree, "journal.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def ajoute(j, qid, phase, texte, **extra):
    if any(q["id"] == qid for q in j["questions"]):
        return
    j["questions"].append(dict(id=qid, phase=phase, texte=texte, reponse=None, verdict=None, **extra))


def phase_finie(j, lettre):
    return all(q["reponse"] for q in j["questions"] if q["phase"] == lettre)


def a_juger(q):
    return q["phase"] in ("D", "E")


def suivante(j):
    for q in j["questions"]:
        if not q["reponse"]:
            return q, None
        if a_juger(q) and not q["verdict"]:
            return q, "juger"
    return None, None


def cmd_debut(entree, notion, grec=None, voisines=None, effets=None, couvert=None):
    if not voisines or not effets:
        sys.exit("--voisines et --effets sont obligatoires : les notions dont il faut la distinguer, ce qu'elle produit ou fait.")
    if os.path.exists(chemin(entree, "journal.json")):
        sys.exit(f"Un journal existe déjà pour {entree} (`etat` pour le voir).")
    nom = f"la notion de « {notion} »" + (f" ({grec})" if grec else "")
    deja_entrees = f" Ne développe pas ce que traitent déjà d'autres entrées : {couvert}." if couvert else ""
    j = dict(entree=entree, notion=nom, voisines=voisines, effets=effets, plan=[], questions=[])
    ajoute(j, "A-lieux", "A", f"Où Plotin établit-il ou définit-il {nom} ? Donne les deux à quatre passages décisifs (traité, chapitre), une citation de chacun, et ce que chacun établit.")
    ajoute(j, "A-emplois", "A", f"Quels sens ou emplois distincts {nom} a-t-elle chez Plotin, et quelles distinctions commande-t-elle ? Pour chacun, un passage (traité, chapitre) et une citation.")
    for qid, t in ELEMENTAIRES:
        ajoute(j, qid, "B", t.format(notion=nom, voisines=voisines, effets=effets, deja_entrees=deja_entrees))
    for qid, t in DIFFICULTES:
        ajoute(j, qid, "C", t.format(notion=nom))
    garde(entree, j)
    print(f"Journal ouvert : {len(j['questions'])} questions. Effacer l'historique du notebook, puis `question`.")


def cmd_question(entree):
    j = charge(entree)
    q, quoi = suivante(j)
    if q is None:
        if not j["plan"] and j.get("plan_propose"):
            print("Plan proposé, en attente de l'utilisateur : le lui montrer, puis `valide` avec ses mots.")
        elif not j["plan"]:
            print("Phases A à C faites. Tirer des réponses le plan : `plan` avec les thèses d'étape.")
        elif not any(x["id"] == "F-manque" for x in j["questions"]):
            print("Plan démontré. Rédiger l'entrée, puis `manque` avec le fichier yaml.")
        elif not os.path.exists(chemin(entree, "relecture.json")):
            print("Faire relire l'entrée par l'agent relecteur-glossaire (jamais par moi-même), puis `verifie`.")
        else:
            print("`verifie` avec le fichier yaml.")
        return
    if quoi == "juger":
        print(f"À juger d'abord : {q['id']}. Saurais-je rendre cet argument convaincant, sans trou, à quelqu'un qui ne croit pas Plotin ?")
        print(f"  `juge {entree} {q['id']} clair` ou `juge {entree} {q['id']} obscur \"ce qui reste obscur\"`")
        return
    print(f"[{q['id']}] À coller seule dans NotebookLM, puis attendre la fin de la réponse :\n")
    print(texte_envoye(entree, j, q))


def deja_cites(entree, j):
    """Passages (traité, chapitre) déjà donnés dans les réponses enregistrées."""
    vus = []
    for q in j["questions"]:
        if not q["reponse"]:
            continue
        t = open(chemin(entree, q["reponse"]), encoding="utf-8").read()
        for m in re.finditer(r"[Tt]raité (\d+)(?: \([^)]*\))?, chap(?:itre|\.)? ?(\d+)", t):
            p = f"{m.group(1)}, {m.group(2)}"
            if p not in vus:
                vus.append(p)
    return vus


def texte_envoye(entree, j, q):
    """La question telle qu'elle part : bornée en longueur, et sans redite des passages connus."""
    vus = deja_cites(entree, j)
    suite = [BREF] + ([DEJA.format(passages="traités " + " ; ".join(vus))] if vus and q["phase"] != "F" else [])
    return q["texte"] + " " + " ".join(suite)


def cmd_reponse(entree, qid, fichier):
    j = charge(entree)
    q = next((x for x in j["questions"] if x["id"] == qid), None)
    if q is None:
        sys.exit(f"Question inconnue : {qid}")
    attendue, _ = suivante(j)
    if attendue is not None and attendue["id"] != qid:
        sys.exit(f"La question à poser est {attendue['id']} : les questions se posent dans l'ordre, une à une.")
    texte = open(fichier, encoding="utf-8").read().strip()
    if len(texte) < MIN_REPONSE:
        sys.exit(f"Notes de {len(texte)} caractères : relever au moins les thèses, prémisses et passages de la réponse.")
    f = chemin(entree, qid + ".md")
    open(f, "w", encoding="utf-8").write(f"# {qid}\n\n{q['texte']}\n\n---\n\n{texte}\n")
    q["reponse"] = os.path.basename(f)
    garde(entree, j)
    if q["phase"] == "C":
        print("Relever chaque point difficile de cette réponse avec `relance` avant de poursuivre.")
    print("Recouper sur la GF (gf.py cherche) toute citation et tout repère avant de s'en servir.")
    cmd_question(entree)


def cmd_image(entree, image):
    j = charge(entree)
    if j["plan"]:
        sys.exit("Les images se relèvent avant le plan.")
    n = sum(q["id"].startswith("B-image") for q in j["questions"]) + 1
    _insere_avant(j, "C", dict(id=f"B-image{n}", phase="B", texte=IMAGE.format(notion=j["notion"], image=image), reponse=None, verdict=None))
    garde(entree, j)
    print(f"B-image{n} ajoutée.")


def _insere_avant(j, phase, q):
    i = next((k for k, x in enumerate(j["questions"]) if x["phase"] == phase and not x["reponse"]), len(j["questions"]))
    j["questions"].insert(i, q)


def cmd_relance(entree, point, apres=None):
    j = charge(entree)
    n = sum(q["id"].startswith("E-relance") for q in j["questions"]) + 1
    q = dict(id=f"E-relance{n}", phase="E", texte=RELANCE.format(point=point.rstrip(" .")), reponse=None, verdict=None, origine=apres)
    if apres:
        k = next(k for k, x in enumerate(j["questions"]) if x["id"] == apres)
        j["questions"].insert(k + 1, q)
    else:
        _insere_avant(j, "D", q)
    garde(entree, j)
    print(f"E-relance{n} ajoutée.")


def cmd_plan(entree, theses):
    """Propose le plan : il ne vaut qu'une fois validé par l'utilisateur (`valide`)."""
    j = charge(entree)
    for lettre in "ABC":
        if not phase_finie(j, lettre):
            sys.exit(f"Phase {lettre} inachevée : le plan se tire des réponses, il ne les précède pas.")
    if not all(q["verdict"] == "clair" for q in j["questions"] if q["phase"] == "E" and q["reponse"]):
        sys.exit("Des relances ne sont pas encore jugées claires : les finir avant de proposer le plan.")
    if len(theses) < 2:
        sys.exit("Un plan a au moins deux thèses d'étape.")
    if j["plan"]:
        sys.exit("Le plan est déjà validé ; pour le changer, `valide` à nouveau avec l'accord de l'utilisateur.")
    j["plan_propose"] = theses
    garde(entree, j)
    print("Plan proposé. À MONTRER À L'UTILISATEUR, puis attendre sa réponse avant toute rédaction :\n")
    for k, t in enumerate(theses, 1):
        print(f"  {k}. {t}")
    relances = [q for q in j["questions"] if q["phase"] == "E"]
    if relances:
        print("\nPoints difficiles relevés auprès de NotebookLM :")
        for q in relances:
            print("  -", re.sub(r"^Je ne comprends pas pourquoi |\. Explique.*$", "", q["texte"]))
    print(f"\nPuis : valide {entree} \"ses mots, cités\" [thèses corrigées…]")


def cmd_valide(entree, accord, theses=None):
    """Enregistre l'accord de l'utilisateur sur le plan (ses mots, cités) et ouvre la phase D."""
    j = charge(entree)
    if not j.get("plan_propose"):
        sys.exit("Aucun plan proposé : `plan` d'abord.")
    if len(accord.strip()) < 2:
        sys.exit("Citer la réponse de l'utilisateur.")
    theses = theses or j["plan_propose"]
    j["plan"] = theses
    j["accord"] = accord
    for k, t in enumerate(theses, 1):
        ajoute(j, f"D-these{k}", "D", THESE.format(these=t[0].lower() + t[1:].rstrip(" .")), these=t)
    garde(entree, j)
    print(f"Plan validé par l'utilisateur ({len(theses)} thèses) : une question chacune.")
    cmd_question(entree)


def cmd_juge(entree, qid, verdict, reste=None):
    j = charge(entree)
    q = next((x for x in j["questions"] if x["id"] == qid), None)
    if q is None or not q["reponse"]:
        sys.exit("Juger une question qui a sa réponse.")
    if verdict == "clair":
        q["verdict"] = "clair"
    elif verdict == "obscur":
        if not reste:
            sys.exit("Dire ce qui reste obscur : c'est la relance.")
        q["verdict"] = "obscur"
        garde(entree, j)
        cmd_relance(entree, reste, apres=qid)
        return
    else:
        sys.exit("clair ou obscur")
    garde(entree, j)
    cmd_question(entree)


def rappel(yaml):
    t = open(yaml, encoding="utf-8").read()
    m = re.search(r"notes: \|-\n(.*?)\n  [a-z]+:", t, re.S)
    return m.group(1) if m else ""


def etapes(notes):
    out = []
    # une étape commence à sa ligne d'intitulé, même collée à un tableau qui la précède
    for para in re.split(r"\n\s*\n|\n(?=\s*(?:\{[a-z]+\})?__\*\*)", notes):
        p = para.strip()
        m = re.match(r"(?:\{[a-z]+\})?(__\*\*.*?\*\*__(?:\{/[a-z]+\})?(?:\s*(?:\{[a-z]+\})?__\*\*.*?\*\*__(?:\{/[a-z]+\})?)*)", p)
        if not m:
            continue
        titre = re.sub(r"__\*\*|\*\*__", "", m.group(1))
        if norm(titre) in ("passages clefs", "voir aussi"):
            continue
        out.append((titre.strip(), p[m.end():]))
    return out


def cmd_manque(entree, yaml):
    j = charge(entree)
    if not j["plan"] or not all(q["verdict"] == "clair" for q in j["questions"] if a_juger(q) and q["reponse"]):
        sys.exit("Le plan doit être démontré et jugé clair avant la question de ce qui manque.")
    notes = rappel(yaml)
    et = "; ".join(norm(t) and re.sub(r"\{/?[a-z]+\}", "", t) for t, _ in etapes(notes))
    pas = "; ".join(sorted(set(re.findall(r"traité \d+, chap\. \d+", notes.replace(" ", " ")))))
    ajoute(j, "F-manque", "F", MANQUE.format(notion=j["notion"], etapes=et, passages=pas))
    garde(entree, j)
    cmd_question(entree)


def empreinte(yaml):
    """Empreinte du rappel et des cartes : un verdict ne vaut que pour le texte qu'il a relu."""
    t = open(yaml, encoding="utf-8").read().replace(" ", " ")
    corps = t[t.find("lessons:"):]
    return hashlib.md5(re.sub(r"\s+", " ", corps).encode("utf-8")).hexdigest()[:12]


def cmd_verdict(entree, yaml, verdict, rapport):
    """Réservé à l'agent relecteur-glossaire : enregistre son verdict sur l'entrée telle qu'il l'a lue."""
    j = charge(entree)
    if verdict not in ("valide", "a-reprendre"):
        sys.exit("valide ou a-reprendre")
    texte = open(rapport, encoding="utf-8").read().strip()
    if len(texte) < 200:
        sys.exit("Le rapport doit dire, étape par étape, ce qui a été vérifié.")
    v = dict(verdict=verdict, empreinte=empreinte(yaml), rapport=texte)
    json.dump(v, open(chemin(entree, "relecture.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    j.setdefault("relectures", []).append(dict(verdict=verdict, empreinte=v["empreinte"]))
    garde(entree, j)
    print(f"Verdict « {verdict} » enregistré pour l'empreinte {v['empreinte']}.")


RAISON = re.compile(r"\b(parce que|parce qu|car|donc|puisque|en effet|d'où|c'est pourquoi|ainsi|or)\b", re.I)


def controle(entree, yaml):
    """Liste des manquements ; vide si l'entrée peut être publiée."""
    fautes = []
    j = charge(entree)
    for q in j["questions"]:
        if not q["reponse"]:
            fautes.append(f"sans réponse : {q['id']}")
        elif a_juger(q) and q["verdict"] != "clair":
            fautes.append(f"non jugée claire : {q['id']}")
    if not j["plan"]:
        fautes.append("pas de plan (phase D)")
    if not any(q["id"] == "F-manque" for q in j["questions"]):
        fautes.append("question de ce qui manque non posée (phase F)")
    notes = rappel(yaml)
    plan = [norm(t) for t in j["plan"]]
    for titre, corps in etapes(notes):
        if norm(titre) not in plan:
            fautes.append(f"étape hors du plan démontré : « {titre} » (l'ajouter au plan, la démontrer, ou la retirer)")
        if not RAISON.search(corps):
            fautes.append(f"étape sans connecteur de raison : « {titre} »")
    for t in j["plan"]:
        if norm(t) not in [norm(x) for x, _ in etapes(notes)]:
            fautes.append(f"thèse du plan absente du rappel : « {t} »")
    if re.search(r"autrement dit", notes, re.I):
        fautes.append("« Autrement dit » : une paraphrase qui affirme au lieu de démontrer")
    if j["plan"] and not j.get("accord"):
        fautes.append("plan non validé par l'utilisateur (`valide`)")
    r = chemin(entree, "relecture.json")
    if not os.path.exists(r):
        fautes.append("pas de relecture par l'agent relecteur-glossaire")
    else:
        v = json.load(open(r, encoding="utf-8"))
        if v["empreinte"] != empreinte(yaml):
            fautes.append("l'entrée a changé depuis la relecture : la refaire relire")
        elif v["verdict"] != "valide":
            fautes.append("le relecteur demande des reprises (voir relecture.json)")
    return fautes


def cmd_verifie(entree, yaml):
    fautes = controle(entree, yaml)
    for f in fautes:
        print("✗ " + f)
    print("Procédure faite : publication permise." if not fautes else f"{len(fautes)} manquement(s) : publication refusée.")
    sys.exit(1 if fautes else 0)


def cmd_etat(entree):
    j = charge(entree)
    for q in j["questions"]:
        r = "réponse" if q["reponse"] else "—"
        v = f", {q['verdict']}" if q.get("verdict") else ""
        print(f"{q['id']:<14} {r}{v}")
    print("plan :", *(f"\n  - {t}" for t in j["plan"]) or " —")
    cmd_question(entree)


def cmd_relecture(entree, critique):
    r = json.load(open(RELECTURES, encoding="utf-8")) if os.path.exists(RELECTURES) else []
    r.append(dict(entree=entree, critique=critique))
    json.dump(r, open(RELECTURES, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(r)} relecture(s) enregistrée(s).")


def cmd_lecons():
    r = json.load(open(RELECTURES, encoding="utf-8")) if os.path.exists(RELECTURES) else []
    for x in r:
        print(f"- [{x['entree']}] {x['critique']}")


ETAPE = re.compile(r"^\+\s{4}(?:\{[a-z]+\})?__\*\*", re.M)


def cmd_crochet():
    """Crochet PreToolUse.

    - Write (réécriture entière) d'une entrée existante sans journal : refusé ; une
      refonte commence par `debut`, une correction ponctuelle passe par Edit.
    - Commit ou publication : refusé pour une entrée nouvelle sans journal, pour une
      entrée dont le journal ne passe pas `controle`, et pour une entrée sans journal
      dont le diff ajoute ou change un intitulé d'étape (une refonte déguisée), sauf
      commit des retouches de l'utilisateur (message contenant « retouche »).
    """
    try:
        ev = json.load(sys.stdin)
    except Exception:
        return
    outil, entree_outil = ev.get("tool_name", ""), ev.get("tool_input", {})
    racine = os.path.dirname(os.path.dirname(os.path.dirname(ICI)))

    def refuse(msg):
        print(msg, file=sys.stderr)
        sys.exit(2)

    if outil == "Write":
        f = entree_outil.get("file_path", "").replace("\\", "/")
        m = re.search(r"courses/plotin/units/(g-[\w-]+)\.yaml$", f)
        if m and os.path.exists(f) and not os.path.exists(chemin(m.group(1), "journal.json")):
            refuse(f"{m.group(1)} : réécrire une entrée existante demande d'ouvrir son journal (`notebook.py debut`) ; "
                   "pour une correction ponctuelle, utiliser Edit, qui garde les retouches de l'utilisateur.")
        return
    cmd = entree_outil.get("command", "")
    if not re.search(r"git commit|publier\.sh", cmd):
        return
    git = lambda *a: subprocess.run(["git", "-C", racine, *a], capture_output=True, text=True, encoding="utf-8").stdout
    ajoutes = set(git("diff", "--cached", "--name-only", "--diff-filter=A").split())
    fichiers = set(git("diff", "--cached", "--name-only").split()) | set(re.findall(r"\S*units/g-[\w-]+\.yaml", cmd))
    nouveaux = set(git("ls-files", "--others", "--exclude-standard").split())
    retouche = re.search(r"retouche", cmd, re.I)
    fautes = []
    for f in sorted(fichiers):
        m = re.search(r"units/(g-[\w-]+)\.yaml$", f)
        if not m or "plotin" not in f:
            continue
        entree = m.group(1)
        rel = re.sub(r"^.*?(content/)", r"\1", f)
        yaml = os.path.join(racine, rel)
        if os.path.exists(chemin(entree, "journal.json")):
            fautes += [f"{entree} : {x}" for x in controle(entree, yaml)]
        elif f in ajoutes or rel in nouveaux:
            fautes.append(f"{entree} : entrée nouvelle sans journal NotebookLM")
        elif not retouche and ETAPE.search(git("diff", "-U0", "HEAD", "--", rel)):
            fautes.append(f"{entree} : des intitulés d'étape changent sans journal (une refonte commence par `notebook.py debut`)")
    if fautes:
        refuse("Procédure NotebookLM inachevée (notebook.py) :\n" + "\n".join(fautes))


def main(a):
    def opt(nom):
        if nom in a:
            i = a.index(nom)
            v = a[i + 1]
            del a[i:i + 2]
            return v
    if not a:
        sys.exit(__doc__)
    c = a.pop(0)
    if c == "debut":
        g, v, e, c = opt("--grec"), opt("--voisines"), opt("--effets"), opt("--couvert")
        cmd_debut(a[0], a[1], g, v, e, c)
    elif c == "question":
        cmd_question(a[0])
    elif c == "reponse":
        cmd_reponse(*a[:3])
    elif c == "image":
        cmd_image(a[0], a[1])
    elif c == "relance":
        cmd_relance(a[0], a[1])
    elif c == "plan":
        cmd_plan(a[0], a[1:])
    elif c == "valide":
        cmd_valide(a[0], a[1], a[2:] or None)
    elif c == "verdict":
        cmd_verdict(a[0], a[1], a[2], a[3])
    elif c == "empreinte":
        print(empreinte(a[0]))
    elif c == "juge":
        cmd_juge(a[0], a[1], a[2], a[3] if len(a) > 3 else None)
    elif c == "manque":
        cmd_manque(a[0], a[1])
    elif c == "verifie":
        cmd_verifie(a[0], a[1])
    elif c == "etat":
        cmd_etat(a[0])
    elif c == "relecture":
        cmd_relecture(a[0], a[1])
    elif c == "lecons":
        cmd_lecons()
    elif c == "crochet":
        cmd_crochet()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main(sys.argv[1:])
