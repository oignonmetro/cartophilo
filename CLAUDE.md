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
    situe tel texte clef, etc. Une œuvre s'y traite en unité-œuvre (voir
    plus bas). Chez Plotin, la piste est l'index des 54 traités : chaque
    entrée porte son résumé (`summary`) et, quand il est écrit, son cours,
    une unité classique de la piste (`unit`, lancée depuis la fiche du
    traité ; `traite1` à `traite41`, puis `traite45` à `traite50`, d'après les notices de l'édition GF).
  - **Textes** : une unité par texte étudié, qui fait savoir le citer
    (paragraphe par paragraphe, cartes-citation puis cartes-explication).
    Format et consignes dans `content/textes.md` ; pour en créer une,
    utiliser la skill `unite-texte` (`.claude/skills/unite-texte/`).
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
  `content/philosophie.md` à la lettre ; pour une unité de texte (piste
  Textes), `content/textes.md` en précise les écarts.
- Unité-œuvre (se repérer dans une œuvre entière : où se trouve chaque idée,
  fil rouge, relations entre chapitres) : localiser, associer, remettre dans
  l'ordre ; format et consignes dans `content/oeuvres.md`. On n'y écrit que
  le plan (`work`), jamais `lessons`. Les schémas qu'elle a eus un temps
  (plan dessiné, « Voir la carte », plan à trous) sont supprimés
  définitivement, code compris (2026-10-07) : ne pas les recréer.
- Tableau à trous : tout tableau `| … |` d'un rappel de leçon devient,
  juste après le rappel et avant les cartes, deux exercices (`tableExercises` dans
  `src/engine/exercises.ts`) : une colonne vidée à remplir depuis une banque
  (exception assumée à « pas de QCM ni d'association », parce que ce qu'on
  y replace est un ensemble fermé, pas une réponse paraphrasable), puis une
  seule case, à écrire ou à révéler. Chaque tableau est un élément de la
  révision espacée, d'identifiant tiré de sa leçon et de sa ligne d'en-tête
  (`lessonTables` dans `src/content/course.ts`) : changer l'en-tête d'un
  tableau en fait un nouvel élément, repris de zéro. Un tableau de
  structure (une colonne de repères, « 126a-128e », « II, 3 », rangée dans
  l'ordre du texte, voir `tableStructure`) devient un exercice de
  repérage : ses moments à remettre dans l'ordre, puis ses repères à
  replacer, puis un repère seul. Dans l'éditeur visuel (`/#/editeur`),
  l'onglet Tableaux les édite en grille, dit ce que chacun deviendra (et
  pourquoi un plan n'est pas reconnu) et en joue un aperçu ; il y fixe aussi,
  au besoin, les exercices de chaque tableau et leurs colonnes (`tables:`
  dans la leçon, voir `lessonTableSchema` et `content/philosophie.md`).
- Le moteur de vocabulaire (`kind: vocab`, plus aucun cours ne l'emploie
  depuis le retrait du cours `demo`) n'a plus d'écran de présentation à part (l'ancienne
  auto-évaluation « nouveau / incertain / je savais ») : un mot rencontre
  directement un vrai exercice.
- Remplissez systématiquement `example` sur chaque mot de vocabulaire : c'est
  ce qui permet la phrase à trou, l'exercice à privilégier maintenant que la
  première rencontre avec un mot se fait dans un exercice qui compte (voir
  `content/README.md`).
