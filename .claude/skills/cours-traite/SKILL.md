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
autonomie de la carte, un `___` sauf nécessité syntaxique, pas d'`options` ni de `translation`).
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

Les PDF de la GF sont rangés dans `C:\Users\Arthur\Traités Plotin`, un
volume par groupe de traités (texte sélectionnable : `pdftotext` suffit).
Demander le PDF s'il n'y est pas. Sans lui, prévenir que les citations et
repères se limiteront à ceux déjà présents dans le dépôt.

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

Les règles qui suivent viennent pour une bonne part des retouches que
l'utilisateur a faites à la main sur le traité 7 (commit 06b9901) : en cas
de doute, relire ce fichier, c'est l'exemple de référence.

### Le fil

- **Le premier paragraphe est l'attaque** : l'app l'affiche plus grand. Il
  donne l'idée d'ensemble de la leçon en une ou deux phrases, pas le premier
  point de détail.
- **Un paragraphe par étape**, ouvert par une courte phrase en gras qui dit
  ce que l'étape établit (« Il est unique. », « L'obstacle qui reste : … »).
  Pas de numérotation : elle n'apporte rien. Un argument et sa conséquence
  font deux paragraphes (« Il est simple », puis « Et parce qu'il ne dépend
  de rien, il ne manque de rien »).
- **Le pourquoi, toujours** : chaque thèse vient avec sa raison. « Il est
  simple » ne suffit pas ; « un composé dépend de ses éléments, qui seraient
  plus premiers que lui » explique. Des connecteurs entre les phrases et
  entre les paragraphes (donc, or, car, pour la même raison, en revanche,
  il reste à).
- **La raison qualifiée exactement** : dire de quelle nature elle est
  (« pour une raison éthique et logique »), plutôt qu'une étiquette d'école
  plaquée (« raisonnement par l'absurde ») qui en dit moins.
- **Le statut, dit en clair** : « Plotin ne démontre pas cette loi ; il la
  constate dans la nature », « c'est un principe posé, puis rendu concevable
  par un exemple », « affirmée ici, démontrée dans le traité 32 ».
- **Ne pas faire dire au texte plus qu'il ne dit.** Ne pas nommer ce qu'il
  n'a pas encore introduit : au chapitre 1 du traité 7, ce que le Premier
  produit est « le Second », « la chose la plus vénérable et la meilleure »
  après lui ; il ne devient l'Intellect qu'au chapitre 2. Ne pas grossir ce
  qui est établi : Plotin montre que l'Intellect vient *après* le Premier,
  pas qu'il vient *juste* après. Ces nuances font de bons pièges `!`.
- **Les présupposés nommés** : ce que le traité suppose sans le discuter.
- **Un pont vers la leçon suivante** quand une difficulté reste ouverte
  (« Reste à comprendre par quel mécanisme… »).
- **La citation qui porte l'argument** : après l'avoir reformulé, donner la
  phrase de la GF qui le dit, mot pour mot, entre `« »`, avec ses lignes.
- **Des termes exacts** : « le principe générateur » plutôt que « le
  principe » quand il s'agit de ce qui produit ; « pose ainsi la question »
  plutôt qu'une formule d'emphase (« en propres termes »).

### La mise en relief

Le rappel doit se lire d'un coup d'œil : la mise en relief y est abondante,
et chaque marque a une fonction.

- **Gras** (`**…**`) sur le contenu décisif, pas sur la formule qui
  l'introduit : « Il part d'une donnée qu'il ne discute pas : **il existe
  autre chose que l'Un.** » ; et sur les conclusions.
- **Souligné** (`__…__`) sur les propositions qui portent l'argument
  (prémisses, membres d'une alternative, ce qu'établit chaque chapitre).
  Gras et souligné se combinent pour l'intitulé d'une étape
  (`__**Il est {coral}simple{/coral}.**__`).
- **Couleurs** : le code fixe de `content/philosophie.md` (vert la thèse
  retenue, rouge le rejeté ou ce qui fait problème, violet les termes
  techniques, turquoise les citations, bleu ciel la structure, corail les
  propriétés établies et conclusions ; rose, ambre, jaune libres). Au traité
  7 : en rouge les intermédiaires et « reculer le problème », en violet
  « deux actes », « conversion », « dyade », en corail « simple »,
  « unique », « échappe au discours ».
- **Grec** translittéré entre backticks dans le rappel (`noêsis`).
- **Un tableau** quand une notion se compare sur deux axes. Ses exercices se
  choisissent au cas par cas (`tables:` dans la leçon, voir
  `content/philosophie.md`) plutôt que d'être laissés au tirage : au traité
  7, une banque sur la seule colonne qui compte pour le tableau de deux
  lignes, une banque par colonne pour celui des deux actes.
- **Puces** seulement pour une énumération courte et parallèle, sans
  point-virgule en fin d'item.
- **Pièges** `! …` en fin, autant que nécessaire : contresens à éviter,
  thèse affirmée sans être démontrée, nuance de ce qui est établi.
- **Interdits** : point d'exclamation, tiret cadratin, référence à la
  matérialité de la source (« la notice dit que »).

## 5. Écrire les cartes

Après chaque rappel, ses cartes (trois au moins), dans l'ordre du rappel.
Elles font retenir **le raisonnement**, et aussi ce que les notes de la GF
apportent de savant.

### Ce qu'on troue

- **La locution entière, pas un mot isolé** : « un autre point de départ »
  plutôt que « départ », « en lui-même », « avare de lui-même », « dyade
  indéfinie », « provient de la réalité ».
- **Le pivot de chaque étape**, la raison et pas seulement la conclusion
  (« composé, il dépendrait de ses ___ »).
- **Plusieurs trous**, à titre exceptionnel et seulement par nécessité
  syntaxique, quand deux termes coordonnés ne se trouent pas l'un sans
  l'autre (« la ___ qui refroidit et les ___ qui agissent », réponse
  « neige ; remèdes ») ; voir `content/philosophie.md`.
- **Les renvois** à un autre traité avec les deux numérotations en réponse
  (« 10 (V, 1) », `alt: ["10", "V, 1"]`).

### Les cartes-citation en cascade

Pour chaque phrase de la GF qui porte un argument, une série de cartes qui
répètent la citation entière, le trou se déplaçant d'un segment à l'autre,
plus une carte qui troue la proposition entière (« En chaque chose, il y a
___ »). Dans la citation, le gras et le souligné marquent ce qui la
structure (les termes répétés, les deux membres d'une opposition) et restent
les mêmes d'une carte à l'autre.

### Les cartes tirées des notes de la GF

Elles peuvent apprendre ce que le rappel ne dit pas, à condition de tenir
seules et sans en abuser : l'essentiel passe par le rappel. Y puiser :
- les **sources platoniciennes** que la note signale (le *Philèbe* et le Bien
  seul *hikanós*, 20b-c, 67a) ;
- les **termes grecs** que la traduction rend (« parfait » rend *téléon*,
  « d'emblée » rend *ḗdē*), en italique translittéré accentué dans les
  cartes ;
- l'**histoire d'une notion** (la dyade chez les successeurs de Platon, les
  monades) ;
- les **renvois à d'autres traités**, avec le titre de Porphyre et le numéro
  (traité 24 (V, 6), *Sur le fait que l'au-delà de l'Être ne pense pas…*) ;
- les **débats de commentateurs** et les **précautions** de Plotin (une
  activité noétique de l'Un ? « une sorte de », *hoion*) ;
- les **prolongements** dans des traités ultérieurs (l'*hupernóēsis* du
  traité 39).

Rattacher autant que possible le détail à la question du traité (« d'emblée »
répond aussi à la question initiale : l'Intellect perçoit immédiatement l'Un
sur le mode de la multiplicité).

**Vérifier chaque affirmation savante contre le texte.** Une note ou une
explication tierce peut contredire la traduction : au traité 7, des cartes
faisaient de la *katanóēsis* une compréhension « propre à l'Intellect »,
alors que 2, 15-19 la dit de l'Un, par analogie (« une sorte de »
perception de soi). Le texte l'emporte ; en cas de doute, demander.

### La phrase de la carte

- Elle dit pourquoi le point compte et tient seule, sans le rappel ni les
  cartes voisines ; une proposition causale (« car », « étant donné que »)
  donne la raison.
- Nommer le traité (et le chapitre) seulement quand c'est ce qu'il faut
  savoir ou que la thèse lui est propre ; sinon « Plotin » suffit, voire
  rien. Pas de formule fixe en tête de chaque carte.
- Repères : « (1, 10) » ou « le chapitre 1 du traité 7 (l. 10) », selon ce
  qui se lit le mieux.
- Une carte qui anticipe ce que le texte n'a pas encore établi (l'Intellect
  nommé au chapitre 1) se supprime ou se réécrit.

### Identifiants

`traiteN-lK-qM` pour un cours écrit selon cette skill ; les cartes ajoutées
à la main peuvent porter d'autres suffixes (`-pM`), seule compte l'unicité.
En refonte, une carte dont le contenu change reçoit un nouvel identifiant
(changer la lettre : `-p` devient `-q`, `-q` devient `-r`) : un ancien
identifiant ne doit jamais porter une carte devenue autre, sinon elle
hériterait d'un historique de révision qui n'est pas le sien. Le dire à
l'utilisateur : la progression sur ces cartes repart de zéro.

### Contrôles avant validation

Défauts relevés sur le traité 7, que `content:check` n'attrape pas tous :
- une carte sans `___` ou à réponse vide (bloquant) ;
- une espace en fin de réponse ;
- une marque fermée après une espace (`**hapax **chez`, `*est *revient`) :
  l'espace se met hors de la marque (`**hapax** chez`) ;
- un souligné collé à un trou (`__… ___ __`) : fermer le souligné avant le
  trou (`__…__ ___`) ;
- des guillemets français imbriqués : la citation intérieure prend les
  guillemets droits ;
- une phrase coupée par un saut de ligne.

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
