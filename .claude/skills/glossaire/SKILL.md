---
name: glossaire
description: Écrit une entrée du glossaire de Plotin ou de Marx (piste Glossaire, unités g-…) : une notion, une sous-entrée ou une distinction, en une seule leçon (un rappel qui fait comprendre la notion, puis ses cartes), reliée aux entrées voisines par des renvois cliquables dans le rappel. Sources : traduction GF (citations, repères) et NotebookLM (lieux et emplois de la notion), questions à l'utilisateur, passe de clarification, validation, branchement dans la piste, commit et push. Sait aussi scinder une ancienne fiche de plusieurs leçons en entrées d'une leçon reliées par des renvois. À utiliser dès qu'on demande une « entrée du glossaire », une « fiche » sur une notion de Plotin ou de Marx, d'« ajouter X au glossaire », ou de « scinder » une fiche du glossaire.
---

# Écrire une entrée du glossaire

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
sauf ce que dit la présente skill. Les relire avant la première entrée
d'une session.

## 0. Sources

**Plotin.** Les mêmes que `cours-traite` (§ 0 et 1 bis) : la traduction GF
pour toute citation et tout repère (`gf.py cherche`, `gf.py chapitre`), ses
notes et notices pour l'analyse, NotebookLM (notebook « Plotin », navigateur
intégré) pour recenser où la notion apparaît et comment Plotin l'emploie.
Tout ce que NotebookLM avance se recoupe sur la GF, selon les règles de
`cours-traite` § 1 bis ; les citations que l'utilisateur colle depuis
NotebookLM sont fiables. Pour l'entrée Vie (2026-10-21), il a cité III, 8
et I, 4 dans une autre traduction que la GF, et inventé une phrase de
III, 7, 11 ; mais il a apporté un lieu décisif oublié (IV, 7, 9) et les
contresens à désamorcer. Commencer par `gf.py cherche` sur les formules
attendues, puis l'interroger.

**Marx.** Pas encore fixées : avant la première entrée de Marx, demander à
l'utilisateur l'édition de référence (citations, repères) et s'il existe un
notebook NotebookLM, puis consigner la réponse ici.

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
- Le terme (grec ou allemand) et sa traduction GF ; les variantes de
  traduction qui égarent.
- Les lieux décisifs : deux à quatre passages où la notion est établie ou
  définie, pas une liste d'occurrences.
- Ses sens ou ses emplois distincts, et les distinctions qu'elle commande.
- Les contresens qui la guettent (le sens courant du mot français, le sens
  qu'elle a chez Platon, Aristote ou les stoïciens).
- **Le partage** : ce qui entre dans cette leçon, et ce qui devient une
  autre entrée (sous-entrée, distinction, notion voisine), vers laquelle on
  renverra.

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
`sh .claude/skills/glossaire/publier.sh "message" fichiers…` (version,
`content:check`, commit, push) ; une définition s'ajoute par
`python -I .claude/skills/glossaire/adddef.py g-x "définition"`.

```
N=".claude/skills/glossaire/notebook.py"
python -I $N debut g-x "terme sans article" --grec terme --voisines "a, b" --effets "c, d" [--couvert "ce que d'autres entrées traitent"]
python -I $N question g-x          # la prochaine question, à coller telle quelle
python -I $N reponse g-x <qid> <fichier>   # la réponse, copiée dans un fichier
python -I $N image g-x "épithète ou image de Plotin"
python -I $N relance g-x "ce que je ne comprends pas"
python -I $N juge g-x <qid> clair | obscur "ce qui reste obscur"
python -I $N plan g-x "thèse 1" "thèse 2" …   # proposé, après A à C
python -I $N valide g-x "mots de l'utilisateur" [thèses corrigées…]
python -I $N manque g-x <fichier yaml>      # après rédaction
python -I $N verifie g-x <fichier yaml>     # avant publication
python -I $N etat g-x                        # où en est l'entrée
python -I $N lecons                          # les relectures passées
```

**Règles d'envoi.** Le notebook est celui de Plotin : inutile de nommer
l'auteur dans la question (« comment Plotin… ? », « pourquoi Plotin… ? »
restent naturels). Une question par message ; attendre la fin de la
réponse (d'après la durée moyenne mesurée, non en interrogeant la page
toutes les deux secondes) ; ne relire que la dernière. L'historique de la
discussion s'efface en commençant une entrée, par l'utilisateur (c'est une
suppression définitive, que je ne fais pas moi-même).

**Économie (choix de l'utilisateur, 2026-10-26, après Végétatif : 19
questions avant le plan, des réponses de 8 000 caractères qui recitaient
toutes les quatre mêmes passages, lues puis recopiées en entier)** :
- `question` ajoute d'office à chaque question « 250 mots au plus » et la
  liste des passages déjà donnés, à ne pas reprendre ;
- le journal garde des **notes**, pas des transcriptions : pour chaque
  réponse, ses thèses, ses prémisses, ses passages, et mes recoupements
  sur la GF (citation exacte ou non, chapitre juste ou non, contresens) ;
- les questions élémentaires vont en deux messages à réponse en tableau
  court (`B-statut`, `B-portee`) ; `debut … --couvert "…"` signale ce que
  traitent déjà des entrées voisines (Croissance, Reproduction…), que
  NotebookLM ne doit pas redévelopper. Les difficultés, les thèses, les
  images et les relances restent une par message : c'est là que la
  division importe.

**Les phases, dans l'ordre imposé par le programme.**

- *A. Repérage* : les lieux décisifs ; les emplois distincts.
- *B. Questions élémentaires*, en deux messages (statut, puis portée), chacune précise :
  - **nature** : qu'est-ce, ontologiquement (une réalité à part, une
    puissance, une partie, un état, une activité, une relation) ? à quoi
    le voit-on chez Plotin ?
  - **rang** : à quel niveau de la réalité (l'Un, l'Intellect, l'Âme, les
    corps) se situe-t-elle, et pourquoi à celui-là ?
  - **origine** : de quoi dépend-elle, de quoi procède-t-elle, et en quel
    sens précis en vient-elle (don, trace, image, illumination) ?
  - **démarcation** : en quoi se distingue-t-elle des notions voisines
    (`--voisines`), et pourquoi Plotin ne les confond-il pas ?
  - **extension** : quels êtres l'ont, lesquels ne l'ont pas, et pourquoi
    dans chaque cas ?
  - **fonction** : quel rôle joue-t-elle dans le système, et qu'est-ce qui
    ne tiendrait plus sans elle ?
  - **mécanisme** : comment produit-elle ce qu'on lui attribue
    (`--effets`), étape par étape ?
  - **images** : pour chaque épithète ou image de Plotin (`image`), ce
    qu'elle dit littéralement, terme à terme, et pourquoi Plotin la choisit.
- *C. Difficultés* : les thèses contre-intuitives ou paradoxales, et la
  raison qu'en donne Plotin ; les points qui supposent d'autres thèses du
  système (procession, incorporéité de l'âme, contemplation…), avec la
  thèse présupposée ; les objections que Plotin se fait et ses réponses ;
  les contresens courants. Chaque point difficile relevé devient une
  `relance`.
- *Point d'étape avec l'utilisateur* (choix de l'utilisateur, 2026-10-26) :
  après A à C et leurs relances, `plan` ne fait que **proposer** les thèses
  d'étape tirées des réponses ; le programme les affiche avec les points
  difficiles relevés. Les montrer à l'utilisateur, en quelques lignes, et
  **attendre sa réponse** avant d'écrire quoi que ce soit ; puis `valide`
  avec ses mots, cités, et ses corrections du plan s'il en fait.
- *D. Plan* : seulement après sa validation. Chaque thèse devient une
  question : comment Plotin l'établit-il, prémisse par prémisse, avec le
  passage de chacune et ce qu'il faut savoir du système pour suivre ?
- *E. Relances et jugement* : chaque réponse de la phase D et chaque
  relance se juge (`juge`). « Obscur » si je ne saurais pas la rendre
  convaincante, sans trou, à quelqu'un qui ne croit pas Plotin : le
  programme en tire une relance (« je ne comprends pas pourquoi … :
  explique pas à pas le raisonnement, sans sauter d'étape »), jusqu'à
  « clair ». L'exemple de Plotin aide, mais c'est le raisonnement qu'on
  demande.
- *F. Ce qui manque* : après rédaction, `manque` fabrique la question à
  partir des étapes et des passages de l'entrée.
- *G. Relecture indépendante* : l'agent `relecteur-glossaire`
  (`.claude/agents/`), appelé par l'outil Agent avec l'identifiant et le
  fichier de l'entrée, relit comme l'utilisateur : chaque étape démontre-t-elle
  son intitulé, les prémisses du journal y sont-elles, un lecteur qui ne
  connaît pas Plotin suit-il, les relectures passées sont-elles respectées.
  C'est lui qui enregistre le verdict (`notebook.py verdict`), jamais moi ;
  le verdict vaut pour une empreinte du texte relu, et toute retouche
  ultérieure de l'entrée oblige à la refaire relire. « À reprendre » :
  poser à NotebookLM les questions qu'il indique, corriger, refaire relire.

`verifie` refuse la publication si une question est sans réponse, une
thèse ou une relance n'est pas jugée claire, le plan n'a pas l'accord de
l'utilisateur, une étape du rappel n'est pas une thèse du plan, le rappel
contient une paraphrase qui affirme sans démontrer (« Autrement dit ») ou
une étape sans connecteur de raison, ou si le relecteur n'a pas validé le
texte tel qu'il est.

**Les relectures de l'utilisateur** s'enregistrent (`notebook.py
relecture g-x "critique"`) et `lecons` les rassemble : les relire avant
chaque entrée, avec ce qui suit.

Puis poser à l'utilisateur, en une fois (`AskUserQuestion`), ce que les
sources ne tranchent pas, en particulier **le partage** quand il est
discutable : faut-il une sous-entrée pour tel sens, une entrée de
distinction pour telle division ?

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
  « Chez Plotin, le {violet}**temps**{/violet} (*khronos*) est [def]. »
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
  (GF, mot pour mot, entre `« »`) et expliqué.
- **Les traités sont toujours des renvois** : `[[traite30|traité 30]]` (N,
  le rang chronologique). Le moteur leur donne d'office la teinte prune,
  réservée aux traités ; au survol, la bulle donne le titre du traité ; au
  clic, la feuille montre son résumé de la piste Repérage, d'où l'on ouvre
  son cours. Ne jamais les colorer à la main. Repère : « ([[traite30|traité
  30]], chap. 10) », sans la numérotation des Ennéades ; « (…, chap. 3,
  l. 36-38) » quand les lignes sont sûres.
- **Pas de redite du traité** : dans un paragraphe où le traité vient
  d'être nommé, le repère suivant donne le chapitre seul. « Le
  [[traite53|traité 53]] s'ouvre sur elle : « À qui… ? » (chap. 1) », et non
  « (traité 53, chap. 1) ». Les tableaux (passages clefs) gardent, eux,
  « traité 45, chap. 8 » en clair, sans renvoi : ce sont des cases à
  replacer.
- **Les citations ne prennent pas de couleur décorative** (ni turquoise ni
  autre) : un rappel de glossaire se lit mieux sans. Seule exception, la
  couleur qui dit le **rôle logique** d'une partie de la citation (voir
  plus bas) : l'hypothèse que Plotin réfute en rouge, ce qu'il retient en
  vert, jusque dans les guillemets (retouche de l'entrée Bonheur,
  2026-10-23). **On y souligne en revanche la
  partie décisive** de chaque citation, celle qui porte l'idée : « une vie
  qui __demeure dans l'identité__ parce que __le tout lui est toujours
  présent__ ». Le souligné se met à l'intérieur des guillemets, sur une
  proposition ou un groupe de mots, jamais sur toute la citation.
- **Les termes techniques grecs en violet**, en plus de l'italique :
  `{violet}*pollakhôs legomenon*{/violet}`.
- **Ce qu'elle n'est pas** : le contresens principal, désamorcé dans le fil
  du rappel ou par un piège `! …` en fin. **Un piège ne répète pas un
  paragraphe** : si une étape du rappel dit déjà que l'Un est au-dessus de
  la vie, le piège « l'Un n'est pas la vie première » est en trop. Les
  pièges sont réservés aux contresens que le fil ne désamorce pas lui-même.
- **Les renvois** (§ 4) là où le rappel touche une notion qui a, ou aura,
  son entrée.
- **Lignes** : la GF ne les marque que toutes les cinq. Donner le
  chapitre seul, sauf si une note ou une notice fixe les lignes. Jamais une
  ligne déduite.
- **Citer des phrases qui se tiennent.** Une citation tronquée qui ne se lit
  plus seule (« … et qu'elle a une signification… ») se coupe en deux
  citations entières plutôt que de garder un « […] ».
- **Pas de guillemets autour d'un intitulé** (« vie végétative, sensitive,
  psychique » écrit comme une étiquette) : `gf.py verifie` le prend pour une
  citation introuvable. Les guillemets sont réservés au texte de la GF.
- Mise en relief, couleurs, grec en italique, tableaux, interdits : comme
  `cours-traite` § 4, sauf pour les citations (pas de turquoise, voir plus
  haut) et les traités (renvois prunes).

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
- **Une thèse surprenante s'accompagne de l'argument de Plotin**, en
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

- les couleurs disent le **rôle logique**, chacune toujours le même :
  {pink}la conception naïve écartée{/pink}, {red}la thèse adverse ou
  l'hypothèse réfutée{/red} (« pour les {red}stoïciens{/red}, l'âme est un
  {red}souffle physique{/red} »), {green}la thèse retenue{/green},
  {coral}la raison qui justifie{/coral} (« le temps n'est pas le
  mouvement, car {coral}les mouvements sont eux-mêmes dans le temps{/coral} »),
  {yellow}l'image ou la thèse empruntée à un autre auteur{/yellow} ;
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
- **Le sens propre de Plotin face aux questions d'aujourd'hui.** Quand un
  mot (bonheur) n'a pas chez Plotin le sens qu'on lui donne couramment,
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
- **Le titre et son terme grec disent la même chose** : « Vie parfaite
  (`teleia zôê`) », pas « Vie véritable (`teleia zôê`) ». Un terme grec que
  la GF ne donne pas ne s'écrit pas.

**Deux micro-sections closent le rappel** :

- **Passages clefs**, pour une notion, après les étapes : un tableau
  « Passage | Ce qu'il établit », une ligne par lieu décisif. Le régler
  dans `tables:` (banque sur « Ce qu'il établit », case seule sur
  « Passage ») : sans réglage, une colonne de repères rangée par numéro
  serait prise pour un plan à remettre dans l'ordre. **Sa forme, d'après la
  retouche de Bien-être par l'utilisateur (2026-10-26)** :
  - **peu de lignes, celles qui comptent** : cinq ou six au plus ; les
    chapitres d'un même traité qui établissent la même chose se
    regroupent en une ligne (« traité 46, chap. 4 et 6 ») ; un passage qui
    ne fait qu'illustrer une étape n'y entre pas ;
  - **la case « Ce qu'il établit » est une phrase entière**, qui dit la
    thèse du passage *et* sa raison ou sa conséquence, non une étiquette :
    « La santé et l'absence de douleur n'ajoutant rien au bonheur du sage,
    la maladie et la souffrance ne peuvent lui enlever quoi que ce soit »,
    plutôt que « le sage n'est pas un composé » ; « La sensation est une
    simple affection passive ; la cause de la vie bonne réside dans le
    jugement de l'Intellect », plutôt que « juger que c'est un bien relève
    de la raison » ;
  - **le tableau peut citer un lieu que le rappel ne développe pas**, s'il
    est décisif pour la notion (Bien-être : traité 36, chap. 10 ; traité 38,
    chap. 26 et 30) ; c'est un récapitulatif des textes à connaître, pas
    seulement de ceux qu'on a cités ;
  - **repère** sans la numérotation des Ennéades : « Traité 36, ch. 10 »
    ou « traité 46, chap. 2 » (`passages_chrono.py` range l'un et
    l'autre) ; « et » entre deux chapitres (« Traité 38, ch. 26 et 30 »),
    jamais « & », que l'éditeur visuel enregistre en « &amp; ».
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
- **Une cible doit exister**, ou être écrite dans la même session. Une
  entrée qu'on voudrait voir exister mais qu'on n'écrit pas maintenant ne
  reçoit pas de renvoi : la proposer à l'utilisateur en rendant compte
  (§ 7).
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
(`NoteRefSheet`) : l'entrée visée, ou, pour `[[traiteN|…]]`, le résumé du
traité. Au survol de la souris, une bulle donne la définition de l'entrée
(`definitions.yaml`, à défaut la première phrase du rappel) ou le titre du
traité. L'éditeur visuel garde le
renvoi tel quel. `content:check` refuse un renvoi dont la cible n'est pas
une unité du cours, et signale un renvoi glissé dans une carte.

## 5. Écrire les cartes

Trois au moins (contrainte du moteur), d'ordinaire dix à vingt-cinq, dans
l'ordre du rappel. Règles de `cours-traite` § 5. Pour une entrée, elles
portent en priorité sur :

- **le terme** : la notion française d'après sa description, et le terme
  grec translittéré (deux cartes séparées, voir `content/philosophie.md`) ;
- **le problème qu'elle résout**, en carte d'argument dont le trou est le
  pivot ;
- **les citations des lieux décisifs**, en cascade pour le passage principal ;
- **les repères** de ces lieux (le traité, avec ses deux numérotations en
  réponse : « 50 (III, 5) », `alt: ["50", "III, 5"]`) ;
- **le contresens** : ce que la notion n'est pas, troué sur le terme qui
  fait la différence ;
- pour une distinction, **le critère** et **chaque pôle**, le tableau se
  réglant comme dans `cours-traite` § 4.

Une carte ne renvoie pas à une autre entrée : elle tient seule, et dit en
quelques mots ce dont elle a besoin d'une notion voisine.

## 6. Fichier, identifiants, branchement

```yaml
# Entrée du glossaire de <auteur> (skill glossaire) : <sorte d'entrée>,
# citations vérifiées sur la GF (<lieux>).

id: g-vie-parfaite
title: Vie parfaite (`teleia zôê`)
icon: book
color: coral
lessons:
- id: g-vie-parfaite-l1
  title: <le titre de l'entrée, ou ce que la leçon établit>
  notes: |-
    …
  points:
  - id: g-vie-parfaite-l1-q1
    …
```

- Identifiant `g-` suivi du nom français sans accents, en tirets
  (`g-vie-parfaite`, `g-multiplicite-sensible`). Cartes `…-l1-qN`.
- Titre « Notion (`terme grec`) » ; une distinction s'intitule par ses pôles
  ou par son nom usuel (« Trois vies »). Le grand exercice lit la notion et
  le terme grec dans ce titre : un terme grec porté par deux entrées
  (« Un » et « Unité », *hen*) ne leur est pas demandé ; pour lui donner un
  autre terme, ou à une entrée qui n'en a pas dans son titre, écrire la
  définition sous la forme `g-x: { def: '…', grec: '…' }`.
- Pas de `subtitle:` : la définition en tient lieu (si une entrée en porte
  un, il l'emporte sur la définition dans la liste).
- Ajouter la définition à `definitions.yaml` en même temps que l'entrée ;
  `content:check` signale une entrée écrite qui n'en a pas.
- `group:` réunit sous un même repli des entrées consécutives d'une même
  famille (voir Multiplicité) ; ne l'employer qu'après accord de
  l'utilisateur.
- **Branchement** : ajouter l'identifiant à `units:` de la piste
  `glossaire` dans `content/courses/<cours>/course.yaml`, n'importe où :
  la piste se range d'elle-même par ordre alphabétique des titres, dans
  l'application comme dans l'éditeur visuel (`ALPHABETICAL_TRACKS`,
  `sortByTitle`). D'autres sessions
  travaillent peut-être sur le même cours : ne toucher qu'à cette ligne,
  aux fichiers de l'entrée et aux renvois inverses, jamais régénérer la
  liste.

### Scinder une ancienne fiche

Une fiche de plusieurs leçons (la plupart des 43 fiches de Plotin d'avant
cette skill) se scinde **sur demande, une fiche à la fois** :

1. Garder la leçon qui dit l'essentiel de la notion dans le fichier
   d'origine, comme entrée générale ; en refaire le rappel selon le § 3.
2. Chaque autre leçon devient une sous-entrée, une distinction ou une
   notion voisine (son propre fichier), ou se fond dans une entrée qui
   existe déjà. Proposer ce partage à l'utilisateur avant de l'appliquer.
3. **Garder les identifiants des cartes qui ne changent pas**, même
   déplacées dans un autre fichier : la progression est rangée par
   identifiant de carte, elle les suit. Une carte dont le contenu change
   reçoit un nouvel identifiant (`-q` devient `-r`), comme dans
   `cours-traite` § 5.
4. Relier les entrées par leurs renvois (§ 4), brancher les nouvelles (§ 6).

## 7. Clarifier, valider, publier, rendre compte

1. **Passe de clarification** de `cours-traite` § 6 sur le rappel et les
   cartes : abstrait ? contresens possible ? argument à déplier ? Puis la
   **passe des obscurités** (relecture de l'utilisateur, 2026-10-24), phrase
   par phrase, avec ces quatre questions :
   - **Une image, une comparaison ?** Traduire en une phrase littérale ce
     qu'elle affirme, puis dire pourquoi Plotin la choisit. « Le corps
     vivant est comme l'air échauffé » restait obscur : le corps a-t-il la
     vie, ou la reçoit-il ? La réponse tient dans le contraste que l'image
     construit (l'air éclairé ne garde rien, l'air échauffé devient chaud),
     et dans la phrase de la GF qui le tranche (la vie « appartenait en
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
   - **Une citation qui commence au milieu de la phrase de la GF ?** Elle
     doit s'insérer dans la phrase française : « elle reste ce qu'elle
     est : « quand elle fait pousser les plantes ne pousse pas elle-même » »
     n'a pas de sujet. Reprendre la citation depuis son sujet, ou la
     couper autrement.
   - **Une phrase de liaison ?** (« c'est la même raison qui fait que… »)
     La déplier ou la supprimer. Un « voir X » ne se pose que si l'entrée X
     explique vraiment le point : relire X avant de renvoyer.
   NotebookLM aide à trouver ce qui manque : lui donner la liste de ce que
   l'entrée couvre déjà (lieux et thèses) et lui demander les passages,
   arguments et difficultés qui manquent ; recouper chaque apport sur la
   GF.
2. `python -I .claude/skills/glossaire/passages_chrono.py "content/courses/<cours>/units/g-*.yaml"` :
   les lignes des passages clefs se rangent dans l'ordre chronologique des
   traités (consigne de l'utilisateur, 2026-10-24), la *Vie de Plotin* en
   dernier ; l'en-tête du tableau ne change pas, sa progression reste.
   `npm run content:tidy -- <fichiers>` met aussi une espace insécable à
   l'intérieur des guillemets (`nbspQuotes`) : inutile de la taper. Dans un
   rappel (bloc `notes: |-`), les guillemets droits s'écrivent tels quels,
   `"ainsi"`, jamais `\"ainsi\"` : l'échappement ne vaut que dans une chaîne
   entre guillemets (une carte), et dans un bloc la barre s'afficherait.
   `content:tidy` la retire de toute façon, mais l'écrire juste évite d'en
   dépendre.
   `npm run content:check` jusqu'à
   « Contenu valide », puis pour Plotin
   `python -I .claude/skills/cours-traite/gf.py verifie <fichier> <id de la leçon>`
   et `… reprises …` : aucune citation introuvable, aucune reprise sans
   guillemets (les mots coupés en fin de ligne, « luimême », sont
   recollés : ils ne sortent plus « introuvable » à tort). Un `[def]` n'est
   pas une citation : il n'entre pas dans ce contrôle.
   Puis `… chapitres <fichier> <id de la leçon>` : chaque citation doit se
   trouver dans le chapitre que son repère annonce. `verifie` ne cherche que
   dans toute la GF, et c'est ainsi que des entrées publiées citaient 28, 28
   pour 27, 23, ou 38, 19 pour 38, 26 (audit du 2026-10-24). Le repère suit
   les citations qu'il couvre, jamais il ne les précède : une citation sans
   repère après elle est rapportée au repère suivant du paragraphe (« repère
   avant » signale celle qui se trouve en fait dans le chapitre du repère
   précédent ; lui en ajouter un, « (chap. 4) », juste après). Une citation
   suit la traduction GF elle-même, jamais la présentation d'un volume ni
   une autre traduction : une phrase de présentation passe `verifie` mais
   sort « ailleurs » à `chapitres`.
3. `npm run content:build`, regarder le rendu de l'entrée dans le navigateur
   intégré.
4. Incrémenter `version:` du `course.yaml`.
5. Commit (« Plotin, Glossaire : … ») et push, sans demander.
6. Rendre compte en quelques lignes : ce que l'entrée établit, les renvois
   posés (et les renvois inverses ajoutés), les cartes dont la progression
   repart de zéro ; puis, par `AskUserQuestion`, les entrées que le partage
   a fait apparaître sans qu'on les écrive, à créer ensuite ou non.
