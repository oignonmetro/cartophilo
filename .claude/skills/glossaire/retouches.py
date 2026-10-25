"""Les retouches de l'utilisateur sont-elles toujours là ?

Usage : retouches.py <fichier yaml>...

Pour chaque fichier, prend les commits de retouches de l'utilisateur (message
contenant « retouche »), relève les mises en relief qu'il y a ajoutées
({couleur}…{/couleur}, __…__, **…**) et signale celles qui ont disparu du
fichier, sauf s'il les a retirées lui-même dans une retouche suivante.
Sortie 1 s'il en manque : une réécriture doit les reporter sur le nouveau
texte. Une retouche qu'on ne peut pas reporter (la phrase a disparu, à la
demande de l'utilisateur) s'inscrit dans retouches_abandonnees.json avec sa
raison, et se signale à l'utilisateur dans le compte rendu.
"""
import json
import os
import re
import subprocess
import sys

SPAN = re.compile(r"\{([a-z]+)\}.*?\{/\1\}|__\*\*.*?\*\*__|__[^_\n]+?__|\*\*[^*\n]+?\*\*")


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True, encoding="utf-8").stdout


def version(rev, f):
    return git("show", f"{rev}:{f}").replace(" ", " ")


def spans(t):
    return {m.group(0) for m in SPAN.finditer(t)}


ABANDON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "retouches_abandonnees.json")


def abandonnees():
    if not os.path.exists(ABANDON):
        return set()
    return {(x["fichier"], x["retouche"]) for x in json.load(open(ABANDON, encoding="utf-8"))}


def manquantes(f):
    actuel = open(f, encoding="utf-8").read().replace(" ", " ").lower()
    commits = git("log", "--reverse", "-i", "--grep=retouche", "--format=%H", "--", f).split()
    out = []
    nom = os.path.basename(f)
    vues = abandonnees()
    for k, c in enumerate(commits):
        ajoutes = spans(version(c, f)) - spans(version(c + "^", f))
        suivants = [version(x, f) for x in commits[k + 1:]]
        for s in sorted(ajoutes):
            if s.lower() in actuel or any(s not in v for v in suivants) or (nom, s) in vues:
                continue
            out.append((c[:7], s))
    return out


def main(fichiers):
    sys.stdout.reconfigure(encoding="utf-8")
    n = 0
    for f in fichiers:
        for c, s in manquantes(f):
            print(f"{f} ({c}) : {s[:160]}")
            n += 1
    if n:
        print(f"{n} retouche(s) de l'utilisateur disparue(s) : les reporter, ou dire lesquelles on abandonne et pourquoi.")
    sys.exit(1 if n else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
