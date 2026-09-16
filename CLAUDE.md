# Cartophilo, projet

PWA de révision (React + Zustand + Capacitor, contenu en YAML compilé vers
JSON, voir `content/README.md`), dupliquée depuis Cartolang (app de
vocabulaire) en conservant son moteur d'exercices et son interface : cartes,
association de paires, QCM, phrase à trou, saisie, rappel de cours, révision
espacée (SM-2), séries/XP.

## Objectif

Préparer l'écrit du concours de l'agrégation externe de philosophie 2027.

Épreuves du programme 2027 (à l'écrit) :
1. **Dissertation hors-programme** : tout peut tomber.
2. **Dissertation sur programme**, thème : « la vie ».
3. **Explication de texte**, sur un auteur, Plotin ou Marx.

## Structure de l'interface prévue

4 cours/grands-onglets, un par épreuve (3 épreuves, mais Plotin et Marx sont
deux cours distincts puisque l'explication de texte porte sur l'un ou
l'autre) :

- **Hors-programme**
- **La vie**
- **Plotin**
- **Marx**

Chaque cours a ses propres sous-onglets (pistes), adaptés à la nature de
l'épreuve :

- **Plotin** et **Marx** (explication de texte) : trois sous-onglets communs :
  - **Glossaire** : notions centrales chez l'auteur.
  - **Idées** : thèses centrales chez l'auteur, en se concentrant sur les
    arguments déployés pour les défendre.
  - **Repérage** : se repérer dans les différentes œuvres, savoir où se
    situe tel texte clef, etc.
- **Hors-programme**, un sous-onglet par domaine philosophique :
  - La morale
  - La métaphysique
  - L'esthétique
  - La politique
  - Les sciences humaines
  - L'épistémologie
- **La vie** : sous-onglets pas encore précisés.

## Non encore décidé

- Le détail des sous-onglets de « La vie ».
- La correspondance technique entre ces contenus philosophiques et les
  `kind` du moteur de contenu (`vocab` / `grammar` / `conjugation`,
  voir `content/README.md`) : reprendre ces trois `kind` tels quels par
  analogie (`vocab` pour le glossaire, etc.), ou en introduire de nouveaux
  adaptés (ex. un `kind` dédié au repérage dans une œuvre), à trancher au
  moment d'écrire le premier contenu réel.
- Le contenu réel de `content/courses/` reste à écrire ; seul le cours
  `demo` minimal (garde les trois types d'exercice) y existe pour l'instant.

## Consigne pour le contenu à écrire

- Pour les pistes **Glossaire** et **Repérage** (Plotin, Marx) : une fois leur
  `kind` technique tranché (voir ci-dessus), restreindre ou exclure les
  exercices d'association (matching pairs) et de QCM. Ces deux pistes visent
  une consultation ponctuelle (une notion, un repère), pas un enchaînement
  d'exercices construit autour d'un raisonnement suivi ; l'association et le
  QCM s'y prêtent moins bien que la phrase à trou ou la saisie.
- Le moteur de vocabulaire (`kind: vocab`) n'a plus d'écran de présentation à
  part (l'ancienne auto-évaluation « nouveau / incertain / je savais ») : un
  mot rencontre directement un vrai exercice. Cette suppression vaut pour
  toutes les pistes sauf peut-être Glossaire et Repérage, où une notion isolée
  (sans phrase, sans raisonnement suivi) pourrait avoir encore besoin d'un
  premier écran de simple présentation, à revoir une fois leur `kind`
  technique tranché.
- Remplissez systématiquement `example` sur chaque mot de vocabulaire : c'est
  ce qui permet la phrase à trou, l'exercice à privilégier maintenant que la
  première rencontre avec un mot se fait dans un exercice qui compte (voir
  `content/README.md`).
