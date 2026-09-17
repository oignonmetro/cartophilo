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

## Décidé : la correspondance technique avec le moteur de contenu

Toutes les pistes des quatre cours philosophiques utilisent `kind: grammar`
(jamais `vocab` ni `conjugation`) : rappel de cours puis phrase à trou, sans
`options` ni `translation` sur les points, ce qui exclut mécaniquement
l'association et le QCM. Voir `content/philosophie.md` pour le détail — ce
fichier adapte au format YAML de ce dépôt les principes de la skill
**quizlet-fiche-sep** (réponse unique non paraphrasable, six familles de
points, règles éditoriales, déroulé de rédaction) et prime sur toute autre
consigne de contenu ci-dessous pour les quatre cours philosophiques.

Ceci répond aussi à l'ancienne consigne « restreindre ou exclure
l'association et le QCM pour Glossaire et Repérage » : elle vaut désormais,
par construction du `kind` choisi, pour toutes les pistes philosophiques —
pas seulement Glossaire et Repérage.

## Consigne pour le contenu à écrire

- Contenu philosophique (Hors-programme, La vie, Plotin, Marx) : suivre
  `content/philosophie.md` à la lettre.
- Le moteur de vocabulaire (`kind: vocab`, cours `demo` uniquement
  désormais) n'a plus d'écran de présentation à part (l'ancienne
  auto-évaluation « nouveau / incertain / je savais ») : un mot rencontre
  directement un vrai exercice.
- Remplissez systématiquement `example` sur chaque mot de vocabulaire : c'est
  ce qui permet la phrase à trou, l'exercice à privilégier maintenant que la
  première rencontre avec un mot se fait dans un exercice qui compte (voir
  `content/README.md`).
