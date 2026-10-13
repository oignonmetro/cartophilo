---
name: cours-traite
description: Écrit ou refond le cours d'un traité de Plotin (piste Repérage, unités traite1 à traite54) à partir du PDF de l'édition GF (traduction, notice, plan détaillé et notes explicatives de fin de traité) : analyse du raisonnement (question, thèse, paradoxe, rôle des chapitres, ce qui est démontré, posé ou illustré), questions à l'utilisateur sur ce que le PDF ne tranche pas, une leçon par mouvement du raisonnement, rappels qui explicitent le pourquoi de chaque thèse, cartes réécrites en conséquence, validation, commit et push. À utiliser dès qu'on demande d'« écrire le cours du traité N », de « refondre » ou « clarifier » un cours de traité, de « faire comme le traité 7 », ou quand un rappel de traité est jugé obscur.
---

# Écrire ou refondre le cours d'un traité de Plotin

Le cours d'un traité fait **comprendre comment Plotin raisonne** dans ce
traité. Il ne se contente pas d'énumérer des thèses : il dit pour chacune
pourquoi Plotin l'avance, ce qu'elle présuppose, s'il la démontre, la pose
ou l'illustre seulement, et comment elle conduit à la suivante. Le modèle
est `content/courses/plotin/units/traite7.yaml`, refondu ainsi le
2026-10-13 : le relire avant de commencer.

Règles de fond des cartes : `content/philosophie.md` (réponse unique,
autonomie de la carte, un seul `___`, pas d'`options` ni de `translation`).
Ne le rouvrir qu'en cas de doute précis.

## 0. Sources, par ordre de fiabilité

1. **La traduction GF** (dir. L. Brisson et J.-F. Pradeau), avec ses numéros
   de lignes : seule source des citations et des repères.
2. **Les notes explicatives de fin de traité, la notice et le plan détaillé**
   de la même édition : source principale de l'analyse.
3. **Les notes que l'utilisateur fournit** : précieuses pour les questions
   qu'elles posent, mais elles peuvent se tromper (au traité 7, un renvoi au
   traité 5 présenté comme « ultérieur ») ; les recouper avec 1 et 2.
4. **Ma propre connaissance de Plotin** : pour expliquer un raisonnement que
   le texte laisse implicite, jamais pour une citation ni un numéro de ligne.

Demander le PDF s'il n'est pas fourni. Sans lui, prévenir que les citations
et repères se limiteront à ceux déjà présents dans le dépôt.

### Lire le PDF

Comme pour `unite-texte` : `pdftotext -enc UTF-8 -layout`, et pour un scan,
depuis la racine du dépôt,
```bash
PYTHONUTF8=1 python .claude/skills/unite-texte/pdf_pages.py fichier.pdf "$TEMP/pages"
node .claude/skills/unite-texte/render_pages.cjs "$TEMP/pages"
```
puis lire les pages une à une. Repérer quatre parties : la **notice** (avant
le texte), le **plan détaillé**, la **traduction** (lignes dans la marge,
chapitres numérotés), les **notes** (à la fin du traité, appelées depuis la
traduction). Lire chaque note au moment où l'on lit le passage qui l'appelle.

## 1. Analyser avant d'écrire

Répondre par écrit, dans un fichier du dossier temporaire, aux questions
suivantes. Elles généralisent celles que l'utilisateur s'est posées pour le
traité 7. Chaque réponse porte sa source (« trad. 2, 27 », « note 14 »,
« notice », « mon analyse »).

**Le traité entier**
- À quelle question répond-il ? Qu'est-ce qu'il tient pour acquis sans le
  discuter ?
- Quelle thèse défend-il ?
- Quel paradoxe ou quelle difficulté affronte-t-il, et comment la résout-il ?
  Contre qui (Platon mal lu, Aristote, stoïciens, gnostiques,
  médioplatoniciens) ?
- Qu'est-ce qui l'amène ici : quel traité antérieur l'appelle, quel traité
  ultérieur le reprend (vérifier les numéros chronologiques dans l'index de
  `content/courses/plotin/course.yaml`) ?

**Le rôle des chapitres**
- Quel rôle joue chaque chapitre, ou groupe de chapitres, dans le
  raisonnement d'ensemble ? (Pour un long traité, regrouper par mouvement,
  d'après le plan détaillé.)

**Chaque thèse importante**
- Pourquoi Plotin l'avance-t-il ici : que lui permet-elle d'établir ensuite ?
- Est-elle **démontrée**, **posée** (axiome, présupposé, emprunt à Platon),
  **illustrée** seulement (image, analogie, exemple), ou **renvoyée** à un
  autre traité qui la démontre ?
- Si elle est démontrée, par quel type d'argument : antériorité du simple,
  réduction à l'absurde, analogie, autorité d'un texte de Platon, constat
  tiré de la nature, réfutation d'une objection ?
- Si elle est illustrée, que montre exactement l'image, et où s'arrête-t-elle
  (ce qu'il ne faut pas lui faire dire) ?

**Le bilan par chapitre**
- Qu'est-ce qui y est posé, qu'est-ce qui y est démontré, qu'est-ce qui y est
  illustré ?

**Les distinctions**
- Quels termes voisins le traité distingue-t-il (au traité 7 : intelligible,
  intellection, Intellect), et quelles relations entretiennent-ils ?

**L'articulation**
- Restituer les thèses dans l'ordre où elles s'enchaînent, avec les arguments
  réellement déployés pour chacune. C'est la colonne vertébrale du cours : le
  découpage en leçons en sort directement.
- Quels contresens guettent le lecteur ?

## 2. Poser ses questions à l'utilisateur

Après l'analyse et avant d'écrire, poser en une fois (`AskUserQuestion`,
quatre questions au plus par appel, une option recommandée en premier) ce
que le PDF ne tranche pas seul :

- un désaccord entre les notes de l'utilisateur et la GF, ou entre la notice
  et ma lecture ;
- un passage illisible ou douteux du scan (grec, chiffre de ligne) ;
- un débat d'interprétation où les notes GF prennent parti sans trancher
  pour tous, et dont dépend la manière d'écrire le rappel ;
- un choix de découpage défendable de plusieurs façons ;
- ce qui mérite d'être laissé de côté pour l'écrit de l'agrégation ;
- tout point où un regard extérieur améliorerait le cours.

Ne pas demander ce que le PDF résout. Si une question reste ouverte à la
fin, la reposer sous forme de question, jamais sous forme de remarque.

## 3. Découper en leçons

Une leçon par **mouvement du raisonnement**, dans l'ordre du texte, chacune
d'un écran au plus (au-delà, couper) :

- **Première leçon : la question.** Ce que le traité demande, ce qu'il tient
  pour acquis, d'où vient la question, les réponses possibles et celle que
  retient Plotin, la difficulté qu'elle crée, l'annonce du chemin suivi.
- **Puis une leçon par mouvement**, titrée par ce qu'elle établit et ses
  repères : « Pourquoi le Premier produit (1, 23-41) ».
- **Dernière leçon : le plan**, en tableau de structure (`Moment | Lieu |
  Ce qui s'y joue`, un repère par case dans la colonne Lieu, trois lignes au
  moins), précédé de deux ou trois phrases qui disent la progression.

En refonte, garder l'en-tête des tableaux qu'on conserve : changer
l'en-tête en ferait un nouvel élément de révision, repris de zéro.

## 4. Écrire les rappels

- **Le premier paragraphe est l'attaque** : l'app l'affiche plus grand. Il
  donne l'idée d'ensemble de la leçon en une ou deux phrases, pas le premier
  point de détail.
- **Un paragraphe par étape**, ouvert par une courte phrase en gras qui dit
  ce que l'étape établit (« Il est unique. », « L'obstacle qui reste : … »).
  Pas de numérotation : elle n'apporte rien.
- **Le pourquoi, toujours** : chaque thèse vient avec sa raison. « Il est
  simple » ne suffit pas ; « un composé dépend de ses éléments, qui seraient
  plus premiers que lui » explique. Des connecteurs entre les phrases et
  entre les paragraphes (donc, or, car, pour la même raison, en revanche,
  il reste à).
- **Le statut, dit en clair** : « Plotin ne démontre pas cette loi ; il la
  constate dans la nature », « c'est un principe posé, puis rendu concevable
  par un exemple », « affirmée ici, démontrée dans le traité 32 ».
- **Les présupposés nommés** : ce que le traité suppose sans le discuter.
- **Un pont vers la leçon suivante** quand une difficulté reste ouverte
  (« Reste à comprendre par quel mécanisme… »).
- **Les citations** viennent de la traduction GF, mot pour mot, entre `« »`,
  avec leurs lignes ; une citation reprise doit être le texte exact.
- **Forme** : grec translittéré entre backticks (`noêsis`) ; deux ou trois
  couleurs au plus, réservées à l'opposition qui structure la leçon (au
  traité 7 : l'Un qui demeure, l'Intellect qui naît) ; un tableau quand une
  notion se compare sur deux axes ; des puces seulement pour une énumération
  courte et parallèle ; un piège `! …` en fin.
- **Interdits** : point d'exclamation, tiret cadratin, italique dans un gras,
  référence à la matérialité de la source (« la notice dit que »).

## 5. Écrire les cartes

Après chaque rappel, ses cartes (trois au moins), dans l'ordre du rappel.
Elles font retenir **le raisonnement**, pas seulement le vocabulaire :

- un trou sur le mot pivot de chaque étape (la raison, pas seulement la
  conclusion : « composé, il dépendrait de ses ___ ») ;
- les citations décisives, trouées sur ce qui compte, avec leurs lignes ;
- les termes grecs (un point pour le terme) ;
- les renvois à d'autres traités (le numéro chronologique en réponse) ;
- les repères des moments principaux (leçon du plan surtout).

Chaque `sentence` dit pourquoi le point compte et tient seule, sans le
rappel ni les cartes voisines (« pour le traité N de Plotin, … »).

**Identifiants** : `traiteN-lK-qM` pour un cours écrit selon cette skill.
En refonte, une carte dont le contenu change reçoit un nouvel identifiant
(changer la lettre : `-p` devient `-q`, `-q` devient `-r`) : un ancien
identifiant ne doit jamais porter une carte devenue autre, sinon elle
hériterait d'un historique de révision qui n'est pas le sien. Le dire à
l'utilisateur : la progression sur ce traité repart de zéro.

## 6. Valider, vérifier, publier

1. `npm run content:check`, corriger jusqu'à « Contenu valide ».
2. `npm run content:build`, puis regarder le rendu : `#/fiches/traiteN` dans
   le navigateur intégré (serveur de dev sur le port 5173, déjà lancé ou via
   `preview_start`). Vérifier que les attaques se lisent comme l'idée de la
   leçon et que rien ne déborde.
3. **Un traité à la fois** : d'autres sessions travaillent peut-être sur
   d'autres traités. Ne toucher qu'au fichier de ce traité, et à son entrée
   de l'index (`summary`, `theses`), à aligner sur le nouveau
   cours ; ne jamais régénérer l'index ni d'autres cours.
4. Aligner l'entrée de l'index sur le nouveau cours : `summary` (attaque en
   gras, une puce par mouvement avec ses repères, une phrase de situation) et
   `theses` (trois au plus, courtes, propres à ce traité, puisque les
   exercices de repérage les associent à son titre et à son numéro).
5. Incrémenter `version:` dans `content/courses/plotin/course.yaml`, sans
   quoi les appareils ne reçoivent pas le changement.
6. Commit (message en français, « Plotin, traité N : … ») et push, sans
   demander.

## 7. Rendre compte

Un message court : le nouveau découpage (une ligne par leçon, avec ce
qu'elle établit), ce qui a changé dans les cartes (et la remise à zéro de la
progression), puis les points restés ouverts, **posés comme des questions**
(`AskUserQuestion`).
