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
  - **Glossaire** : notions centrales chez l'auteur, une leçon par entrée,
    reliées par des renvois ; pour en écrire une, utiliser la skill
    `glossaire` (`.claude/skills/glossaire/`) pour Plotin, `glossaire-marx`
    (`.claude/skills/glossaire-marx/`) pour Marx. Les définitions s'écrivent à
    part, dans `content/courses/<cours>/definitions.yaml` (une par entrée) :
    elles s'affichent au survol d'un renvoi, se citent dans un rappel par
    `[def]`, tiennent lieu de sous-titre, et nourrissent le **grand exercice
    de révision du glossaire** (bouton rond de l'onglet, `/glossaire-revision`),
    construit sur le modèle du repérage général des traités
    (`engine/treatises.ts`) : la notion à associer à sa définition et à son
    terme grec, par association, QCM puis écrit. Exception assumée à « pas
    de QCM ni d'association », comme pour les tableaux à trous : les
    définitions d'un glossaire forment un ensemble fermé.
  - **Idées** : thèses centrales chez l'auteur, en se concentrant sur les
    arguments déployés pour les défendre. Chez Marx, la piste s'ouvre sur le
    cours tiré de l'article « Karl Marx » de la SEP (`sep-marx1` à
    `sep-marx4`, groupées sous « Idées générales »), écrit avec la
    skill `cours-sep`, puis suit le cours magistral d'agrégation sur Marx
    (de l'aliénation des *Manuscrits de 1844* aux *Grundrisse*), d'après les
    transcriptions de ses séances : `ali1`, `ali2`… dans l'ordre des séances,
    sans mention du cours dans les titres, citations des *Manuscrits* en GF
    et des *Grundrisse* dans l'édition de l'utilisateur, repères du manuscrit
    de Marx. Deux unités-textes viendront ensuite sur les passages lus de
    suite (le travail aliéné ; le travail comme non-capital, III-9/10).
  - **Repérage** : se repérer dans les différentes œuvres, savoir où se
    situe tel texte clef, etc. Une œuvre s'y traite en unité-œuvre (voir
    plus bas). Chez Plotin, la piste est l'index des 54 traités : chaque
    entrée porte son résumé (`summary`) et, quand il est écrit, son cours,
    une unité classique de la piste (`unit`, lancée depuis la fiche du
    traité ; `traite1` à `traite54`, d'après les notices de l'édition GF).
    Pour écrire ou refondre le cours d'un traité, utiliser la skill
    `cours-traite` (`.claude/skills/cours-traite/`), modèle : `traite7`.
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
- **La vie** : les sous-onglets de Plotin et Marx (Idées, Textes), le
  Repérage s'y appelant **Œuvres** (unités-œuvres sur les œuvres classiques
  du thème), et, à la place du Glossaire, **Sujets** : la liste des sujets
  passés à consulter (`content/courses/la-vie/sujets.yaml`, rangés par type
  d'intitulé, avec une recherche), puis les sujets traités, une unité de la
  piste chacun, reliée à son intitulé par `unit` dans `sujets.yaml`, écrite
  à partir d'une dissertation avec la skill `cours-dissertation`
  (`.claude/skills/cours-dissertation/`), sans contenu sur la méthode de la
  copie. Le cours d'une œuvre d'un autre auteur
  que Plotin (leçons, rappels, cartes, comme les traités, à partir d'un
  notebook NotebookLM et du PDF de l'édition) s'écrit avec la skill
  `cours-oeuvre` (`.claude/skills/cours-oeuvre/`), qui reprend la méthode
  de `cours-traite`. Les cours tirés d'articles de la Stanford Encyclopedia
  of Philosophy sont rangés dans la piste **Idées** (l'ancienne piste SEP y a
  été fusionnée le 2026-11-06), un groupe par article, « … (SEP) »
  (`sep-vie…`, `sep-mort…`, `sep-camus…`, `sep-bio…`, `sep-psy…`,
  `sep-arbio…`), écrits avec la skill `cours-sep` (`.claude/skills/cours-sep/`),
  selon `content/philosophie.md`. La piste **Manuel** suit le manuel collectif
  sur la vie, un groupe par chapitre (titré par le sujet du chapitre, jamais
  par le nom de son auteur), à partir des scans océrisés qu'en donne
  l'utilisateur, selon le § « Un cours sur un auteur, tiré d'un commentaire »
  de `content/philosophie.md` et la conduite de `cours-sep` : d'abord
  l'introduction de Chaintreuil et Rouquayrol (`intro1` à `intro5`), puis
  « Vraie vie et modes de vie dans la philosophie antique » de Chapuis
  (`vies1` à `vies6`), et « De la biologie à l'éthique : Aristote et la
  vie » de Ribas (`arvie1` à `arvie4`).

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
  replacer, puis un repère seul. La banque y replace les moments (les repères
  restent affichés : une banque de numéros se range sans rien savoir, et un
  trou entre « 130a-e » et « 132a-b » se devine) ; le repère seul a ses
  voisins du dessus et du dessous cachés ; la remise en ordre ne montre
  aucune case qui porte elle-même un repère. Dans l'éditeur visuel (`/#/editeur`),
  un tableau s'y édite sur place, dans le rappel (case touchée, Entrée, Tab,
  poignées de ligne et de colonne : `EditableTable`) ; l'onglet Tableaux les
  édite aussi en grille, dit ce que chacun deviendra (et
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
