"""Procédure NotebookLM d'une entrée du glossaire de Marx : questions, journal, contrôle.

Copie adaptée de la skill glossaire (Plotin) ; les deux évoluent séparément.

Le programme ne parle pas à NotebookLM : il dit quelle question poser, garde
les réponses, et refuse la publication tant que la procédure n'est pas faite.
Journaux : .claude/skills/glossaire-marx/journaux/<entrée>/ (hors dépôt).
Relectures de l'utilisateur : .claude/skills/glossaire-marx/relectures.json (versionné).

Usage : voir SKILL.md, § 2.
"""
import json
import os
import re
import subprocess
import sys
import unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
JOURNAUX = os.path.join(ICI, "journaux")
RELECTURES = os.path.join(ICI, "relectures.json")
MANQUANTES = os.path.join(ICI, "oeuvres_manquantes.json")
MIN_REPONSE = 300  # caractères : en dessous, ce ne sont plus des notes utilisables
# Réponses courtes et sans redite (choix de l'utilisateur, 2026-10-26) : NotebookLM recitait
# à chaque réponse les mêmes passages, et chaque réponse se lisait puis se recopiait en entier.
# Les citations ne se vérifient pas sur un PDF (consigne de l'utilisateur, 2026-11-04) : on s'y fie à
# condition d'une source précise, et on veut savoir quand un texte de Marx manque au notebook.
SOURCE = ("Pour toute citation, donne le texte exact entre guillemets, l'œuvre de Marx, la section et le document du notebook d'où elle vient ; "
          "si elle vient d'une étude et non du texte de Marx, dis-le et nomme l'étude. Si un texte de Marx nécessaire manque au notebook, dis-le.")
# Depuis le 2026-11-06, la longueur et la consigne de source sont dans « Configurer le chat » du
# notebook (choix de l'utilisateur) : on ne les répète plus dans chaque question.
BREF = ""
DEJA = "Ne reprends pas les passages déjà donnés ({passages}) : apporte du neuf, ou dis qu'il n'y en a pas."

# Les questions élémentaires vont par deux groupes, réponse en tableau court (même choix) ;
# les difficultés, les thèses et les relances restent une par message.
ELEMENTAIRES = [
    ("B-statut", "Sur {notion}, réponds en un tableau court à trois lignes. Nature : qu'est-ce (une activité, un rapport social, un processus, une forme, une représentation, une essence), et à quoi le voit-on dans le texte ? Place : à quel niveau de l'analyse (l'homme et son rapport à la nature, les rapports de production, l'État et le droit, les représentations), et pourquoi celui-là ? Origine : de quelles conditions historiques cela dépend-il, et de qui Marx reprend-il le concept (Hegel, Feuerbach, Hess, l'économie classique), en le transformant comment ? Pour chaque ligne, la raison de Marx et un passage (œuvre, section)."),
    ("B-portee", "Sur {notion}, réponds en un tableau court à quatre lignes. Démarcation : en quoi se distingue-t-elle de {voisines}, et pourquoi Marx ne les confond-il pas ? Extension : à quelles sociétés, quels groupes ou quels êtres vaut-elle, auxquels non, et pourquoi ? Fonction : qu'est-ce qui ne tiendrait plus sans elle dans la pensée de Marx ? Mécanisme : comment produit-elle {effets}, étape par étape ? Pour chaque ligne, la raison de Marx et un passage (œuvre, section).{deja_entrees}"),
]
DIFFICULTES = [
    ("C-paradoxes", "Dans ce que Marx dit à propos de {notion}, quelles thèses paraissent contre-intuitives ou paradoxales à un lecteur d'aujourd'hui ? Pour chacune, la raison exacte qu'en donne Marx, avec passages et citations."),
    ("C-systeme", "Quels points de ce que Marx dit à propos de {notion} ne se comprennent que si l'on connaît d'autres thèses de Marx (par exemple la critique de Hegel, l'être générique, la conception matérialiste de l'histoire, la théorie de la valeur) ? Pour chacun : la thèse présupposée, et en quoi elle éclaire le point."),
    ("C-objections", "Quelles objections ou difficultés Marx soulève-t-il lui-même à propos de {notion}, contre quels adversaires, et comment y répond-il ? Pour chacune, l'objection, la réponse pas à pas, passages et citations."),
    ("C-contresens", "Quels contresens commet-on à propos de {notion} (sens courant du mot, sens chez Hegel, Feuerbach ou les économistes classiques, vulgate marxiste, lecture qui confond le jeune Marx et celui du Capital) ? Pour chacun, ce que Marx dit à la place, avec passages."),
]
THESE = "Comment Marx établit-il que {these} ? Donne l'argument prémisse par prémisse, le passage (œuvre, section) et la citation où chaque prémisse est posée, et ce qu'il faut savoir du reste de sa pensée pour suivre l'argument."
IMAGE = "Pourquoi Marx dit-il, à propos de {notion} : « {image} » ? Que dit littéralement cette image ou cette formule, terme à terme (qu'est-ce qui correspond à quoi), et qu'est-ce qu'elle fait comprendre que la formule abstraite ne dirait pas ? Passage et citation."
RELANCE = "Je ne comprends pas pourquoi {point}. Explique pas à pas le raisonnement de Marx, sans sauter d'étape, en disant d'où vient chaque prémisse (passage, citation)."
# Ni la fiche ni sa liste d'étapes ne se recopient dans NotebookLM (trop long, trop coûteux :
# consigne du 2026-10-31) : il garde la conversation de l'entrée en mémoire.
MANQUE = "D'après notre conversation sur {notion}, quels passages, arguments, distinctions ou difficultés importants n'avons-nous pas abordés, et pourquoi chacun importe-t-il ?"


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
    return q["phase"] in ("D", "E", "G")


def suivante(j):
    for q in j["questions"]:
        if not q["reponse"]:
            return q, None
        if a_juger(q) and not q["verdict"]:
            return q, "juger"
    return None, None


def cmd_debut(entree, notion, allemand=None, voisines=None, effets=None, couvert=None):
    if not voisines or not effets:
        sys.exit("--voisines et --effets sont obligatoires : les notions dont il faut la distinguer, ce qu'elle produit ou fait.")
    if os.path.exists(chemin(entree, "journal.json")):
        sys.exit(f"Un journal existe déjà pour {entree} (`etat` pour le voir).")
    nom = f"la notion de « {notion} »" + (f" ({allemand})" if allemand else "")
    # Le notebook ne connaît pas le glossaire : on nomme les notions voisines elles-mêmes,
    # jamais « les autres entrées » (remarque de l'utilisateur, 2026-11-06).
    deja_entrees = f" Ne développe pas pour elles-mêmes ces notions voisines, sauf pour marquer la différence : {couvert}." if couvert else ""
    j = dict(entree=entree, notion=nom, voisines=voisines, effets=effets, plan=[], questions=[])
    ajoute(j, "A-lieux", "A", f"Où Marx établit-il ou définit-il {nom} ? Donne les deux à quatre passages décisifs (œuvre, section), une citation de Marx pour chacun, et ce que chacun établit.")
    ajoute(j, "A-emplois", "A", f"Quels sens ou emplois distincts {nom} a-t-elle chez Marx, comment évoluent-ils des écrits de jeunesse au Capital, et quelles distinctions commande-t-elle ? Pour chacun, un passage (œuvre, section) et une citation.")
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
            print("Plan proposé mais pas fixé (ancien journal) : `valide` pour le fixer.")
        elif not j["plan"]:
            print("Phases A à C faites. Tirer des réponses le plan : `plan` avec les thèses d'étape.")
        elif not any(x["id"] == "F-manque" for x in j["questions"]):
            print("Plan démontré. Rédiger l'entrée, puis `manque` avec le fichier yaml.")
        elif not j.get("signalements"):
            print("`verifie`, publier, puis attendre la relecture de l'utilisateur : chaque point qu'il signale passe par `signale`.")
        else:
            print("`verifie` avec le fichier yaml.")
        return
    if quoi == "juger":
        print(f"À juger d'abord : {q['id']}. Saurais-je rendre cet argument convaincant, sans trou, à quelqu'un qui ne croit pas Marx ?")
        print(f"  `juge {entree} {q['id']} clair` ou `juge {entree} {q['id']} obscur \"ce qui reste obscur\"`")
        return
    print(f"[{q['id']}] À coller seule dans NotebookLM, puis attendre la fin de la réponse :\n")
    print(texte_envoye(entree, j, q))


def deja_cites(entree, j):
    """Passages déjà donnés : les lignes « Passage : œuvre, section » des notes enregistrées."""
    vus = []
    for q in j["questions"]:
        if not q["reponse"]:
            continue
        t = open(chemin(entree, q["reponse"]), encoding="utf-8").read()
        for m in re.finditer(r"^\s*(?:- )?Passage : (.+?)\s*$", t, re.M):
            if m.group(1) not in vus:
                vus.append(m.group(1))
    return vus


def texte_envoye(entree, j, q):
    """La question telle qu'elle part : bornée en longueur, et sans redite des passages connus."""
    vus = deja_cites(entree, j)
    # une thèse se démontre avec tous ses passages, même déjà donnés
    suite = ([BREF] if BREF else []) + ([DEJA.format(passages=" ; ".join(vus))] if vus and q["phase"] not in ("D", "E", "F", "G") else [])
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
    print("Citation sans œuvre et section, ou sans source : ne pas l'employer, relancer. Œuvre de Marx citée de seconde main ou absente : `manquante`.")
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
    """Fixe le plan et ouvre la phase D, sans attendre l'utilisateur : depuis le
    2026-10-31, il juge sur la version finale, pas sur un plan (voir SKILL.md)."""
    j = charge(entree)
    for lettre in "ABC":
        if not phase_finie(j, lettre):
            sys.exit(f"Phase {lettre} inachevée : le plan se tire des réponses, il ne les précède pas.")
    if not all(q["verdict"] == "clair" for q in j["questions"] if q["phase"] == "E" and q["reponse"]):
        sys.exit("Des relances ne sont pas encore jugées claires : les finir avant de proposer le plan.")
    if len(theses) < 2:
        sys.exit("Un plan a au moins deux thèses d'étape.")
    if j["plan"]:
        sys.exit("Le plan est déjà fixé ; pour le changer, `valide` avec les thèses corrigées.")
    j["plan_propose"] = theses
    garde(entree, j)
    print("Plan fixé, sans validation préalable (l'utilisateur juge sur la version finale) :\n")
    for k, t in enumerate(theses, 1):
        print(f"  {k}. {t}")
    cmd_valide(entree, "sans validation préalable : l'utilisateur juge sur la version finale (consigne du 2026-10-31)")


def cmd_valide(entree, accord, theses=None):
    """Fixe le plan (appelé par `plan`, ou à la main pour le corriger) et ouvre la phase D."""
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
    print(f"\nPlan fixé ({len(theses)} thèses) : une question chacune.")
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
    ajoute(j, "F-manque", "F", MANQUE.format(notion=j["notion"]))
    garde(entree, j)
    cmd_question(entree)


RAISON = re.compile(r"\b(parce que|parce qu|car|donc|puisque|en effet|d'où|c'est pourquoi|ainsi|or)\b", re.I)


def version_utilisateur(yaml):
    """Le rappel tel que l'utilisateur l'a laissé à sa dernière retouche commitée (vide s'il n'y en a pas)."""
    racine = os.path.dirname(os.path.dirname(os.path.dirname(ICI)))
    rel = os.path.relpath(os.path.abspath(yaml), racine).replace("\\", "/")
    git = lambda *a: subprocess.run(["git", "-C", racine, *a], capture_output=True, text=True, encoding="utf-8").stdout
    c = git("log", "-1", "-i", "--grep=retouche", "--format=%H", "--", rel).strip()
    if not c:
        return ""
    t = git("show", f"{c}:{rel}")
    m = re.search(r"notes: \|-\n(.*?)\n  [a-z]+:", t, re.S)
    return m.group(1) if m else ""


def controle(entree, yaml):
    """Liste des manquements ; vide si l'entrée peut être publiée.

    Ce que l'utilisateur a écrit lui-même (dernière retouche commitée) fait foi : ses intitulés
    d'étape, les étapes qu'il a retirées et ses formulations ne sont pas des manquements."""
    fautes = []
    j = charge(entree)
    sien = version_utilisateur(yaml)
    ses_titres = {norm(t) for t, _ in etapes(sien)} if sien else set()
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
        if norm(titre) not in plan and norm(titre) not in ses_titres:
            fautes.append(f"étape hors du plan démontré : « {titre} » (l'ajouter au plan, la démontrer, ou la retirer)")
        if not RAISON.search(corps) and norm(titre) not in ses_titres:
            fautes.append(f"étape sans connecteur de raison : « {titre} »")
    for t in j["plan"]:
        retiree = sien and norm(t) not in ses_titres
        if norm(t) not in [norm(x) for x, _ in etapes(notes)] and not retiree:
            fautes.append(f"thèse du plan absente du rappel : « {t} »")
    if len(re.findall(r"autrement dit", notes, re.I)) > len(re.findall(r"autrement dit", sien, re.I)):
        fautes.append("« Autrement dit » : une paraphrase qui affirme au lieu de démontrer")
    if j["plan"] and not j.get("accord"):
        fautes.append("plan non validé par l'utilisateur (`valide`)")
    # Autocritique du 2026-11-06 : toutes les thèses jugées claires d'emblée, aucune relance ;
    # le notebook ne faisait que redonner les citations. Au moins une relance, sur le point le plus
    # difficile, avant d'écrire.
    if not j.get("derive_de") and not any(q["phase"] == "E" and q["reponse"] for q in j["questions"]):
        fautes.append("aucune relance (phase E) : relancer le notebook sur le point le plus difficile du plan")
    fautes += cartes_faibles(yaml)
    return fautes


def cartes_faibles(yaml):
    """Cartes dont la réponse se lit dans la phrase même (autocritique du 2026-11-06), et part des
    cartes d'argument : il en faut au moins un tiers (les autres font retrouver un mot de citation)."""
    fautes, citations, total = [], 0, 0
    texte = open(yaml, encoding="utf-8").read()
    carte = re.compile(r'- id: (\S+)\n\s+sentence: "((?:[^"\\]|\\.)*)"\n\s+answer: "?([^"\n]*)"?')
    for pid, phrase, rep in carte.findall(texte):
            total += 1
            reste = phrase.replace("___", " ")
            if re.search(r"(?<!\w)" + re.escape(rep.strip()) + r"(?!\w)", reste, re.I):
                fautes.append(f"carte devinable, la réponse est dans la phrase : {pid}")
            if re.search(r"«[^»]*___[^»]*»", phrase):
                citations += 1
    if total and total - citations < total / 3:
        fautes.append(f"trop peu de cartes d'argument : {total - citations} sur {total} (au moins un tiers ; les autres complètent une citation)")
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


def cmd_derive(entree, source, demande, theses):
    """Une entrée faite d'étapes sorties d'une autre (choix de l'utilisateur) hérite de son journal :
    ces étapes y ont déjà été démontrées. Seules les thèses du plan source sont admises."""
    import shutil
    js = charge(source)
    if os.path.exists(chemin(entree, "journal.json")):
        sys.exit(f"Un journal existe déjà pour {entree}.")
    inconnues = [t for t in theses if norm(t) not in [norm(x) for x in js["plan"]]]
    if inconnues or not theses:
        sys.exit(f"Thèses absentes du plan de {source} : {inconnues or 'aucune donnée'}")
    j = json.loads(json.dumps(js))
    j.update(entree=entree, plan=theses, derive_de=source,
             accord=f"{js.get('accord', '')} — puis, pour cette entrée dérivée : « {demande} »")
    os.makedirs(chemin(entree), exist_ok=True)
    for q in j["questions"]:
        if q["reponse"]:
            shutil.copy(chemin(source, q["reponse"]), chemin(entree, q["reponse"]))
    garde(entree, j)
    print(f"Journal de {entree} dérivé de {source} ({len(theses)} thèse(s)).")


def cmd_deplace(source, cible, these):
    """Une étape passe d'une entrée à une autre (répartition) : sa thèse quitte le plan de la
    source et rejoint celui de la cible, avec la réponse de phase D qui la démontre."""
    import shutil
    js, jc = charge(source), charge(cible)
    rang = [k for k, t in enumerate(js["plan"], 1) if norm(t) == norm(these)]
    if not rang:
        sys.exit(f"Thèse absente du plan de {source} : {these}")
    k = rang[0]
    q = next(x for x in js["questions"] if x["id"] == f"D-these{k}")
    copie = json.loads(json.dumps(q))
    copie["id"] = f"D-{source}-{k}"
    copie["these"] = js["plan"][k - 1]
    if q["reponse"]:
        copie["reponse"] = f"{source}-{os.path.basename(q['reponse'])}"
        shutil.copy(chemin(source, q["reponse"]), chemin(cible, copie["reponse"]))
    jc["questions"].append(copie)
    jc["plan"].append(js["plan"][k - 1])
    jc.setdefault("deplacees", []).append({"de": source, "these": js["plan"][k - 1]})
    # La question reste au journal de la source (les rangs D-theseN ne bougent pas), pas la thèse.
    js["plan"].pop(k - 1)
    js.setdefault("cedees", []).append({"vers": cible, "these": copie["these"]})
    garde(source, js)
    garde(cible, jc)
    print(f"« {copie['these']} » : de {source} à {cible}.")


def cmd_signale(entree, point):
    """Un point obscur signalé par l'utilisateur : relance auprès de NotebookLM, et critique gardée."""
    j = charge(entree)
    j.setdefault("signalements", []).append(point)
    garde(entree, j)
    cmd_relecture(entree, point)
    cmd_relance(entree, point)
    cmd_question(entree)


def cmd_relecture(entree, critique):
    r = json.load(open(RELECTURES, encoding="utf-8")) if os.path.exists(RELECTURES) else []
    r.append(dict(entree=entree, critique=critique))
    json.dump(r, open(RELECTURES, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(r)} relecture(s) enregistrée(s).")


def cmd_manquante(entree, oeuvre, besoin):
    """Une œuvre de Marx absente du notebook ou citée de seconde main : à signaler à l'utilisateur."""
    r = json.load(open(MANQUANTES, encoding="utf-8")) if os.path.exists(MANQUANTES) else []
    r.append(dict(entree=entree, oeuvre=oeuvre, besoin=besoin))
    json.dump(r, open(MANQUANTES, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"« {oeuvre} » notée : à signaler à l'utilisateur dans le compte rendu.")


def cmd_manquantes():
    r = json.load(open(MANQUANTES, encoding="utf-8")) if os.path.exists(MANQUANTES) else []
    for x in r:
        print(f"- {x['oeuvre']} [{x['entree']}] : {x['besoin']}")


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
        m = re.search(r"courses/marx/units/(g-[\w-]+)\.yaml$", f)
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
        if not m or "marx" not in f:
            continue
        entree = m.group(1)
        rel = re.sub(r"^.*?(content/)", r"\1", f)
        yaml = os.path.join(racine, rel)
        if os.path.exists(chemin(entree, "journal.json")):
            # un commit de retouches n'enregistre que le texte de l'utilisateur, qui fait foi
            if not retouche:
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
        g, v, e, c = opt("--allemand"), opt("--voisines"), opt("--effets"), opt("--couvert")
        cmd_debut(a[0], a[1], g, v, e, c)
    elif c == "question":
        cmd_question(a[0])
    elif c == "reponse":
        cmd_reponse(*a[:3])
    elif c == "image":
        cmd_image(a[0], a[1])
    elif c == "relance":
        cmd_relance(a[0], a[1])
    elif c == "derive":
        cmd_derive(a[0], a[1], a[2], a[3:])
    elif c == "deplace":
        cmd_deplace(a[0], a[1], a[2])
    elif c == "signale":
        cmd_signale(a[0], a[1])
    elif c == "plan":
        cmd_plan(a[0], a[1:])
    elif c == "valide":
        cmd_valide(a[0], a[1], a[2:] or None)
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
    elif c == "manquante":
        cmd_manquante(a[0], a[1], a[2])
    elif c == "manquantes":
        cmd_manquantes()
    elif c == "crochet":
        cmd_crochet()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main(sys.argv[1:])
