---
name: glossaire-marx
description: Écrit une entrée du glossaire de Marx (piste Glossaire, unités g-… de content/courses/marx) : une notion, une sous-entrée ou une distinction, en une seule leçon (un rappel qui fait comprendre la notion, puis ses cartes), reliée aux entrées voisines par des renvois cliquables dans le rappel. Source : le notebook NotebookLM « Marx », dont on reprend les citations sans les vérifier sur un PDF, à condition qu'elles soient précisément sourcées ; signale à l'utilisateur toute œuvre qui manque au notebook. Passe de clarification, sans validation de l'utilisateur avant la version finale, branchement dans la piste, commit et push. À utiliser dès qu'on demande une « entrée du glossaire », une « fiche » sur une notion de Marx, ou d'« ajouter X au glossaire » de Marx.
---

# Écrire une entrée du glossaire de Marx

Copie adaptée de la skill `glossaire` (Plotin), dupliquée à la demande de
l'utilisateur (2026-11-04) : les deux évoluent séparément. Les exemples de
retouches et de relectures viennent du glossaire de Plotin, d'où ces règles
sont tirées : elles valent ici pour ce qu'elles enseignent, en transposant.

Une entrée du glossaire fait **comprendre une notion** de l'auteur : ce
qu'elle désigne, pourquoi il en a besoin, ce qu'elle n'est pas, et où il
l'établit. Elle tient en **une seule leçon** : un rappel, puis ses cartes.
Ce qui ne tient pas dans cette leçon ne se perd pas : il devient une autre
entrée, à laquelle le rappel renvoie par un lien. Le glossaire est donc un
réseau d'entrées courtes, non une suite de fiches longues.

Règles de fond des cartes : `content/philosophie.md`. Règles d'écriture des
rappels et des cartes (argumenter, citer plutôt que paraphraser, mise en
relief, cascades, ce qu'on troue, repères) : `cours-traite`, § 4 et 5
(`.claude/skills/cours-traite/SKILL.md`), qui valent ici telles quelles,
sauf ce que dit la présente skill (les citations et les repères de Plotin
n'y sont que des exemples). Les relire avant la première entrée d'une
session.

## 0. Sources

**Le notebook « Marx »** (Gemini Notebook, navigateur intégré :
https://notebook.google.com/notebook/fca9f7c7-bba5-4371-84d7-0d2a22462e25,
ouvert sur le compte de l'utilisateur) est la source de tout : lieux,
arguments, citations, repères. Il réunit, au 2026-11-05 (28 sources, que
l'utilisateur complète : relire la liste à chaque entrée), des textes de Marx
(*Manuscrits de 1844*, *Œuvres* III de la Pléiade, *Le Capital*, livre 1,
*Grundrisse*, *Contribution*, *Critique du programme de Gotha*, *Manifeste*)
et des études (*Le vocabulaire de Marx* de Renault, Fischbach, Haber,
Mercier-Josa…).

**Pas de vérification des citations sur un PDF** (consigne de l'utilisateur,
2026-11-04) : on fait confiance à NotebookLM, **à condition qu'il cite
précisément sa source**. Conséquences :

- une citation s'emploie seulement si la réponse donne l'œuvre, la section
  et le document du notebook d'où elle vient ; sinon, `relance` pour obtenir
  sa source, et sans source elle ne s'écrit pas ;
- une citation se reprend mot pour mot, telle que la donne NotebookLM, sans
  retraduction ni correction ;
- **la traduction peut varier** d'une réponse ou d'une étude à l'autre : ce
  n'est pas une raison de retirer une citation utile. Mais pour les textes
  dont on a le PDF des **Éditions sociales**, préférer leur traduction
  (consigne de l'utilisateur, 2026-11-05). `textes.py verifie <fichier.yaml>`
  dit, pour chaque citation du rappel et des cartes (trous compris), dans
  quelle édition on la retrouve ; `textes.py cherche "…"` montre le texte
  autour, pour reprendre une citation sur la traduction préférée. Les PDF sont
  dans `C:\Users\Arthur\Œuvres` : depuis le 2026-11-06, les Éditions sociales
  de toutes les œuvres utiles (*Manuscrits de 1844*, *L'Idéologie allemande*
  avec les *Thèses sur Feuerbach*, *Le Capital*, livre I, *Grundrisse*,
  *Contribution*, *Gotha*, *Manifeste*, et les *Écrits philosophiques* de
  Sève, d'où se citent les extraits du *Capital*, livre III), à côté des deux
  tomes de la Pléiade (*Œuvres* I et III, Rubel), qui ne servent qu'à défaut.
  Un volume ajouté se déclare dans `EDITIONS`, en tête du script. Une citation
  absente des PDF n'est pas fausse pour autant : l'OCR de certains volumes est
  fautif (*L'Idéologie allemande* : « ct » pour « et », mots brisés), et
  *Travail salarié et capital* n'y est qu'en Pléiade. Le lancer avant chaque
  publication, mais **sans être aussi strict que pour Plotin** (consigne de
  l'utilisateur, 2026-11-06) : une citation dans une autre traduction, ou que
  le script ne retrouve pas, reste telle quelle. Préférer l'édition des
  Éditions sociales quand elle est sous la main, et ne corriger que ce qui
  est faux (un mot ajouté ou changé qui altère le sens, un sujet substitué :
  « l'animal » pour « il ») ;
- ce que dit un commentateur ne s'attribue jamais à Marx : si l'idée vient
  d'une étude et non d'un texte de Marx, le rappel appuie la thèse sur Marx
  ou nomme le commentateur.

**Œuvre manquante : la signaler à l'utilisateur** (même consigne). Dès qu'une
réponse s'appuie sur une œuvre de Marx qui n'est pas dans le notebook, ou ne
la connaît que par la citation qu'en fait une étude, ou dit ne pas pouvoir
répondre faute du texte :
`python -I $N manquante g-x "œuvre" "ce qu'on en voulait"`. La rédaction
continue : pour une œuvre qu'on n'a ni dans le notebook ni en PDF, on fait
confiance aux commentateurs et aux spécialistes qui la citent (consigne de
l'utilisateur, 2026-11-06), et la citation de seconde main s'emploie comme
une autre, avec son repère chez Marx et le nom du commentateur (« cité par
Fischbach »), sans chercher à la vérifier ; le compte rendu final donne la liste (`manquantes`), pour que
l'utilisateur ajoute le texte au notebook s'il le souhaite. Le dire aussi
sans attendre, en une ligne, dans le message en cours.

**La consigne de source et de longueur est dans « Configurer le chat » du
notebook** (depuis le 2026-11-06) : « Réponds en 250 mots au plus par partie,
sans introduction ni récapitulatif. Pour toute citation, donne le texte exact
entre guillemets, l'œuvre de Marx, la section et le document du notebook
d'où elle vient ; si elle vient d'une étude et non du texte de Marx, dis-le
et nomme l'étude. Si un texte de Marx nécessaire manque au notebook,
dis-le. » On ne la répète donc plus dans les questions : `question` ne
l'ajoute plus (`BREF` vide dans `notebook.py`). L'utilisateur peut la poser aussi dans
les paramètres du notebook s'il y a accès ; le 2026-11-04, depuis le navigateur
intégré, le menu de configuration ne proposait que la suppression de
l'historique. Le texte à y mettre :

```
Tu réponds en français à un agrégatif de philosophie. Pour toute citation, donne entre guillemets le texte exact, sans le reformuler, puis l'œuvre de Marx, la section (partie, chapitre, titre) et le document du notebook d'où elle est tirée. Si la citation de Marx vient d'une étude et non du texte de Marx lui-même, dis-le et nomme cette étude. Distingue toujours ce que Marx écrit de ce qu'en disent ses commentateurs. Si un texte de Marx nécessaire à la réponse n'est pas dans le notebook, dis-le explicitement. N'invente jamais de citation.
```

**Repères** : l'œuvre et sa section (partie, chapitre, titre de section),
jamais la pagination ni l'édition, conformément aux unités de texte.

## 1. Les trois sortes d'entrées

- **Notion** : un terme de l'auteur (Vie, Âme, Conversion). Le rappel la
  définit par sa fonction, donne ses lieux principaux et renvoie aux entrées
  qui la prolongent.
- **Sous-entrée** : un sens ou un emploi de la notion qui demande son propre
  rappel (Vie parfaite, Multiplicité intelligible). Elle se comprend seule,
  mais son rappel renvoie à l'entrée générale dès la première phrase.
- **Distinction** : une entrée qui présente une division comme telle (Vie
  métaphysique / psychique / somatique ; intelligible, intellection,
  Intellect). Son rappel expose le critère de la division, puis les pôles
  dans un tableau, et renvoie à chaque pôle qui a sa propre entrée. C'est
  une entrée à part entière, avec ses cartes, qui portent sur le critère et
  sur ce qui sépare les pôles.

Avant d'écrire, lire les titres des entrées existantes et leurs définitions
(`grep -h "^title:" content/courses/<cours>/units/g-*.yaml`, et
`content/courses/<cours>/definitions.yaml`) :
la notion a peut-être déjà une entrée, ou une entrée voisine qui doit
recevoir un renvoi vers la nouvelle.

## 2. Analyser, puis interroger NotebookLM

Écrire dans un fichier du dossier temporaire, avec la source de chaque
réponse (« V, 1, 8 », « note 14 », « NotebookLM, recoupé », « mon
analyse ») :

- Quel problème la notion résout-elle chez l'auteur ? Sans elle, qu'est-ce
  qui ne tiendrait pas ?
- Le terme allemand et sa traduction ; les variantes de traduction qui
  égarent (*Entfremdung*, *Entäußerung*, rendus tous deux par « aliénation »).
- Les lieux décisifs : deux à quatre passages où la notion est établie ou
  définie, pas une liste d'occurrences.
- Ses sens ou ses emplois distincts, et les distinctions qu'elle commande.
- Les contresens qui la guettent (le sens courant du mot français, le sens
  qu'elle a chez Platon, Aristote ou les stoïciens).
- **Le partage** : ce qui entre dans cette leçon, et ce qui devient une
  autre entrée (sous-entrée, distinction, notion voisine), vers laquelle on
  renverra.
- **L'angle propre, avant le plan** (autocritique du 2026-11-06) : relire
  les intitulés d'étape et les passages clefs des entrées déjà publiées, et
  écrire en une phrase ce que celle-ci établit qu'aucune autre n'établit.
  Les entrées sur la vie (Activité vitale, Être naturel, Besoin, Expression
  de la vie, Vie matérielle, Survie, Vie accomplie) partagent le même noyau
  de 1844 : Être naturel, Besoin et Expression de la vie citaient toutes la
  faim et les « objets réels, sensibles », Expression de la vie redisait le
  salarié d'Activité vitale. Une thèse déjà établie ailleurs ne s'y
  redémontre pas : une phrase et un renvoi. Ses passages ne font pas de
  nouvelles cartes. Mieux vaut une entrée plus courte.
- **Les citations retraduites** : une citation que NotebookLM tire d'une
  étude en anglais (Shambaugh…) est sa propre traduction, non celle d'une
  édition ; elle ne s'emploie pas entre guillemets. Chercher une étude
  française qui la cite (« donne le texte exact tel que cette étude
  l'imprime »), sinon paraphraser en nommant l'étude (cas des *Notes sur
  James Mill*, 2026-11-06). Une citation de commentateur (Wittmann, Hess
  cité par Wittmann) ne prend pas le teal, réservé à Marx.

### La procédure NotebookLM est pilotée par `notebook.py`

Pour Végétatif et Bien-être (2026-10-25), j'ai résumé la procédure au lieu
de la suivre : une seule question énorme par entrée, aucune relance, le plan
arrêté avant les questions. Les réponses étaient survolées, et les entrées
ont gardé des thèses non démontrées. Depuis, **la procédure ne se suit plus
de mémoire : `notebook.py` donne les questions une à une, garde le journal
des réponses, et refuse la publication tant qu'il manque une étape** (le
crochet de commit de `.claude/settings.json` l'appelle sur toute entrée
ajoutée ou dotée d'un journal). Une refonte d'entrée existante commence
elle aussi par `debut` : le crochet refuse de réécrire d'un `Write` une
entrée sans journal, et de committer une entrée sans journal dont les
intitulés d'étape changent (sauf commit des retouches de l'utilisateur,
dont le message dit « retouche ») ; une correction ponctuelle passe par
`Edit`. Publier par
`sh .claude/skills/glossaire-marx/publier.sh "message" fichiers…` (version,
`content:check`, commit, push) ; une définition s'ajoute par
`python -I .claude/skills/glossaire-marx/adddef.py g-x "définition"`.

```
N=".claude/skills/glossaire-marx/notebook.py"
python -I $N debut g-x "terme sans article" --allemand terme --voisines "a, b" --effets "c, d" [--couvert "notions voisines déjà traitées"]
python -I $N question g-x          # la prochaine question, à coller telle quelle
python -I $N reponse g-x <qid> <fichier>   # la réponse, copiée dans un fichier
python -I $N image g-x "formule ou image de Marx"
python -I $N relance g-x "ce que je ne comprends pas"
python -I $N juge g-x <qid> clair | obscur "ce qui reste obscur"
python -I $N plan g-x "thèse 1" "thèse 2" …   # fixé, après A à C
python -I $N valide g-x "raison" [thèses corrigées…]   # corriger un plan fixé
python -I $N manque g-x <fichier yaml>      # après rédaction
python -I $N signale g-x "point obscur"     # un point signalé par l'utilisateur
python -I $N derive g-y g-x "demande" "thèse"  # entrée faite d'étapes sorties de g-x
python -I $N verifie g-x <fichier yaml>     # avant publication
python -I $N etat g-x                        # où en est l'entrée
python -I $N lecons                          # les relectures passées
python -I $N manquante g-x "œuvre" "besoin"  # une œuvre qui manque au notebook
python -I $N manquantes                      # la liste, pour le compte rendu
```

**Règles d'envoi.** Le notebook est celui de Marx : inutile de nommer
l'auteur dans la question (« comment Marx… ? », « pourquoi Marx… ? »
restent naturels). Une question par message ; attendre la fin de la
réponse (d'après la durée moyenne mesurée, non en interrogeant la page
toutes les deux secondes) ; ne relire que la dernière. Une réponse longue peut
tarder, et la page montrer un moment la réponse précédente sans signaler d'attente :
comparer au dernier texte reçu et attendre, sans recharger la page, ce qui fait
perdre la réponse en cours (2026-11-05). L'historique de la
discussion s'efface en commençant une entrée, par l'utilisateur (c'est une
suppression définitive, que je ne fais pas moi-même).

**L'historique, à surveiller** (consigne de l'utilisateur, 2026-11-06) :
- **avant la première question d'une entrée**, compter les messages de la
  page (`document.querySelectorAll('chat-message').length`, 0 quand la
  discussion est vide) ; s'il en reste, **le signaler à l'utilisateur** et lui
  demander de supprimer la discussion (menu ⋮, « Supprimer l'historique des
  discussions ») avant de poser quoi que ce soit ;
- **dès que NotebookLM redonne sa réponse précédente** sous une nouvelle
  question (le défaut apparaît quand la discussion s'allonge : quatre fois sur
  trois entrées le 2026-11-06), s'arrêter et faire supprimer la discussion par
  l'utilisateur, au lieu de reposer la question. Les journaux gardent tout ;
  on reprend à la question en attente, et l'entrée en cours repart de la
  discussion vide (la question de ce qui manque ne s'appuie plus alors que
  sur ce qui suit la suppression : la reposer en rappelant en une phrase les
  thèses du plan).

Quand l'utilisateur demande d'enchaîner les entrées tant que NotebookLM le
permet, passer à l'entrée suivante de sa liste après chaque publication ;
s'arrêter à la limite d'usage (« Chat désactivé jusqu'à … ») en disant où l'on
en est.

**Économie (choix de l'utilisateur, 2026-10-26, après Végétatif : 19
questions avant le plan, des réponses de 8 000 caractères qui recitaient
toutes les quatre mêmes passages, lues puis recopiées en entier)** :
- la longueur (« 250 mots au plus ») est fixée dans « Configurer le chat » ;
  `question` ajoute d'office la liste des passages déjà donnés, à ne pas
  reprendre ;
- le journal garde des **notes**, pas des transcriptions : pour chaque
  réponse, ses thèses, ses prémisses, ses citations avec leur source, et une
  ligne `Passage : œuvre, section` par passage (`question` les relit pour
  dire à NotebookLM de ne pas les redonner) ;
- les questions élémentaires vont en deux messages à réponse en tableau
  court (`B-statut`, `B-portee`) ; `debut … --couvert "…"` nomme les notions
  voisines déjà traitées dans le glossaire, que NotebookLM ne doit pas
  redévelopper. NotebookLM ne connaît pas le glossaire : dans tout message
  qu'on lui envoie, nommer ces notions elles-mêmes, jamais « les autres
  entrées » ni « l'entrée sur X » (remarque de l'utilisateur, 2026-11-06). Les difficultés, les thèses, les
  images et les relances restent une par message : c'est là que la
  division importe.

**Les phases, dans l'ordre imposé par le programme.**

- *A. Repérage* : les lieux décisifs ; les emplois distincts.
- *B. Questions élémentaires*, en deux messages (statut, puis portée), chacune précise :
  - **nature** : qu'est-ce (une activité, un rapport social, un processus,
    une forme, une représentation, une essence) ? à quoi le voit-on chez Marx ?
  - **place** : à quel niveau de l'analyse (l'homme et son rapport à la
    nature, les rapports de production, l'État et le droit, les
    représentations) se situe-t-elle, et pourquoi à celui-là ?
  - **origine** : de quelles conditions historiques dépend-elle, de qui Marx
    reprend-il le concept (Hegel, Feuerbach, Hess, l'économie classique), et
    comment le transforme-t-il ?
  - **démarcation** : en quoi se distingue-t-elle des notions voisines
    (`--voisines`), et pourquoi Marx ne les confond-il pas ?
  - **extension** : à quelles sociétés, quels groupes ou quels êtres
    vaut-elle, auxquels non, et pourquoi dans chaque cas ?
  - **fonction** : quel rôle joue-t-elle dans le système, et qu'est-ce qui
    ne tiendrait plus sans elle ?
  - **mécanisme** : comment produit-elle ce qu'on lui attribue
    (`--effets`), étape par étape ?
  - **images** : pour chaque épithète ou image de Marx (`image`), ce
    qu'elle dit littéralement, terme à terme, et pourquoi Marx la choisit.
- *C. Difficultés* : les thèses contre-intuitives ou paradoxales, et la
  raison qu'en donne Marx ; les points qui supposent d'autres thèses (critique
  de Hegel, être générique, conception matérialiste de l'histoire, valeur), avec la
  thèse présupposée ; les objections que Marx se fait ou réfute et ses réponses ;
  les contresens courants. Chaque point difficile relevé devient une
  `relance`.
- *Pas de point d'étape* (consigne de l'utilisateur, 2026-10-31, qui
  remplace celle du 2026-10-26) : ne lui faire valider ni plan ni rien
  d'autre en amont, car c'est en lisant la version finale qu'il voit ce
  qui manque ou n'est pas clair. Après A à C et leurs relances, `plan`
  fixe les thèses d'étape tirées des réponses et ouvre la phase D ;
  `valide` ne sert plus qu'à corriger un plan fixé. L'entrée s'écrit et se
  publie d'un trait ; le compte rendu final dit les choix faits.
- *D. Plan* : chaque thèse devient une
  question : comment Marx l'établit-il, prémisse par prémisse, avec le
  passage de chacune et ce qu'il faut savoir du système pour suivre ?
- *E. Relances et jugement* : chaque réponse de la phase D et chaque
  relance se juge (`juge`). « Obscur » si je ne saurais pas la rendre
  convaincante, sans trou, à quelqu'un qui ne croit pas Marx : le
  programme en tire une relance (« je ne comprends pas pourquoi … :
  explique pas à pas le raisonnement, sans sauter d'étape »), jusqu'à
  « clair ». L'exemple de Marx aide, mais c'est le raisonnement qu'on
  demande.
- *F. Ce qui manque* : après rédaction, `manque` pose la question en
  s'appuyant sur la conversation, que NotebookLM garde en mémoire : « d'après
  notre conversation sur X, qu'est-ce qui n'a pas été abordé ? ». **Ne
  jamais lui faire relire la fiche**, ni en entier ni étape par étape, ni
  lui en recopier la liste des étapes et des passages : c'est trop long et
  trop coûteux (consigne de l'utilisateur, 2026-10-31). D'où une condition :
  l'historique ne s'efface qu'au début d'une entrée, jamais entre ses
  questions et `manque`.
- *G. Les points obscurs, par la relecture de l'utilisateur* (choix de
  l'utilisateur, 2026-10-26, pour économiser) : je publie, il relit, et
  chaque point qu'il signale comme obscur ou mal justifié passe par
  `signale g-x "le point"`. Le programme en fait une relance auprès de
  NotebookLM (« je ne comprends pas pourquoi… »), garde la critique dans
  `relectures.json`, et refuse la publication suivante tant que la relance
  n'a pas sa réponse jugée claire. Je ne corrige jamais un point signalé de
  mémoire : la correction vient de l'argument de Marx rapporté par
  NotebookLM, avec sa source.

`verifie` refuse la publication si une question est sans réponse, une
thèse ou une relance n'est pas jugée claire, le plan n'a pas l'accord de
l'utilisateur, une étape du rappel n'est pas une thèse du plan, le rappel
contient une paraphrase qui affirme sans démontrer (« Autrement dit ») ou
une étape sans connecteur de raison, ou si un point signalé par
l'utilisateur n'a pas été relancé et éclairci.

**Les relectures de l'utilisateur** s'enregistrent (`notebook.py
relecture g-x "critique"`) et `lecons` les rassemble : les relire avant
chaque entrée, avec ce qui suit.

Ce que les sources ne tranchent pas, en particulier **le partage** quand
il est discutable (une sous-entrée pour tel sens, une entrée de
distinction pour telle division ?), je le tranche moi-même, sans poser de
question avant l'écriture (consigne du 2026-10-31), et je dis mon choix
dans le compte rendu final.

## 3. Écrire le rappel

**Les retouches de l'utilisateur ne se perdent pas** (2026-10-25 : en
réécrivant Végétatif et Bien-être d'un seul `Write`, j'avais effacé ses
mises en relief ; d'autres, sur Animé / Inerte et Santé, avaient sauté à des
corrections antérieures). Réécrire une entrée, c'est partir du fichier tel
qu'il est, retouches comprises : relire d'abord ses dernières retouches
(`git log --grep=retouche -- <fichier>`, puis `git show`), et les reporter
sur le nouveau texte (une phrase reformulée garde son souligné, son gras,
sa couleur, sur les mots qui portent la même idée). Corriger par
remplacements ciblés plutôt que par réécriture du fichier entier.
`retouches.py <fichiers>` signale toute mise en relief ajoutée par
l'utilisateur qui a disparu ; `publier.sh` refuse de publier tant qu'il en
signale. Une retouche impossible à reporter (sa phrase a disparu, à la
demande de l'utilisateur) s'inscrit dans `retouches_abandonnees.json` avec
sa raison, et se dit à l'utilisateur dans le compte rendu.


Une leçon, un rappel, qui tient sur un écran ou un peu plus. S'il déborde,
c'est qu'il traite deux notions : en sortir une, qui deviendra une entrée,
et la remplacer par un renvoi.

- **La définition s'écrit à part**, dans `content/courses/<cours>/definitions.yaml`,
  sous l'identifiant de l'entrée : `g-temps: 'la {green}vie de l'âme{/green} qui, …'`.
  C'est un **attribut** qui complète « la notion est … » : sans majuscule ni
  point final, qui tient seul (aucun « ce qui suit »), de 200 caractères
  environ au plus. Elle dit ce que la notion fait, pas une définition de
  dictionnaire. Elle sert quatre fois : la bulle d'un renvoi vers l'entrée,
  au survol (« Temps : la vie de l'âme… ») ; l'en-tête du rappel ; le
  sous-titre de l'entrée dans la liste (l'entrée n'a plus de `subtitle:`) ;
  le grand exercice de révision du glossaire, qui la fait associer à sa
  notion et à son terme grec (QCM, association, écrit). Elle peut porter
  couleurs et renvois ; ils sont retirés dans la bulle et l'exercice.
- **L'en-tête du rappel cite la définition par `[def]`**, sans la recopier :
  « Chez Marx, l'{violet}**aliénation**{/violet} (*Entfremdung*) est [def]. »
  (`[def:g-autre]` cite celle d'une autre entrée). La conception écartée,
  en rose, vient juste après, dans une phrase à elle : « Il n'est
  {pink}ni le mouvement des astres ni la mesure de ce mouvement{/pink}. »
  Une définition partagée par deux formules de l'en-tête ne s'y écrit
  qu'une fois : la corriger dans `definitions.yaml` la corrige partout.
- **L'attaque n'est pas en gras d'un bout à l'autre** : on y colore les seuls
  mots qui portent l'idée. Le nom de la notion en violet et gras
  (`{violet}**vie**{/violet}`), la conception naïve écartée en rose, la
  thèse retenue en vert, sur les mots décisifs seulement (`{green}activité{/green}`,
  `{green}réalités incorporelles{/green}`), pas sur toute la proposition
  (retouche de l'utilisateur sur l'entrée Vie, 2026-10-21).
- **L'intitulé d'une étape énonce la thèse avec la précision qui la rend
  exacte** : « Il faut un principe incorporel qui ait la vie par
  lui-même », plutôt que « un principe » tout court.
- **Le problème qu'elle résout**, puis **ses lieux décisifs**, chacun cité
  (mot pour mot, entre `« »`, tel que le donne NotebookLM) et expliqué.
- **Les œuvres se donnent en clair**, titre en italique, puis la section :
  « (*Manuscrits de 1844*, premier manuscrit, Le travail aliéné) ». Il n'y a
  pas de renvoi vers une œuvre (`[[…]]` ne vise que les entrées du glossaire).
- **Pas de redite de l'œuvre** : dans un paragraphe où l'œuvre vient d'être
  nommée, le repère suivant donne la section seule, ou « (*ibid*.) ». Les
  tableaux (passages clefs) gardent le titre entier : ce sont des cases à
  replacer.
- **Les citations de Marx prennent le teal** (retouche de l'utilisateur sur
  Activité vitale, 2026-11-04 ; écart avec le glossaire de Plotin) : **chaque
  guillemet** en teal et, dans la citation, **les mots clefs** en teal, les mots
  de liaison restant nus :
  `{teal}« {/teal}la {teal}seule liberté possible{/teal} est que {teal}l'homme social{/teal}, les producteurs associés {teal}__règlent rationnellement__ leurs échanges avec la nature »{/teal}`.
  Le guillemet s'attache au mot clef voisin (`{teal}« l'homme{/teal}`,
  `{teal}libre »{/teal}`) ou se colore seul (`{teal}« {/teal}`, `{teal} »{/teal}`).
  Une hypothèse réfutée dans la citation reste en rouge, guillemets en teal.
  **On y souligne aussi la partie décisive**, celle qui porte l'idée, sur une
  proposition ou un groupe de mots, jamais sur toute la citation.
- **Les noms propres autres que Marx sont en bleu** (`{sky}…{/sky}`), parce que
  ce sont des références : `{sky}Moses Hess{/sky}`, `{sky}Karl Grün{/sky}`,
  `{sky}Feuerbach{/sky}`, `{sky}Denis Collin{/sky}`. Même règle pour les
  commentateurs (même retouche).
- **Dans le fil, comme sur la même retouche** : `amber` sur la prémisse ou
  l'élément d'une définition (`{amber}un vivant ne subsiste pas comme une chose
  déjà là{/amber}`), `coral` sur l'argument et la conclusion, `yellow` sur l'exemple, `red` sur
  ce que Marx dénonce (`{red}capitalisme{/red}`), `pink` sur l'autre membre d'une
  opposition. Dans la définition aussi : `{amber}ce qu'un vivant fait pour
  vivre{/amber}`, les pôles soulignés (`l'__animal__`, `l'__homme__`).
- **Chaque paragraphe développe un aspect essentiel de la notion de l'entrée**
  (relecture d'Activité vitale, 2026-11-04). Avant d'écrire une étape, puis en
  relisant : dit-elle quelque chose *de cette notion*, ou glisse-t-elle vers une
  notion voisine ? La dernière étape portait sur le lieu de la liberté dans le
  *Capital*, et non sur la vie. Deux issues : la réécrire pour qu'on y voie
  vraiment l'analyse de la notion (en relançant NotebookLM sur ce point), ou la
  déplacer dans une nouvelle entrée qui lui corresponde, à compléter plus tard.
- **Les termes techniques allemands en violet**, en plus de l'italique :
  `{violet}*Gattungswesen*{/violet}`.
- **Ce qu'elle n'est pas** : le contresens principal, désamorcé dans le fil
  du rappel ou par un piège `! …` en fin. **Un piège ne répète pas un
  paragraphe** : si une étape du rappel dit déjà que l'Un est au-dessus de
  la vie, le piège « l'Un n'est pas la vie première » est en trop. Les
  pièges sont réservés aux contresens que le fil ne désamorce pas lui-même.
- **Les renvois** (§ 4) là où le rappel touche une notion qui a, ou aura,
  son entrée.
- **Citer des phrases qui se tiennent.** Une citation tronquée qui ne se lit
  plus seule (« … et qu'elle a une signification… ») se coupe en deux
  citations entières plutôt que de garder un « […] ».
- **Pas de guillemets autour d'un intitulé** (« vie végétative, sensitive,
  psychique » écrit comme une étiquette) : les guillemets sont réservés au
  texte de Marx.
- Mise en relief, couleurs, allemand en italique, tableaux, interdits : comme
  `cours-traite` § 4, sauf pour les citations (pas de turquoise, voir plus
  haut).

**Chaque thèse vient avec son pourquoi** (relecture de l'utilisateur sur
Vie, Degrés de vie, Vie parfaite, Bonheur et Temps, 2026-10-23). C'est la
faute la plus fréquente des premiers jets : énoncer la thèse, la citer, et
passer.

- **Une étape démontre la thèse de son intitulé, droit à l'argument**
  (relecture du 2026-10-25). Elle ne commence pas par une objection ou un
  contexte qui retardent la preuve, et elle ne s'achève pas sur une
  paraphrase (« Autrement dit : … ») qui affirme ce qu'il fallait montrer.
  Le test : relire l'intitulé, puis se demander « pourquoi ? » ; l'étape
  doit y répondre par des prémisses, chacune posée ou citée, et un
  « donc ». Une citation qui énonce la conclusion (« le bien-être est
  l'affaire du vivant ») n'en est pas la preuve ; une phrase comme « ce
  qui nourrit doit vouloir nourrir » non plus, si rien ne dit pourquoi.
  Quand une étape s'appuie sur une thèse posée plus haut (« le bien relève
  du jugement »), elle la rattache explicitement, ou l'ordre des étapes
  change pour que la prémisse vienne d'abord.
- **Un repère par citation**, et « (*ibid*.) » pour une citation tirée du
  même passage que la précédente (retouche de Tripartition, 2026-10-25),
  plutôt que « (même chapitre) » ou rien.
- **Une thèse surprenante s'accompagne de l'argument de Marx**, en
  quelques mots, cité : « toute vie est une intellection » demande pourquoi
  (parce que toute vie est une raison à l'œuvre, et qu'une raison est un
  contenu pensé), « le temps est une vie » aussi (parce qu'il est l'image
  de l'éternité, qui est une vie), « l'homme heureux est cette vie » aussi
  (parce que sans intellect il ne serait pas un homme). Si l'argument est
  long, une phrase et un renvoi vers l'entrée qui le déploie.
- **Devancer les questions que l'étudiant se posera**, pour que les cartes
  ne les laissent pas ouvertes : *pourquoi X plutôt que Y ?* (pourquoi
  parler de clarté plutôt que de présence ou d'absence de pensée : parce
  que Plotin refuse ce partage, traité 30, chap. 8) ; *pourquoi pas
  l'inverse ?* (pourquoi le temps est la vie de l'âme et non un cadre où
  l'âme vivrait) ; *en quoi cette solution vaut-elle mieux que celles
  qu'elle écarte ?* ; *cela vaut-il pour nous, ici-bas ?* (la vie parfaite).
  Une étape dont l'intitulé pose la question (« Pourquoi la clarté, et non
  la présence ou l'absence de pensée ») est souvent la bonne forme.
- **Une explication ne se paie pas de mots** : « chaque vie est une raison,
  une forme active, et toute forme est pensée » enchaîne trois thèses sans
  en justifier aucune. Défaire chaque maillon, ou n'en garder qu'un, expliqué.
- **Un piège `! …` se comprend seul et dit ce qui en suit** : « "état"
  traduit *bios* » ne sert à rien sans la conséquence (l'âme garde une
  seule vie, *zôê*, dont le contenu, *bios*, change, et ce changement est
  le temps).
- **Toute entrée qui repose sur plusieurs lieux a ses Passages clefs**
  (micro-section ci-dessous), sous-entrées comprises : leur absence a été
  relevée sur Vie parfaite et Bonheur.

**Couleurs et mise en relief, d'après les retouches de l'utilisateur**
(2026-10-23) :

- les couleurs disent le **rôle logique**, chacune toujours le même, selon
  le code de `content/philosophie.md` (harmonisé le 2026-11-05) :
  {green}la thèse retenue{/green} ; {red}la thèse adverse ou l'hypothèse
  réfutée{/red} (« pour les {sky}stoïciens{/sky}, l'âme est un
  {red}souffle physique{/red} »), en rouge ou en rose, qui ont la même
  valeur ({pink}la conception naïve écartée{/pink} se met volontiers en
  rose) ; {coral}l'argument{/coral}, la raison qui justifie comme ce qui
  est établi (« le temps n'est pas le mouvement, car {coral}les mouvements
  sont eux-mêmes dans le temps{/coral} ») ; {amber}ce qui est central ou
  fait comprendre un point difficile{/amber}, les éléments d'une
  définition, la prémisse, l'articulation, la question en vedette ;
  {yellow}l'exemple, l'image, l'analogie{/yellow} ; {sky}les autres
  auteurs{/sky} et les sources (une thèse empruntée : le nom en sky, le
  contenu dans sa couleur logique) ;
- dans l'intitulé d'une étape, la notion en jeu en violet :
  `__**Le temps n'est ni le**__ {violet}__**mouvement**__{/violet} __**ni quelque chose du mouvement.**__` ;
- l'italique d'insistance, dans un intitulé ou une phrase, sur le mot qui
  porte la thèse : « L'homme heureux *est* cette vie » ;
- le gras sur les termes que la suite emploie comme des notions
  (**pensée**, **révolution du ciel**, **vie parfaite**).

**Écriture, d'après les mêmes retouches** :

- les **connecteurs** qui montrent le raisonnement : « Elle n'est *donc*
  pas d'abord… », « *De surcroît*, si la cause de la vie était vivante… »,
  « *En reprenant* le *Sophiste*, Plotin soutient que… » ;
- la **précision qui rend la phrase exacte** : « les sens du *mot* « vie » »
  et non « les sens de la vie », « d'un *autre vivant* » et non « d'un
  autre », « le degré le plus haut *de vie* » ;
- un **tableau** ne garde que des colonnes qui valent un exercice : la
  colonne « Mots qui le signalent » de Vie a été retirée ;
- **l'exemple avant le tableau** qu'il éclaire (le dormeur des Degrés de
  vie avant l'échelle) ;
- l'**autre nom** usuel de la notion dans l'en-tête, entre guillemets : le
  vivant ou « animal » (*zôion*).

**Ajouts de la relecture du 2026-10-23 (Bonheur, Temps, Vie parfaite, Vie)** :

- **L'intitulé d'une étape énonce la thèse entière**, sujet compris :
  « Le bonheur est une disposition, non un sentiment », « Le bonheur ne
  réside pas dans la durée », « L'avantage de la définition du temps comme
  vie », plutôt que « Une disposition, non un sentiment ». La thèse
  écartée peut y prendre sa couleur : `__**Le bonheur n'est pas**__ {red}__**un bien ajouté à la vie**__{/red}`.
- **Le gras sur le maillon décisif du raisonnement**, dans le fil :
  « Parce que **l'intellect n'est pas un bien qu'on pourrait avoir ou ne
  pas avoir en restant le même** ».
- **Une définition se juge à ce qu'elle démarque.** L'utilisateur a relevé
  que l'entrée Vie ne permettait pas de séparer l'animé de l'inerte, ce
  qu'on attend d'une définition de la vie. Quand une notion appelle un
  critère de démarcation que son rappel ne donne pas, en faire une entrée
  de distinction (« Animé / Inerte ») et y renvoyer.
- **Le sens propre de Marx face aux questions d'aujourd'hui.** Quand un
  mot (bonheur) n'a pas chez Marx le sens qu'on lui donne couramment,
  le dire dans un piège, et renvoyer aux entrées qui traiteront les
  questions courantes (bien-être, sens de la vie, souffrance, joie et
  tristesse). Ces entrées peuvent rester vides un temps (`lessons: []`),
  sur demande de l'utilisateur : un renvoi vers une entrée vide est
  accepté par `content:check`, la bulle n'affiche alors rien.
- **Une liste dans un rappel** : `- étiquette : …` donne une étiquette en
  gras coloré ; l'employer pour énumérer les niveaux d'un critère (« Le
  mouvement : … », « Le bien : … », « La forme : … »).

**Une entrée générale (notion) donne une vue d'ensemble, pas le détail de
ses sous-entrées** (leçon de l'entrée Vie, 2026-10-21) :

- **L'échelle d'abord, du haut vers le bas**, quand la notion se dit à
  plusieurs rangs de réalité (l'Un, l'Intellect, l'Âme, les corps) : une
  étape par rang, puis un tableau « Rang | … » qui la résume.
- **Ce qu'une sous-entrée ou une distinction développe ne se répète pas
  dans l'entrée générale** : une phrase et un renvoi suffisent. Sinon les
  mêmes citations y reviennent, et les mêmes cartes, que la révision fait
  alors réviser deux fois.
- **Ce qui relève d'une autre notion en sort** : au premier jet, « Vie
  véritable » portait deux étapes sur le bonheur, devenues l'entrée Bonheur.
  Ne pas hésiter à créer l'entrée voisine plutôt que de la loger dans une
  autre : le temps a sa propre entrée, il ne se traite ni dans Vie ni dans
  une future Éternité, qui méritent chacune un traitement spécifique
  (consigne de l'utilisateur, 2026-10-21).
- **Citer la proposition décisive, pas le paragraphe** : le rappel qui
  aligne deux ou trois longues citations par étape se lit comme un pavé.
  La citation complète va aux cartes en cascade.
- **Le titre et son terme allemand disent la même chose** : « Être générique
  (`Gattungswesen`) ». Un terme allemand que les sources ne donnent pas ne
  s'écrit pas.
- **L'échelle** devient, chez Marx, la période quand l'emploi d'une notion
  change des écrits de jeunesse au *Capital* : le dire, sans confondre les
  deux états de la pensée.

**Deux micro-sections closent le rappel** :

- **Passages clefs**, pour une notion, après les étapes : un tableau
  « Passage | Ce qu'il établit », une ligne par lieu décisif. Le régler
  dans `tables:` (banque sur « Ce qu'il établit », case seule sur
  « Passage ») : sans réglage, une colonne de repères rangée par numéro
  serait prise pour un plan à remettre dans l'ordre. **Sa forme** : une
  ligne par lieu décisif, une case courte et distincte (« *Manuscrits de 1844*, premier
  manuscrit | … »), au plus huit lignes. La forme à
  phrases entières et chapitres regroupés, essayée sur Bien-être et
  Végétatif, a été abandonnée par l'utilisateur (2026-10-26) : il est revenu
  à la case courte. Écrire « et », jamais « & », que l'éditeur visuel
  enregistre en « &amp; ».
- **Voir aussi**, en toute dernière ligne de chaque entrée :
  `**Voir aussi** : [[g-degres-de-vie|Degrés de vie]] · [[g-ame|Âme]] · …`,
  les entrées voisines par ordre d'importance, séparées par « · ».

## 4. Les renvois

Un renvoi fait d'un terme du rappel un lien vers une autre entrée du
glossaire :

```
la [[g-vie-parfaite|vie parfaite]] est celle de l'Intellect
```

`[[identifiant|texte affiché]]`, dans `notes` seulement (jamais dans
`sentence` ni `explanation`). Le texte affiché est celui que la phrase
demande ; il peut porter une couleur ou un gras à l'extérieur des crochets
(`{violet}[[g-ame|l'Âme]]{/violet}`).

- **Renvoyer au premier emploi** d'une notion dans le rappel, pas à chaque
  occurrence ; la ligne « Voir aussi » les reprend toutes, c'est voulu.
- **Une entrée générale renvoie à ses sous-entrées et à ses distinctions** ;
  une sous-entrée renvoie à son entrée générale dès l'attaque ; une
  distinction renvoie à chacun de ses pôles qui a son entrée.
- **Une cible doit exister.** Une entrée qui serait une bonne piste, et qu'on
  n'écrit pas maintenant, se **crée vide** (`lessons: []`, sans définition) et
  reçoit le renvoi : ne pas hésiter à le faire (consigne de l'utilisateur,
  2026-11-05). Le fichier porte seulement `id`, `title` (avec le terme allemand
  si les sources le donnent), `icon`, `color` et un commentaire qui la dit à
  rédiger ; son identifiant s'ajoute à la piste. Le compte rendu (§ 7) dit
  lesquelles on a créées.
- **Ajouter le renvoi inverse** quand il manque : écrire une sous-entrée,
  c'est aussi ajouter, dans le rappel de l'entrée générale, le renvoi vers
  elle (modification minimale de l'autre fichier, sans le refondre).
- **Le texte affiché est littéral** : pas de gras ni d'italique entre les
  crochets, la mise en relief se met autour.
- **Le lien porte le nom, pas l'article** : `l'{violet}[[g-ame|âme]]{/violet}`
  ou `{violet}l'[[g-ame|âme]]{/violet}`, jamais l'article à la fois dehors et
  dedans (« l'l'âme »).

Dans l'application, le renvoi est souligné en pointillé et ouvre sa cible
dans une feuille, par-dessus l'écran en cours, sans quitter la leçon
(`NoteRefSheet`). Au survol de la souris, une bulle donne la définition de
l'entrée (`definitions.yaml`, à défaut la première phrase du rappel).
L'éditeur visuel garde le
renvoi tel quel. `content:check` refuse un renvoi dont la cible n'est pas
une unité du cours, et signale un renvoi glissé dans une carte.

## 5. Écrire les cartes

Trois au moins (contrainte du moteur), d'ordinaire dix à vingt-cinq, dans
l'ordre du rappel. Règles de `cours-traite` § 5. Pour une entrée, elles
portent en priorité sur :

- **le terme** : la notion française d'après sa description, et le terme
  allemand (deux cartes séparées, voir `content/philosophie.md`) ;
- **le problème qu'elle résout**, en carte d'argument dont le trou est le
  pivot ;
- **les citations des lieux décisifs**, en cascade pour le passage principal ;
- **les repères** de ces lieux (l'œuvre, puis sa section : la réponse admet
  ses formes usuelles par `alt`) ;
- **le contresens** : ce que la notion n'est pas, troué sur le terme qui
  fait la différence ;
- pour une distinction, **le critère** et **chaque pôle**, le tableau se
  réglant comme dans `cours-traite` § 4.

Une carte ne renvoie pas à une autre entrée : elle tient seule, et dit en
quelques mots ce dont elle a besoin d'une notion voisine.

**Au moins un tiers de cartes d'argument, et aucune carte devinable**
(autocritique du 2026-11-06, à la demande de l'utilisateur). Les entrées
Besoin et Expression de la vie n'avaient que trois ou quatre cartes sur
vingt-cinq hors citation : elles faisaient apprendre la lettre des textes,
pas l'argument. Une carte d'argument troue la raison ou la distinction (« le
capital comprime les besoins de l'ouvrier, qui sont un coût ; mais pour ___
la survaleur, il doit vendre »). Une carte n'a pas sa réponse ailleurs dans
la phrase (« la vie qui détermine la ___ », réponse *conscience*), ni une
réponse qu'un mot-outil suffit à trouver (« l'expression de ___ vie »,
réponse *ta*). `verifie` refuse la réponse écrite dans la phrase et le
manque de cartes d'argument ; il ne voit pas la réponse qui se devine par
le sens (« richesse et ___ de l'économie politique », *misère*) ni la carte
sans enjeu : c'est au relecteur de les relever (premières relectures,
2026-11-06 : six à dix cartes de ce genre par entrée).

## 6. Fichier, identifiants, branchement

```yaml
# Entrée du glossaire de Marx (skill glossaire-marx) : <sorte d'entrée>,
# citations reprises de NotebookLM avec leur source (<lieux>).

id: g-etre-generique
title: Être générique (`Gattungswesen`)
icon: book
color: coral
lessons:
- id: g-etre-generique-l1
  title: <le titre de l'entrée, ou ce que la leçon établit>
  notes: |-
    …
  points:
  - id: g-etre-generique-l1-q1
    …
```

- Identifiant `g-` suivi du nom français sans accents, en tirets
  (`g-vie-parfaite`, `g-multiplicite-sensible`). Cartes `…-l1-qN`.
- Titre « Notion (`terme allemand`) » ; une distinction s'intitule par ses pôles
  ou par son nom usuel (« Trois vies »). Le grand exercice lit la notion et
  le terme allemand dans ce titre : un terme porté par deux entrées
  ne leur est pas demandé ; pour lui donner un
  autre terme, ou à une entrée qui n'en a pas dans son titre, écrire la
  définition sous la forme `g-x: { def: '…', grec: '…' }` (la clef reste `grec`, elle porte ici le
  terme allemand).
- Pas de `subtitle:` : la définition en tient lieu (si une entrée en porte
  un, il l'emporte sur la définition dans la liste).
- Ajouter la définition à `definitions.yaml` en même temps que l'entrée ;
  `content:check` signale une entrée écrite qui n'en a pas.
- `group:` réunit sous un même repli des entrées consécutives d'une même
  famille (voir Multiplicité) ; ne l'employer qu'après accord de
  l'utilisateur.
- **Branchement** : ajouter l'identifiant à `units:` de la piste
  `glossaire` dans `content/courses/marx/course.yaml`, n'importe où :
  la piste se range d'elle-même par ordre alphabétique des titres, dans
  l'application comme dans l'éditeur visuel (`ALPHABETICAL_TRACKS`,
  `sortByTitle`). D'autres sessions
  travaillent peut-être sur le même cours : ne toucher qu'à cette ligne,
  aux fichiers de l'entrée et aux renvois inverses, jamais régénérer la
  liste.

## 7. Clarifier, valider, publier, rendre compte

1. **Passe de clarification** de `cours-traite` § 6 sur le rappel et les
   cartes : abstrait ? contresens possible ? argument à déplier ? Puis la
   **passe des obscurités** (relecture de l'utilisateur, 2026-10-24), phrase
   par phrase, avec ces quatre questions :
   - **Une image, une comparaison ?** Traduire en une phrase littérale ce
     qu'elle affirme, puis dire pourquoi l'auteur la choisit. « Le corps
     vivant est comme l'air échauffé » restait obscur : le corps a-t-il la
     vie, ou la reçoit-il ? La réponse tient dans le contraste que l'image
     construit (l'air éclairé ne garde rien, l'air échauffé devient chaud),
     et dans la phrase du texte qui le tranche (la vie « appartenait en
     propre au corps »). Pour une image à plusieurs termes, dire ce que
     représente chacun : l'acteur est l'âme, le costume est le corps.
   - **Un mot pris dans un sens fort ou figuré ?** (le vice est une
     « mort », le corps un « sommeil ») Dire pourquoi ce mot, à partir de la
     définition de la notion : vivre, c'est exercer son activité propre,
     donc l'âme qui la perd est morte en tant qu'âme.
   - **Une thèse affirmée sans ses raisons ?** (« une seule raison joue tous
     les rôles », « la santé vient du dedans ») Donner les raisons du texte,
     ou dire ce que désigne le terme vague : quel « dedans » (la raison de
     la nature qui forme et répare le corps), quel « dehors » (le médecin,
     qui ôte les obstacles).
   - **Une analogie ?** Dire terme à terme ce qui correspond à quoi, dans
     une phrase à part : « Ici, le plan est la forme, les murs sont la
     matière. » Une analogie posée en incise (« comme le plan d'une maison
     n'est pas plus grand quand la maison l'est ») laisse le lecteur faire
     la correspondance, et il la fait mal (relecture de Croissance,
     2026-10-24).
   - **Deux thèses dans une étape ?** Quand la seconde se déduit de la
     première (« la forme n'a pas de taille », donc « l'âme est présente
     tout entière »), lui donner son étape et dire le passage : « Il en
     résulte que… ». Une étape trop dense se relit comme une suite
     d'affirmations.
   - **Une citation qui commence au milieu de la phrase de Marx ?** Elle
     doit s'insérer dans la phrase française : « elle reste ce qu'elle
     est : « quand elle fait pousser les plantes ne pousse pas elle-même » »
     n'a pas de sujet. Reprendre la citation depuis son sujet, ou la
     couper autrement.
   - **Une phrase de liaison ?** (« c'est la même raison qui fait que… »)
     La déplier ou la supprimer. Un « voir X » ne se pose que si l'entrée X
     explique vraiment le point : relire X avant de renvoyer.
   NotebookLM aide à trouver ce qui manque (`manque`) : sans lui recopier
   la fiche, lui demander d'après la conversation ce qui n'a pas été
   abordé.
   Puis **la relecture indépendante** (autocritique du 2026-11-06 : je
   jugeais mes propres thèses claires) : un sous-agent qui n'a pas écrit
   l'entrée la relit selon `.claude/agents/relecteur-glossaire-marx.md`
   (agent `relecteur-glossaire-marx`, ou un agent généraliste à qui l'on
   donne ce fichier) et rend un rapport. Chaque point « à reprendre » se
   corrige d'après le journal, ou par une relance (`relance`), jamais de
   mémoire. La relecture de l'utilisateur après publication (phase G) reste.
2. `python -I .claude/skills/glossaire-marx/passages_chrono.py "content/courses/marx/units/g-*.yaml"` :
   les lignes des passages clefs se rangent dans l'ordre chronologique des
   œuvres (une œuvre inconnue est signalée : l'ajouter à sa liste) ; l'en-tête
   du tableau ne change pas, sa progression reste.
   `npm run content:tidy -- <fichiers>` met aussi une espace insécable à
   l'intérieur des guillemets (`nbspQuotes`) : inutile de la taper. Dans un
   rappel (bloc `notes: |-`), les guillemets droits s'écrivent tels quels,
   `"ainsi"`, jamais `\"ainsi\"`. `npm run content:check` jusqu'à
   « Contenu valide ». Un `[def]` n'est pas une citation. Relire une dernière
   fois : chaque citation du rappel et des cartes a son repère, et sa source
   est dans le journal.
3. `npm run content:build`, regarder le rendu de l'entrée dans le navigateur
   intégré.
4. Incrémenter `version:` du `course.yaml`.
5. Commit (« Marx, Glossaire : … ») et push, sans demander.
6. Rendre compte en quelques lignes : ce que l'entrée établit, les renvois
   posés (et les renvois inverses ajoutés), les cartes dont la progression
   repart de zéro, les choix tranchés sans l'utilisateur (partage, plan) ; les
   œuvres qui manquent au notebook (`manquantes`) ; puis les entrées que le
   partage a fait apparaître sans qu'on les écrive, à créer ensuite ou non.
