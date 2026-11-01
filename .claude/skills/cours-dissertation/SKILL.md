---
name: cours-dissertation
description: Écrit l'unité d'un sujet traité de la piste Sujets de La vie (une « unité-dissert ») à partir d'une dissertation rédigée fournie par l'utilisateur : une leçon pour l'introduction, une par moment du développement, une pour la conclusion avec le tableau des références dans l'ordre de la copie ; rappels et cartes qui font maîtriser les références et les exemples philosophiques de la copie et l'usage qu'elle en fait, en suivant sa progression, sans aucun contenu sur la méthode de la dissertation ; branchement dans sujets.yaml, validation, commit et push. À utiliser dès qu'on demande « un cours sur cette dissertation », de « traiter un sujet » à partir d'une copie, ou d'ajouter un sujet traité à la piste Sujets.
---

# Écrire l'unité d'un sujet traité (unité-dissert)

Une unité-dissert fait **maîtriser les références et les exemples
philosophiques d'une dissertation, et l'usage qu'elle en fait, dans l'ordre
de sa progression**. Elle sert à pouvoir les remobiliser au concours : qui dit
quoi, où, avec quels mots, et ce que cela établit à tel moment de
l'argument. Le reste suit `content/philosophie.md` (règle d'or, autonomie des
cartes, code couleur, `kind: grammar`, trois points au moins par leçon).

## Où elle va

- Piste **Sujets** de La vie (`content/courses/la-vie/course.yaml`, piste
  `sujets`) : **une unité par sujet**, rangée dans `units` de la piste.
- Dans `content/courses/la-vie/sujets.yaml`, l'intitulé devient
  `{ title: "…", unit: <id> }`. S'il n'y figure pas, l'ajouter dans le
  groupe de son type d'intitulé (question fermée, question ouverte, terme
  seul, couple, citation), près des sujets voisins.
- Fichier `content/courses/la-vie/units/<id>.yaml`, id tiré de l'intitulé
  (`vulnerabilite-vie`), leçons `<id>-l1`, `<id>-l2`… Monter `version` du
  cours. Modèle : `vulnerabilite-vie.yaml`.

## Découpage

1. **Introduction** : l'exemple d'ouverture, les définitions et
   distinctions, les deux thèses en conflit, le problème, le plan (tableau
   `Partie | Thèse | Auteurs`, des cases courtes).
2. **Une leçon par moment du développement** : en général, une par
   référence majeure ou par couple de références qui font une même étape,
   avec l'objection et sa réponse dans la leçon de l'étape qu'elles
   discutent. Titre : `I. Descartes : la montre rompue`.
3. **Conclusion** : le dénouement, la formule finale, l'ouverture, puis le
   tableau `Référence | Partie | Ce qu'elle établit`, une ligne par
   référence ou exemple dans l'ordre de la copie, réglé ainsi :

   ```yaml
     tables:
     - table: reference-partie-ce-qu-elle-etablit
       exercises:
       - {kind: order, column: Référence}
       - {kind: bank, column: Référence}
       - {kind: cell, column: Référence}
   ```

## Le rappel

Premier paragraphe : ce que l'étape établit dans la progression. Puis un
paragraphe par mouvement de la copie, ouvert par une courte phrase en gras :
la référence exposée (auteur, œuvre, repère, citation en `{teal}`), ce
qu'elle établit, et comment la copie s'en sert pour avancer (ce qu'elle
corrige de l'étape précédente, la question qu'elle laisse). Les
**exemples** de la copie (le cas d'ouverture, une expérience de pensée, un
exemple médical) s'exposent comme les références, et se signalent comme
étant de la copie quand on pourrait les croire de l'auteur cité.

Repères et citations : tels que la copie les donne ; les recouper sur les
œuvres de mémoire, et par une recherche en cas de doute (dates, noms,
citations). Une erreur trouvée se corrige et se note en commentaire YAML en
tête du fichier.

## Pas de contenu sur la méthode

L'unité porte sur les **idées**, jamais sur la façon dont la dissertation
est écrite. Ne jamais écrire, ni dans un rappel ni dans une carte ni dans un
piège :

- de remarque sur la rhétorique ou la construction de la copie : « cette
  accroche n'est pas un simple ornement », « l'exemple revient à chaque
  étape, savoir ce qu'il prouve c'est savoir le plan », « même exemple, deux
  raisons différentes » ;
- de remarque sur le rôle qu'une référence joue dans la copie plutôt que sur
  ce qu'elle dit : « X ne sert pas ici à… », « X n'est pas convoqué pour son
  éthique mais pour un argument », « relire n'est pas réfuter », « Améry ne
  réfute pas Nietzsche » ;
- de qualification de la forme d'un argument : « l'argument procède a
  contrario », « première branche du problème », « ce n'est qu'une fiction,
  elle ne prouve rien », « le rapprochement referme la boucle » ;
- d'étiquettes de méthode : « L'accroche », « Formule de l'étape », « Le mot
  qui relance ».

Restent permis, parce qu'ils situent dans la progression : « La première
partie montre que… », « Bilan de la deuxième partie », « Transition vers la
troisième partie : … », et un piège `! …` qui désamorce un contresens
**philosophique** (« Que la vie aille vers la mort ne prouve pas qu'elle y
tende »).

## Les cartes

Pour chaque référence :
- **attribution** : la thèse ou la citation, `answer` le nom de l'auteur ;
- **localisation** : l'œuvre, puis la partie, le chapitre, la proposition,
  l'article, un trou par repère (`II, 1`, `5 et 6`, `scolie`) ;
- **citation en cascade** : chaque mot clé d'une citation importante a sa
  carte, la citation entière répétée ;
- **usage** : une carte qui refait le pas de l'argument où la référence
  intervient, sans guillemets, le trou sur le mot qui le fait tenir (« Ce
  n'est pas l'activité comme telle qui rend vulnérable, c'est l'activité
  ___ ») ;
- **progression** : les thèses de chaque partie, la formule qui clôt chaque
  étape, les transitions, le dénouement.

Chaque `sentence` nomme le sujet ou la partie quand la carte ne tiendrait
pas seule (« La deuxième partie de la dissertation sur la vulnérabilité de la
vie montre que… »).

## Déroulé

1. Lire la copie entière ; repérer chaque référence, chaque exemple, chaque
   objection, et l'étape où il intervient. Pas de question à l'utilisateur
   avant sa relecture, sauf blocage réel.
2. Écrire l'unité d'un trait, leçon par leçon dans l'ordre de la copie.
3. Relire contre la section « Pas de contenu sur la méthode ».
4. Brancher (`course.yaml`, `sujets.yaml`), monter la version.
5. `npm run content:check`, puis `npm run content:tidy` si demandé.
6. Committer (« La vie, Sujets : … (version N) ») et pousser.
