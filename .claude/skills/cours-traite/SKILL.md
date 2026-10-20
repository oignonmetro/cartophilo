---
name: cours-traite
description: Écrit ou refond le cours d'un traité de Plotin (piste Repérage, unités traite1 à traite54) à partir du PDF de l'édition GF (traduction, notice, plan détaillé et notes explicatives de fin de traité) : analyse du raisonnement (question, thèse, paradoxe, rôle des chapitres, ce qui est démontré, posé ou illustré), questions à l'utilisateur sur ce que le PDF ne tranche pas, une leçon par mouvement du raisonnement, rappels qui explicitent le pourquoi de chaque thèse, cartes (cascades de citations, cartes d'argument), puis passe de clarification qui développe ce qui reste abstrait, désamorce les contresens et déplie les arguments jusqu'à convaincre, validation, commit et push. À utiliser dès qu'on demande d'« écrire le cours du traité N », de « refondre » ou « clarifier » un cours de traité, de « faire comme le traité 7 », ou quand un rappel de traité est jugé obscur.
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

- **Première leçon : le plan**, en tableau de structure (`Mouvement | Lieu |
  Ce qui s'y joue`, un repère par case dans la colonne Lieu, trois lignes au
  moins), précédé de deux ou trois phrases qui disent la progression ; la
  première cite la question telle que Plotin la pose (« sommes-nous
  immortels ? »). On voit l'ensemble avant le détail (choix de l'utilisateur
  au traité 1). Modèle : `traite2.yaml` (retouches de l'utilisateur, commit
  e5dbe3f).
  - Une ligne par **mouvement argumentatif**, pas par chapitre : un plan de
    dix moments est trop long (traité 6, ramené à cinq mouvements).
  - « Mouvement » nomme ce que fait Plotin (« réfuter le matérialisme
    (épicuriens et stoïciens) », « écarter les fausses définitions
    incorporelles »).
  - « Ce qui s'y joue » énonce **la thèse établie avec sa raison** (« une
    réalité corporelle, étant divisible, passive et quantitative, est par
    nature incapable de générer la vie, la sensation ou la pensée »), non
    un simple thème.
  - Un traité de beaucoup de chapitres reçoit, en plus du plan global, une
    **leçon de sous-repérage avant chaque mouvement** qui en compte plusieurs
    (traité 2 : chap. 2-8³, 8⁴-8⁵, 9-12, 13-15), même forme de tableau. Un
    traité court (traité 6, huit chapitres) s'en tient au plan global.
  - Exercices (`tables:`) selon la longueur des cases : remise en ordre sur
    la colonne Lieu, puis, si les cases de « Ce qui s'y joue » sont courtes
    (60 caractères au plus) et bien distinctes, une banque sur cette
    colonne ; sinon, quelques cases seules sur la colonne Lieu.
- **Puis la question.** Ce que le traité demande, ce qu'il tient pour acquis,
  d'où vient la question, les réponses possibles et celle que retient
  Plotin, la difficulté qu'elle crée, l'annonce du chemin suivi.
- **Puis une leçon par mouvement**, titrée par ce qu'elle établit et ses
  repères : « Pourquoi le Premier produit (chap. 1, l. 23-41) ».

En refonte, garder l'en-tête des tableaux qu'on conserve : changer
l'en-tête en ferait un nouvel élément de révision, repris de zéro.

## 4. Écrire les rappels

Les règles qui suivent viennent des retouches que l'utilisateur a faites à
la main sur les traités 7 (commit 06b9901) et 1 (commit 76c3327) : en cas
de doute, relire ces deux fichiers, ce sont les exemples de référence.

### L'exigence d'ensemble : argumenter, convaincre, expliquer

Ce qui suit dit comment écrire ; la passe de clarification (§ 6) vérifie
ensuite, leçon par leçon, que c'est fait. Le défaut le plus grave des
premières versions était le ton de l'allusion,
au mieux de la description : on énonçait ce que dit Plotin sans montrer
pourquoi il a raison de le dire. Il faut présenter Plotin en « homme de
fer » : une pensée rendue **convaincante**, nuancée, mais d'abord **très
claire**, donc intéressante. Chaque thèse est défendue comme on défendrait
la sienne : par ses raisons, son principe, et ce qu'elle permet d'éviter.

- **Le principe sous l'argument.** Nommer le principe plotinien dont
  l'argument dépend, et prévenir le contresens qu'il évite, quitte à sortir
  du traité. Au traité 1 : ce n'est pas l'âme individuelle qui met en forme
  le sensible, mais la Nature et ses raisons séminales (traité 30) ; l'âme ne
  projette pas la forme, elle reconnaît une forme déjà maîtresse de la
  matière ; l'analogie de l'aveugle-né repose sur le principe de parenté
  (on ne connaît que ce à quoi on s'est rendu semblable).
- **La notion contre sa version naïve.** Quand la thèse reste abstraite, dire
  ce qu'elle n'est pas, en l'ancrant dans un débat concret : « la vertu
  véritable n'est pas un ensemble de règles comportementales ou
  d'ajustements sociaux, mais une purification de l'âme ».
- **Chaque image expliquée.** Qu'illustre-t-elle, et pourquoi cette image
  plutôt qu'une autre ? Développer l'image (le sanctuaire, les vêtements
  ôtés, la nudité devant le dieu) au lieu de la résumer d'un mot.
- **Citer plutôt que paraphraser.** Quand le texte dit la chose, le citer,
  mot pour mot, entre `« »`, puis expliquer. Une formule reprise (« devenir
  bonne et belle rend l'âme semblable au dieu ») prend ses guillemets. La
  paraphrase sans guillemets est à proscrire, et plus encore une phrase de
  la traduction reprise presque telle quelle sans guillemets (au traité 2,
  plusieurs ont échappé au premier jet) : c'est le défaut le plus
  dommageable, parce qu'on apprend alors comme analyse ce qui est le texte.
  Avant de valider, relire chaque rappel contre la traduction et mettre
  entre guillemets, corrigé mot pour mot, tout passage qui la suit de près.
- **Tous les arguments du chapitre.** Le premier jet n'en saute aucun, même
  secondaire : au traité 2, il manquait la difficulté des atomes sans
  parties, le dilemme du fluide et du solide pour la mémoire, la régression
  à l'infini des moteurs, le souffle incapable de garder sa propre unité.
- **Les dilemmes déployés.** Toute alternative s'écrit en liste, branche par
  branche : « Hypothèse 1 : … », puis « Réfutation de l'hypothèse 1 : … »,
  chaque branche dans sa couleur (vert, corail, rouge), puis la conclusion,
  dite explicitement. Les réponses possibles à une question se numérotent de
  même (a, b, c).
- **Des exemples concrets.** Partir de l'exemple de Plotin, en le signalant
  comme tel (« Plotin prend l'exemple de… », « selon l'exemple donné par
  Plotin… ») ; on peut y ajouter un exemple familier, même moderne, quand il
  rend l'argument tangible (au traité 2 : le golem et le tas de cailloux, la
  rose rouge et odorante, la chaîne dont aucun maillon ne « sait » ce que
  subit le premier), sans jamais le présenter comme venant de Plotin.
- **Pas d'analyse de l'argumentation pour elle-même.** Dire qu'une thèse est
  posée, démontrée ou illustrée n'a d'intérêt que si cela change sa portée
  (une thèse affirmée ici et démontrée ailleurs, une conclusion qui hésite).
  Ailleurs, ces remarques alourdissent, sont faussement analytiques et
  s'effacent (« le chapitre ne le démontre pas, il le décrit à partir de
  l'expérience » a été retiré au traité 1).

### Le fil

- **L'attaque situe le chapitre dans le traité.** Le premier paragraphe,
  affiché plus grand, dit la fonction du mouvement dans la progression
  d'ensemble (ouverture, basculement, sommet, conclusion), puis ce qu'il
  établit : « Le chapitre 6 opère le basculement fondamental du traité : il
  fait passer la recherche sur la beauté d'une simple interrogation
  esthétique à une exigence éthique et métaphysique de purification. »
- **Un paragraphe par étape**, ouvert par une courte phrase en gras qui dit
  ce que l'étape établit. Pas de numérotation. Un argument et sa conséquence
  font deux paragraphes.
- **Le pourquoi, toujours**, avec des connecteurs entre les phrases et entre
  les paragraphes (donc, or, car, pour la même raison, en revanche, il
  reste à).
- **La raison qualifiée exactement** (« pour une raison éthique et
  logique »), plutôt qu'une étiquette d'école plaquée.
- **Ne pas faire dire au texte plus qu'il ne dit.** Ne pas nommer ce qu'il
  n'a pas encore introduit (au chapitre 1 du traité 7, « le Second », pas
  encore l'Intellect) ; ne pas grossir ce qui est établi (l'Intellect vient
  *après* le Premier, pas *juste* après). Ces nuances font de bons pièges.
- **Les présupposés nommés**, quand le traité suppose sans discuter.
- **Un pont vers la leçon suivante** quand une difficulté reste ouverte.
- **Des termes exacts et des noms complets** : « le principe générateur »,
  « le *Doryphore* (dit le *Canon*) de Polyclète », « comme une règle permet
  de juger de ce qui est droit ».

### Les repères

- Une ligne ne se donne que si l'on en est **certain** : écrite dans la
  notice, le plan détaillé ou une note, ou fixée sans ambiguïté par une
  marque de la traduction (qui ne numérote que toutes les cinq lignes). Sinon,
  la sous-partie du plan qui contient le passage. Jamais une ligne déduite.
- Forme : **« (l. 25-29) »** dans le rappel d'une leçon qui ne porte que sur
  un chapitre ; **« (chap. 4, l. 25-29) »** dès qu'il y a ambiguïté : leçon
  sur plusieurs chapitres, titre de leçon.
- Dans les cartes : une leçon qui ne porte que sur un chapitre a déjà son
  chapitre dans son titre, ses cartes ne portent donc pas « (chap. N) »,
  seulement « (l. x-y) » quand la ligne compte. Les cartes d'une leçon sur
  plusieurs chapitres portent « (chap. z, l. x-y) ».

### La mise en relief

Le rappel doit se lire d'un coup d'œil : la mise en relief y est abondante,
et chaque marque a une fonction.

- **Gras** (`**…**`) sur le contenu décisif, pas sur la formule qui
  l'introduit, et sur les conclusions.
- **Souligné** (`__…__`) sur les propositions qui portent l'argument
  (prémisses, membres d'une alternative, ce qu'établit chaque chapitre).
  Gras et souligné se combinent pour l'intitulé d'une étape.
- **Couleurs** : le code fixe de `content/philosophie.md`. Vert la thèse
  retenue ; en face, rouge ce qui est rejeté ou fait problème, ou rose
  (libre, souvent en variante du rouge) pour l'autre pôle d'une opposition ;
  violet les termes techniques ; turquoise les citations ; bleu ciel la
  structure et les sources (« l'ascension du discours de Diotime », le
  *Phédon*) ; corail les propriétés établies et conclusions ; jaune les
  images et analogies (l'aveugle-né, l'œil sorti de la caverne) ; ambre
  libre. Les paires vert/rouge (ou vert/rose) opposent les deux pôles d'une
  même phrase : laideur et mélange / vertu et purification.
- **Grec** translittéré en *italique*, dans le rappel comme dans les cartes
  (*noêsis*, *ekplēxis*, *monos pros monon*) ; plus de backticks.
- **Un tableau** quand une notion se compare sur deux axes. Ses exercices se
  règlent (`tables:` dans la leçon) : une banque sur la colonne qui compte,
  et une case seule sur chaque ligne d'étiquette **quand l'étiquette tient
  en un mot qu'on ne peut pas formuler autrement** (c'est cette vertu et pas
  une autre, c'est « Ulysse »), jamais sur une formulation arbitraire.
- **Puces** seulement pour une énumération courte et parallèle, sans
  point-virgule en fin d'item.
- **Gras et souligné dans les cartes** aussi, et pas seulement dans les
  cartes-citation : gras sur les termes clés et les conclusions, souligné
  sur les prémisses.
- **Pièges** `! …` en fin : contresens à éviter, nuance de ce qui est
  établi ; pas de remarque d'analyse de l'argumentation pour elle-même.
- **Interdits** : point d'exclamation hors citation, tiret cadratin,
  référence à la matérialité de la source (« la notice dit que »).

## 5. Écrire les cartes

Après chaque rappel, ses cartes (trois au moins), dans l'ordre du rappel.
Elles font retenir **le raisonnement**, le **texte** et ce que les notes de
la GF apportent de savant. Le traité 1, après retouches, en compte près de
200 : c'est l'ordre de grandeur attendu.

### Les cartes-citation en cascade (le gros des cartes)

Pour **chaque passage clé** de la traduction (souvent un paragraphe entier,
pas une phrase), une série de cartes qui répètent le passage entier, le trou
se déplaçant d'un segment à l'autre, jusqu'à ce que chaque segment qui
compte ait été troué : souvent 4 à 15 cartes par passage. Y ajouter une ou
deux cartes qui trouent une proposition entière (« En chaque chose, il y a
___ »). Dans le passage, le gras marque les termes clés et le souligné les
membres qui structurent la phrase ; ces marques restent les mêmes d'une
carte à l'autre. Au traité 1 : 1, 44-48 ; 2, 18-23 ; 6, 13-15 ; 6, 21-27 ;
7, 1-12 ; 8, 6-13 ; 8, 22-27 ; 9, 7-15 ; 9, 15-22 ; 9, 22-24 ; 9, 33-36.

### Les cartes qui reconstruisent l'argument

Plusieurs phrases qui refont le raisonnement pas à pas, avec le trou sur son
pivot : « Le premier ressort de l'argument est ce que produit le défaut de
Forme : la laideur croît à mesure que la Forme est moins présente. Par
conséquent, la beauté croît avec sa présence. Autrement dit, la beauté varie
en fonction de la maîtrise de la ___ par la Forme. » Elles complètent les
cartes-citation : celles-ci font savoir le texte, celles-là le comprendre.
Elles sont sans guillemets puisqu'elles ne citent pas, peuvent tenir en
plusieurs phrases, et prennent la même mise en relief que le rappel (au
traité 2 : « Si l'âme était un corps, elle aurait besoin d'un autre ___ pour
la mettre en mouvement, et celui-ci d'un autre encore… »).

### Ce qu'on troue

- **L'élément qui rend la réponse la plus précise possible**, souvent le
  moins évident : « Diotime » plutôt que « *Banquet* », « maison » plutôt que
  « pierres », « *Doryphore* de Polyclète » en entier.
- **La locution entière, pas un mot isolé** : « un autre point de départ »,
  « en lui-même », « avare de lui-même », « provient de la réalité ».
- **Le pivot de chaque étape**, la raison et pas seulement la conclusion.
- **Le vocabulaire grec** des notions et des affects (*ekplēxis*, *thambos*,
  *aphaíresis*, *ópsis ḗdē génomenos*, *agōn eschatos*).
- **Plusieurs trous**, à titre exceptionnel et seulement par nécessité
  syntaxique (voir `content/philosophie.md`).
- **Les renvois** à un autre traité avec les deux numérotations en réponse
  (« 10 (V, 1) », `alt: ["10", "V, 1"]`).
- **Des variantes** (`alt`) pour ce qui se dit de deux façons sans
  différence de sens (« une seule et même beauté », « saint Augustin ») ;
  inutile pour les accents et les apostrophes, que la correction ignore.

### Les cartes tirées des notes de la GF

Elles peuvent apprendre ce que le rappel ne dit pas, à condition de tenir
seules et sans en abuser. Un rappel peut donc être allégé d'un détail
savant (un terme grec, une source platonicienne) pour rester lisible, tandis
que la carte qui l'apprend demeure (traité 2, chap. 2 : *epaktos*, le
*Philèbe*, le *logos*). Y puiser les sources platoniciennes, les termes
grecs que la traduction rend, l'histoire d'une notion, les renvois à d'autres
traités (titre de Porphyre et numéro), les débats de commentateurs et les
précautions de Plotin, les prolongements dans des traités ultérieurs ; et
rattacher le détail à la question du traité quand c'est possible.

**Avec NotebookLM.** Quand l'utilisateur le demande, lui poser les questions
du § 1 dans le notebook « Plotin » (navigateur intégré, l'utilisateur s'étant
connecté lui-même ; jamais Claude in Chrome, trop coûteux), en quatre ou cinq
envois groupés, et ne relire que la dernière réponse par un script. Ses
explications conceptuelles sont utiles, mais au traité 6 il a commis cinq
erreurs d'attribution que la GF corrigeait : une notion d'un autre traité
(l'« audace », *tolma*, du traité 10), deux images de chapitres voisins
confondues (la cité et le roi), une image tirée d'une note donnée pour le
texte (le miroir, du traité 46), un détail inversé (« moins profondément »),
un rapport de causalité renversé (corps et âme du monde). Tout ce qu'il dit
se recoupe donc avec la traduction et les notes avant d'entrer dans le cours.

**Vérifier chaque affirmation savante contre le texte.** Une note ou une
explication tierce peut contredire la traduction (au traité 7, la
*katanóēsis* donnée pour « propre à l'Intellect » alors que 2, 15-19 la dit
de l'Un, par analogie). Le texte l'emporte ; en cas de doute, demander. Les
citations que l'utilisateur colle depuis NotebookLM sont, elles, fiables.

### La phrase de la carte

- Elle dit pourquoi le point compte et tient seule, sans le rappel ni les
  cartes voisines ; une proposition causale (« car », « étant donné que »)
  donne la raison.
- Nommer le traité (et le chapitre) seulement quand c'est ce qu'il faut
  savoir ou que la thèse lui est propre ; sinon « Plotin » suffit, voire
  rien. Pas de formule fixe en tête de chaque carte.
- Repères : voir « Les repères » (pas de « (chap. N) » dans une leçon d'un
  seul chapitre).
- Une carte qui anticipe ce que le texte n'a pas encore établi se supprime
  ou se réécrit.

### Identifiants

`traiteN-lK-qM` pour un cours écrit selon cette skill ; les cartes ajoutées
à la main, et les cartes d'argument ajoutées après coup, portent `-pM`,
seule compte l'unicité.
En refonte, une carte dont le contenu change reçoit un nouvel identifiant
(changer la lettre : `-p` devient `-q`, `-q` devient `-r`) : un ancien
identifiant ne doit jamais porter une carte devenue autre, sinon elle
hériterait d'un historique de révision qui n'est pas le sien. Le dire à
l'utilisateur : la progression sur ces cartes repart de zéro.

### Contrôles avant validation

`npm run content:tidy -- content/courses/plotin/units/traiteN.yaml` corrige
seul ce qui se corrige sans jugement (marques fermées après une espace,
souligné collé à un trou, espaces en trop, apostrophes typographiques,
variantes en double) ; l'éditeur visuel fait de même à chaque
enregistrement. Restent à vérifier à la main, et `content:check` les
signale :
- une carte sans `___` ou à réponse vide (bloquant) ;
- un nombre de réponses différent du nombre de trous ;
- des guillemets français imbriqués : la citation intérieure prend les
  guillemets droits.

## 6. La passe de clarification (l'étape décisive)

Le premier jet, tiré de la notice, du plan et des notes, est exact mais
reste allusif : il dit ce que pense Plotin sans le faire comprendre. Au
traité 1, le gros des retouches manuelles de l'utilisateur ne portait ni sur
la forme ni sur l'exactitude, mais sur ce manque de clarté et d'effort pour
développer la pensée de Plotin et la rendre convaincante. C'est ce que cette
passe doit faire, avant toute validation.

**Reprendre chaque leçon, rappel et cartes, le texte de la traduction sous
les yeux**, et se poser pour chaque paragraphe et chaque carte trois
questions :

1. **Est-ce abstrait ?** Une formule comme « la Forme unifie le multiple »
   ou « l'âme reconnaît le beau par affinité » ne dit rien à qui ne la
   comprend pas déjà. La développer : ce qu'elle veut dire concrètement, sur
   l'exemple même du texte (la maison, la pierre, l'or), en le signalant
   comme exemple de Plotin, puis au besoin sur un exemple familier (voir
   § 4), et pourquoi Plotin peut le soutenir.
2. **Peut-on s'y tromper ?** Chercher le contresens que la formule permet, et
   le désamorcer en disant ce que la thèse n'est pas : l'âme ne « projette »
   pas la forme sur la matière, elle la reconnaît ; ce n'est pas l'âme
   individuelle qui met en forme le monde, mais la Nature ; la vertu
   n'est pas un ensemble de règles de conduite.
3. **Y a-t-il un argument ?** Alors le déplier jusqu'à convaincre : ses
   prémisses, le principe dont il dépend, l'enchaînement, la conclusion, et
   l'objection qu'un lecteur raisonnable ferait, avec sa réponse. Se demander
   honnêtement : « si je ne croyais pas Plotin, est-ce que ce paragraphe me
   ferait changer d'avis ? » Sinon, il manque une étape.

Exemple au traité 1 (chap. 2) : le premier jet disait que la Forme réunit les
parties et les amène à l'unité. La version retouchée reconstruit l'argument
en trois temps : la laideur croît à mesure que la Forme est moins présente,
donc la beauté croît avec sa présence ; or la Forme est une, et ce qu'elle
configure doit, pour lui ressembler, être unifié ; donc la laideur est le
défaut d'unité et la beauté l'unité obtenue. Chaque temps a sa carte.

Ce qui sort de cette passe va **dans le rappel** (un paragraphe qui
développe, un piège qui désamorce) **et dans les cartes** (des cartes qui
reconstruisent l'argument, voir § 5). La passe allonge le cours : c'est
voulu. Elle ne doit pas, en revanche, ajouter des remarques sur la structure
de l'argumentation (« posé », « démontré ») qui n'éclairent rien.

## 7. Valider, vérifier, publier

1. `npm run content:tidy -- <fichier>`, puis `npm run content:check`, et
   corriger jusqu'à « Contenu valide ».
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

## 8. Rendre compte

Un message court : le nouveau découpage (une ligne par leçon, avec ce
qu'elle établit), ce qui a changé dans les cartes (et la remise à zéro de la
progression), puis les points restés ouverts, **posés comme des questions**
(`AskUserQuestion`).
