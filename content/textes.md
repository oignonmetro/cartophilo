# Écrire une unité de texte

Une unité de texte est consacrée à **un texte précis** (une note, un chapitre,
un traité) plutôt qu'à une notion ou à une thèse. Le texte y pèse beaucoup plus
lourd qu'ailleurs : une grande partie des cartes fait retrouver ses propres
mots, et l'apprentissage vise à **savoir le citer** (termes clefs, formules
clefs, phrases clefs quand il y en a).

Ces unités vivent dans la piste **Textes** de Marx et de Plotin. Pour le reste
(clarté de `sentence`, autonomie de chaque carte, règles éditoriales), les
principes de `content/philosophie.md` s'appliquent, avec les écarts décrits
ci-dessous.

## Le déroulé

Chaque unité suit le même schéma :

1. **Une introduction, facultative** (`intro` sur l'unité) : le contexte, les
   grandes idées. Elle s'affiche avant le premier paragraphe et en tête du texte
   intégral.
2. **Des leçons d'introduction, dès que le texte est difficile ou que la
   matière fournie le permet** (`<id>-i1`, `<id>-i2`…, `passage` avec
   `label: "Introduction"` et sans `text`) : un rappel qui donne le problème,
   les notions et les débats nécessaires pour comprendre le texte, puis des
   cartes-explication. On ne fait pas apprendre par cœur un texte qu'on ne
   comprend pas encore.
3. **Une leçon par paragraphe** (`§1`, `§2`…), dans l'ordre du texte. Chacune
   présente d'abord le paragraphe cité en entier, **suivi de son explication**
   (`notes` : ce que dit le paragraphe, comment il s'articule, les pièges),
   puis ses cartes, **jouées dans l'ordre écrit** (jamais mélangées) :
   - d'abord les **cartes-citation** : le fragment cité, avec un trou sur un
     terme, une formule ou une phrase clef ;
   - puis les **cartes-explication**, elles aussi à trou, qui font trouver une
     information centrale sur ce fragment (sa portée, ce qu'une image veut
     dire, le contresens à éviter).
4. **Une ouverture, facultative** : un court prolongement hors du texte (un
   autre texte de l'auteur, la postérité d'une formule), traité comme un
   paragraphe de plus, avec son propre texte et au moins une carte.

Un paragraphe peut être sauté s'il ne mérite pas d'être appris : ses voisins
gardent leur numéro (§2 puis §4).

## Le format

```yaml
id: n1841
title: Note sur les disciples de Hegel (1841)
subtitle: Thèse de doctorat, Ire partie, chapitre 4, note 2
intro: |-
  Le contexte du texte, ses grandes idées…
lessons:
- id: n1841-p1
  title: "Contre l'explication morale du système hégélien"   # intitulé du §
  passage:
    label: "§1"                    # repère affiché (« §1 », « Ouverture »)
    text: "C'est par pure ignorance que les disciples de Hegel…"   # le § en entier
  points:
  - id: n1841-p1-1
    fragment: "1/3"                # le paragraphe est cité en trois morceaux
    sentence: "« C'est par ___ que les disciples de Hegel… »"
    answer: "pure ignorance"
  - id: n1841-p1-2
    fragment: "1/3"
    sentence: "« … par ___ et autres choses semblables, en un mot : ___. … »"
    answer: "l'accommodement ; moralement"   # un trou, une réponse, dans l'ordre
  - id: n1841-p1-9                  # carte-explication : pas de `fragment`
    sentence: "Quand Marx dit que les disciples expliquent Hegel « en un mot : moralement », …"
    answer: "convenance"
```

- **`passage`** fait d'une leçon de grammaire une leçon de texte : c'est lui qui
  déclenche l'ordre gardé, l'en-tête de carte et le texte intégral.
  `passage.text` est le paragraphe tel qu'il est cité, sans guillemets autour ;
  une ligne vide y sépare deux alinéas.
- **`fragment`** (« 1/3 ») ne sert que lorsqu'un paragraphe est trop long pour
  tenir sur une carte et se cite en plusieurs morceaux. Il s'affiche en tête de
  carte (« §1 · 1/3 »), jamais dans `sentence`. Une carte-citation porte le
  fragment entier, entre `«…»`, même si elle n'en teste qu'un morceau.
- **Plusieurs trous par carte** sont permis ici, à la différence des autres
  leçons (voir `content/philosophie.md`) : `answer` donne leurs réponses dans
  l'ordre, séparées par `;`. Si le nombre de réponses ne correspond pas au
  nombre de trous, toute la réponse va dans le premier trou.
- **Choisir les trous avec pertinence** : le trou porte sur ce qu'il faudrait
  restituer en citant la phrase : d'abord sa thèse (« ___ est celle qui
  traduit la vertu qui reste » : « la vie la plus heureuse »), puis ce que le
  commentaire désigne comme décisif, fût-ce une modalité (« à titre
  secondaire », cœur du passage selon Bodéüs) ; jamais une remarque de
  méthode, un mot que le contexte fait deviner, ni deux fois la même idée.
  Règles détaillées dans la skill `unite-texte`.
- **Rappels** : jamais d'italique à l'intérieur d'un gras
  (`**L'*Éthique* dit…**`) ; l'analyseur ne sait pas les imbriquer et affiche
  les astérisques.
- **Pas de minimum de trois points** : une ouverture peut n'en avoir qu'un.
- **Pas de limite de longueur pour `answer`** : une carte-citation peut faire
  retrouver une phrase entière.

## Dans l'app

- La carte se joue au choix en **révélant la réponse puis en s'auto-évaluant**
  (par défaut, comme une flashcard), ou en **l'écrivant**. L'apprenant bascule
  sur la carte elle-même, et son choix vaut ensuite pour toutes. En mode écrit,
  une réponse jugée fausse peut être rattrapée par « J'avais bon ».
- **« Lire le texte »**, sur la carte de l'unité dans la bibliothèque, ouvre à
  tout moment l'introduction et tous les paragraphes à la suite.
- En révision, une carte revient seule, avec l'en-tête de son paragraphe.

## Ponctuation

Les tirets cadratins (—) sont gardés à l'intérieur des guillemets français,
parce qu'ils appartiennent au texte cité. Partout ailleurs, on les remplace
(virgule, deux-points, parenthèses). `npm run content:check` ne signale que
ceux qui sont hors citation.

## Dans l'éditeur visuel

L'éditeur (`npm run dev`, puis `/#/editeur`) sait créer une unité de texte à
la main, sans toucher au YAML.

« + Nouvelle unité » demande d'abord le genre de l'unité (classique ou de
texte), puis, dans le même formulaire, la référence, la présentation et le
repère de la première leçon (`§1`, `Introduction`…). Chaque leçon d'une unité
de texte gagne un onglet **Texte** : on y colle le paragraphe, puis on
sélectionne le morceau à faire retrouver et « Trouer dans sa phrase » (ou
« dans tout le paragraphe ») crée la carte-citation correspondante. Dans
l'onglet Exercices, chaque carte porte son genre (citation ou explication) et
son repère de fragment, et « Trier : citations d'abord » regroupe les
cartes-explication en fin de leçon.

Pour une longue liste déjà écrite (au format Quizlet décrit plus haut),
« ⇪ Importer une liste… » sous l'unité découpe la liste en leçons d'après les
préfixes `§n, Intitulé :`. Le découpage se retouche avant création : « ✂ Couper
ici » entre deux cartes, « Fusionner avec la précédente », repère et titre de
chaque leçon, texte du paragraphe reconstitué depuis les cartes-citation (deux
cartes qui ne redonnent pas le même texte sont signalées).
