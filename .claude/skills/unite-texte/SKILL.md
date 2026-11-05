---
name: unite-texte
description: Crée de A à Z une unité de texte Cartophilo (piste « Textes » de Marx ou de Plotin, ou unité de texte dans une piste du Hors-programme ou de La vie) à partir d'un texte à étudier (seul, l'analyse étant alors écrite et vérifiée d'abord), d'un PDF (y compris scanné ou sans texte sélectionnable), d'un commentaire, de notes d'édition ou d'un export Quizlet de cartes déjà écrites : leçons d'introduction, une leçon par paragraphe avec texte intégral et rappel explicatif, cartes-citation aux trous choisis, cartes-explication, validation, branchement dans le cours, commit et push. À utiliser dès qu'on demande de « faire une unité-texte », « ficher ce texte pour l'app », « créer les cartes de ce passage », ou d'importer des cartes Quizlet portant sur un texte précis.
---

# Créer une unité de texte

Une unité de texte fait **comprendre, puis savoir citer, un texte précis**.
Elle s'ouvre, si le texte est difficile, par des leçons d'introduction ; puis
vient une leçon par paragraphe, qui montre le paragraphe en entier suivi de
son explication, puis ses **cartes-citation** (le texte même, troué sur ce
qu'il faut savoir restituer), puis ses **cartes-explication** (à trou, une
information centrale sur le paragraphe). L'app joue les cartes dans l'ordre
écrit, révélées ou écrites au choix.

Cette skill est autonome : ses règles suffisent. N'ouvrir `content/textes.md`
ou `content/philosophie.md` qu'en cas de doute précis, jamais par principe.

**Principe directeur : faire comprendre avant de faire apprendre.** Une carte-
citation fait apprendre par cœur ; on n'apprend pas par cœur un texte qu'on
ne comprend pas encore. D'où l'ordre : introduction, texte et explication,
puis citations, puis explications ciblées.

## 0. Ce qu'il faut avoir avant de commencer

- **Le cours et la piste** : la piste `textes` de `marx` ou de `plotin` ; pour
  le Hors-programme ou La vie, la piste du domaine (par exemple `morale`),
  sans onglet Textes dédié, avec un `group` (« La morale d'Aristote »).
- **Le texte**, dans la traduction que l'utilisateur veut faire apprendre (le
  lui demander si le commentaire en cite une autre). **Si le commentaire en
  articule deux** (un même auteur, une seule démonstration qui va de l'un à
  l'autre), juger s'il vaut mieux les séparer en deux unités ou les traiter
  comme une seule (§ 1 « Plusieurs textes »), et le dire à l'utilisateur avant
  de créer quoi que ce soit s'il n'a pas déjà tranché.
- **La référence** : œuvre, livre, chapitre, lignes (Bekker, Stephanus,
  Ennéades…), traduction.
- **Le commentaire et les notes**, s'il y en a : ce sont eux qui disent ce qui
  compte dans le texte, donc où placer les trous et quoi expliquer.

Ne demander que ce qui manque vraiment, en une seule question groupée.

### Lire les sources

1. `pdftotext -enc UTF-8 -layout fichier.pdf sortie.txt`, puis lire la sortie.
2. **Si elle est vide** (scan, ou texte dessiné en tracés), depuis la racine
   du dépôt, avec un dossier au **chemin court** :
   ```bash
   PYTHONUTF8=1 python .claude/skills/unite-texte/pdf_pages.py fichier.pdf "$TEMP/pages"
   node .claude/skills/unite-texte/render_pages.cjs "$TEMP/pages"
   ```
   puis lire les PNG une à une. Signaler à l'utilisateur tout passage
   illisible ou douteux (grec empâté, marques manuscrites), et le coût de
   cette lecture : un PDF à texte sélectionnable, ou le texte collé, revient
   moins cher.
3. **Juger la fiabilité des sources** : une réponse ou un commentaire qui
   porte des traces de génération automatique (références trop précises,
   coquilles étrangères, « illustrations » plaquées) ne vaut pas une note
   d'édition. N'en tirer une carte que si l'information est attestée ou
   vérifiable ; sinon la signaler, sans la faire apprendre.

### Sans commentaire

Quand il n'y a que le texte, sans commentaire ni notes, ne rien demander de
plus et ne pas écrire pour autant au fil de l'eau d'emblée : **produire
d'abord le commentaire qui manque**, qui tiendra lieu, dans toute la suite de
la skill, de « commentaire » (découpage, trous, introduction, sources des
cartes-explication).

1. **Chercher ce qui existe déjà.** Les notes et la notice de l'édition dont
   le texte est tiré, si l'utilisateur a le PDF (le lui demander une fois,
   sans bloquer s'il ne l'a pas) ; un notebook NotebookLM de l'auteur ou de
   l'œuvre, s'il en est donné un (pour Plotin, le notebook « Plotin » de
   `cours-traite`), interrogé comme au § 1 bis de `cours-traite` : dans le
   navigateur intégré, historique supprimé, une question à la fois, en
   rappelant à chaque fois l'œuvre, la traduction et l'incipit du passage ;
   enfin le dépôt (`grep` sur l'auteur et l'œuvre dans `content/courses/`) :
   un cours, une entrée de glossaire ou une unité-œuvre voisins disent déjà
   le contexte, et l'unité doit s'accorder avec eux.
2. **Écrire l'analyse du texte entier**, dans un fichier du dossier
   temporaire, avant la première leçon. Elle suit, étape par étape, les
   consignes que l'utilisateur a données pour Montaigne, « Sur un enfant
   monstrueux » (II, 30, conversation du 2026-09-29, d'où vient
   `la-vie/units/montaigne-monstre`) ; chaque étape s'écrit après la
   précédente et s'appuie sur elle, comme une suite de questions :
   1. **Établir le texte** : l'extraire en entier, rétablir ce que
      l'extraction a perdu (ligatures *fi*, *ff*), mettre les références
      marginales entre crochets, retirer les notes de bas de page.
   2. **La thèse** : l'affirmation principale, celle que toutes les autres
      justifient. Si elle réunit des affirmations de statut différent (chez
      Montaigne, l'une sur ce qui est, l'autre sur nos jugements), les
      distinguer et dire ce qui les lie : laquelle dépend de l'autre, pourquoi
      l'une ne suffit pas à l'autre, donc ce que l'auteur doit fournir (une
      preuve, une explication de l'erreur). Situer aussi la question à
      laquelle le texte répond, **contre qui** (adversaire, opinion du temps)
      et sa place dans l'œuvre. Qualifier chaque affirmation avec le
      vocabulaire reçu de la discipline (*ontologique*, *anthropologique*,
      *épistémologique*, *éthique*…), jamais avec une étiquette forgée pour
      l'occasion : l'analyse de Montaigne disait la seconde thèse « que l'on
      peut dire diagnostique », l'utilisateur l'a corrigée partout en
      « anthropologique », et la carte qui la faisait apprendre avec.
   3. **Les arguments et les sous-arguments**, distingués rigoureusement, en
      répondant à la question : qu'est-ce qui, dans ce texte, permet à
      l'auteur d'affirmer sa thèse ? Ouvrir sur un glossaire des notions que
      les arguments font jouer ensemble. Pour chaque argument : ses étapes,
      la prémisse implicite qui le rend concluant, ce qu'il établit et **ce
      qu'il ne suffit pas à établir**, qui appelle l'argument suivant (chez
      Montaigne, Dieu qui voit tout ne prouve pas qu'il n'y a pas de
      dérèglement réel, d'où le second sous-argument, Dieu qui produit).
      Finir chaque argument par ce qui a été établi.
   4. **Les portées, propres à ce texte** : les domaines qu'il touche
      réellement, choisis pour lui et non tirés d'une grille (pour
      Montaigne, l'utilisateur a demandé les portées épistémologique,
      anthropologique, éthique et esthétique parce que ce texte-là les
      porte ; un autre texte en appellera d'autres). Distinguer ce que le
      texte affirme de ce qu'on peut en tirer en le prolongeant. Y joindre
      ce que le texte fait comprendre des **concepts de l'épreuve** (pour La
      vie : *nature*, *vivant*, *norme*…). Élargir au-delà, vers d'autres
      angles d'analyse, se décide au cas par cas, quand le texte y prête.
      **Texte sur la vie** (La vie, ou tout texte qui porte sur un point
      précis ou un débat précis de la philosophie de la vie) : ne pas
      élargir la perspective très loin, mais **couvrir ce que le texte
      engage du concept de vie et de ce qui le concerne** (la biologie, le
      vivant, la mort, la santé et la maladie, le sens de la vie, la
      conduite de sa vie…), et viser précisément ce à quoi on n'aurait pas
      pensé une fois l'analyse finie : une fois l'explication écrite,
      reprendre ces domaines un à un et se demander ce que le texte en
      dit, suppose ou permet d'en penser (chez Montaigne, la vie qui
      fonctionne à travers l'anomalie, les membres de l'enfant sans tête
      « nourris et vivants », un vivant ou deux). Ne garder que ce que le
      texte autorise vraiment. Portées et confrontations vont aux leçons
      de prolongement (§ 3), jamais dans les leçons de texte. Un texte qui
      ne parle de la vie qu'indirectement (l'âme chez Aristote) reçoit en
      plus l'analyse explicite du concept : sa définition, son statut
      ontologique et épistémologique, ses rapports aux notions voisines
      (corps, âme, mort, vivant…), et les titres disent, autant que le
      propos le permet sans le forcer, quelque chose de la vie.
   5. **Les mouvements et l'explication linéaire** : découper le texte selon
      les arguments distingués, en mouvements (repérés par leurs lignes ou
      leurs paragraphes, chacun avec son rôle : pose, réfute, généralise,
      démontre, conclut), puis réorganiser tout ce qui précède linéairement,
      « extrait -> explication », chaque extrait cité en entier, dans
      l'ordre, et chaque argument à l'endroit du texte qui le porte ; une
      synthèse par mouvement (ce qui y a été établi), une conclusion ; les
      portées et les confrontations à part, après l'explication. C'est, pour
      l'explication, la forme de la fiche de Montaigne
      (`exemples/montaigne-II-30-analyse.txt`, telle que la conversation l'a rendue, avant les retouches) : préalables (thèse,
      mouvements, glossaire), puis les mouvements extrait par extrait. Le
      découpage en extraits est celui de l'unité (§ 1, « Paragraphe long,
      découpé en extraits » au § 4).
   À chaque étape, noter aussi **ce qui est décisif** (le mot, la modalité
   sur lesquels tient l'argument : la carte des trous, § 5, qu'aucun
   commentateur ne fournit ici), les **contresens** à éviter, et les
   **confrontations** avec les auteurs qui comptent pour l'épreuve (pour La
   vie, Canguilhem, Aristote, Bergson…), développées d'après leur texte,
   avec l'ouvrage, la partie et le chapitre, et non en une allusion :
   l'analyse ne disait de Canguilhem qu'une formule (« de valeur
   négative ») ; l'utilisateur en a tiré une quinzaine de cartes sur « La
   monstruosité et le monstrueux » (*La Connaissance de la vie*, I, 5) :
   écart statistique, tératologie, polarité de la vie, monstre et mort,
   monstre et pathologique.
   Relire l'analyse d'un bout à l'autre et corriger ce qui ne s'enchaîne
   pas : c'est la seule vue d'ensemble qu'aura l'unité.
3. **Vérifier ce qui sort du texte.** Ce que l'analyse tire du texte même
   (thèse, arguments, structure) s'atteste par le texte cité. Tout le reste
   (dates, place dans l'œuvre, renvois à d'autres textes, positions des
   commentateurs, débats d'interprétation) vient de ma connaissance et se
   vérifie par une recherche avant d'aller dans un rappel ou une carte :
   vérifier plutôt que retirer, mais ne faire apprendre que ce qui est
   confirmé, et signaler le reste dans le compte rendu. Un commentateur ne
   se nomme qu'avec une position attestée, jamais de mémoire seule.
   **Les renvois à d'autres textes de l'auteur se citent dans la traduction
   du texte étudié**, retrouvés dans son édition (PDF de l'utilisateur, par
   exemple `D:\Downloads`), avec le titre et la numérotation de chapitre de
   cette édition. La fiche de Montaigne citait de mémoire le texte ancien
   (« On s'apprivoise à toute étrangeté par l'usage », Villey) quand l'unité
   suit la traduction de Guy de Pernon (« on se fait à n'importe quelle
   étrangeté au fil du temps et par la force de l'habitude ») et numérotait
   « Des cannibales » en I, 31 au lieu de « Sur les cannibales », I, 30 :
   l'utilisateur a tout repris sur l'édition.
4. **Écrire l'unité** comme d'ordinaire (§ 1 à § 9), l'analyse tenant lieu de
   commentaire : les rappels la développent paragraphe par paragraphe, les
   leçons d'introduction et de prolongement en reprennent la question, les
   notions, les positions rivales et les enjeux, les trous suivent ce qu'elle
   a jugé décisif. Ce que l'analyse remarque sur la manière (la précision
   d'un récit, une prudence de témoin) se dit dans le rappel, sans faire
   trouer chaque détail qui l'illustre (§ 5, règle 7). Portées et
   confrontations vont en prolongement (§ 3), avec leurs cartes. Ce
   prolongement apporte du neuf et ne récapitule pas : chez Montaigne, la
   conclusion de l'analyse convertie telle quelle (« conjonction »,
   « regarde », « féconde ») redisait en réponses vagues ce que les extraits
   avaient déjà fait apprendre, et l'utilisateur l'a supprimée.
5. **Le dire dans le compte rendu** (§ 10) : l'unité repose sur ma propre
   analyse, avec les sources consultées (notebook, édition, recherches) et
   les points d'interprétation où une autre lecture était possible.

## 1. Préparer

- **Identifiant de l'unité** : court, sans accent, unique dans le cours
  (`n1841`, `t10c1`, `m8`). Leçons `<id>-i1`, `<id>-i2`… (introduction),
  `<id>-p1`, `<id>-p2`… (paragraphes), `<id>-o1`, `<id>-o2`…
  (prolongement), `<id>-ouverture` ; cartes
  `<id>-p1-1`… Un identifiant ne se réutilise jamais : la révision espacée
  s'y rattache.
- **Découpage en paragraphes** : la numérotation du texte s'il en a une ;
  sinon ses mouvements, repérés par leurs lignes (`label: "1178a22-28"`,
  `"l. 3-11"`), de préférence selon le découpage du commentaire. Un intitulé
  court par paragraphe, qui dit son mouvement. Un paragraphe sans intérêt
  pour l'épreuve peut être sauté.
- **Fragments** : un paragraphe de plus de 80 mots environ se cite en
  plusieurs fragments (`1/3`, `2/3`, `3/3`), coupés aux fins de phrase.
- **Introduction** : décider s'il faut des leçons d'introduction (§ 3). Oui
  dès que le texte est difficile, ou que le commentaire consacre une partie au
  problème, aux notions ou aux débats.
- **Ce qui compte** : relire le commentaire et les notes pour repérer, dans
  chaque paragraphe, la thèse, les notions, les images, et ce que le
  commentateur désigne comme décisif. C'est la carte des trous (§ 5).

### Plusieurs textes

Rare, mais parfois le bon choix (voir § 0) : un commentaire construit une
seule démonstration à partir de deux textes du même auteur, s'appuyant sur
l'un pour éclairer l'autre. Les séparer romprait ce mouvement et dupliquerait
dans les deux unités la thèse qui les tient ensemble ; une seule unité peut
alors les citer l'un après l'autre, à condition que chaque leçon porte sa
référence dans **`passage.source`** (l'ouvrage cité, par exemple `"Discours
sur l'origine et les fondements de l'inégalité"`), affichée avec `label`
partout où la carte peut revenir détachée de sa leçon (révision, « Lire le
texte »).

`label` change de nature avec l'ouvrage, et **recommence** à chaque
changement de texte plutôt que de continuer la numérotation du texte
précédent : `§1, §2…` pour un texte qu'on cite habituellement par paragraphe
(des chapitres courts et numérotés dans l'édition de référence, comme *Du
contrat social*) ; sinon, un repère qui ne prétend à aucune réalité textuelle
— `"Fragment 1"`, `"Fragment 2"`… — plutôt qu'un faux `§n`, surtout si
l'extrait est fragmenté sans suivre les alinéas du texte.

## 2. Écrire au fil de l'eau

Une leçon à la fois, directement dans le fichier : ne jamais rédiger toute
l'unité d'un bloc.

1. Créer `content/courses/<cours>/units/<id>.yaml` avec l'en-tête et la
   première leçon seulement ; ajouter `<id>` à la fin de `units:` dans la
   piste visée de `content/courses/<cours>/course.yaml`, et incrémenter
   `version:` de ce même fichier.
2. Valider (§ 8), corriger.
3. Ajouter la leçon suivante **à la fin du fichier**, sans relire ni
   réécrire les précédentes. Valider. Recommencer.

Pour chaque leçon, écrire **d'abord le rappel** (`notes`) : il sert de
garde-fou de compréhension avant de choisir les trous.

```yaml
# Unité de texte (voir content/textes.md) : <œuvre, référence, traduction>.

id: <id>
title: "<Titre court du texte>"
subtitle: "<Œuvre, livre, chapitre, lignes>"
icon: page
color: coral                      # la couleur de la piste
group: "<Groupe>"                 # Hors-programme ou La vie seulement
intro: |-
  <Présentation : deux ou trois phrases de situation.>
lessons:
- id: <id>-i1
  title: "<Le problème, les notions>"
  notes: |-
    <Rappel d'introduction, voir § 3.>
  passage:
    label: "Introduction"          # pas de `text` : rien à citer
  points:
  - id: <id>-i1-1
    sentence: "<Carte-explication autonome avec un ___>"
    answer: "<réponse unique>"
    alt: []
- id: <id>-p1
  title: "<Intitulé du mouvement>"
  notes: |-
    <Explication du paragraphe, voir § 4.>
  passage:
    label: "§1"                    # ou les lignes : "1178a9-22"
    # source: "<Ouvrage cité>"     # seulement si l'unité en articule plusieurs, voir § 1
    text: "<Le paragraphe en entier, tel quel, sans guillemets autour>"
  points:
  - id: <id>-p1-1
    fragment: "1/2"
    sentence: "« <Le fragment 1/2 en entier, avec ___ sur ce qui compte> »"
    answer: "<le texte masqué>"
    alt: []
  - id: <id>-p1-2
    fragment: "1/2"
    sentence: "« <Le même fragment, trous : ___ … ___> »"
    answer: "<réponse 1> ; <réponse 2>"
    alt: []
  - id: <id>-p1-9
    sentence: "<Carte-explication autonome avec un ___>"
    answer: "<réponse unique>"
    alt: []
```

Toutes les chaînes entre guillemets droits doubles : les phrases contiennent
des deux-points. En Python, les écrire avec `json.dumps(s, ensure_ascii=False)`
(qui échappe tout ce qu'il faut) et placer le générateur dans un fichier
plutôt que dans une commande : le terminal altère les barres obliques
inverses.

## 3. Les leçons d'introduction

Avant la première leçon-paragraphe, une ou deux leçons qui donnent ce qu'il
faut pour comprendre le texte : le problème auquel il répond, les notions
qu'il suppose (tableau comparatif dès qu'il y en a deux), les positions
rivales et leurs tenants, sa place dans l'œuvre. Un rappel par leçon, un
écran au plus : au-delà, couper en deux leçons. Puis des cartes-explication
(§ 6). Les cartes de contexte général (débats d'interprétation, arguments
voisins, place dans l'œuvre) vont là, pas dans les paragraphes — sauf quand
le commentaire les développe à propos d'une ligne précise du texte : elles
suivent alors le commentaire (§ 6, « Tout le commentaire »).

**Le plan du texte**, dans la première leçon d'introduction : deux ou trois
phrases qui disent la progression, chaque groupe de lignes en gras avec son verbe
(« **Les lignes 412b17-25 refont l'expérience sur l'œil** »), puis un tableau de
structure `Mouvement | Lieu | Ce qui s'y joue`, sur le modèle de `traite2.yaml`
(`cours-traite`, « Première leçon : le plan »). Une ligne par mouvement
argumentatif ; un seul repère dans la colonne Lieu.

- **Mouvement** nomme ce que fait l'auteur et sur quoi : « écarter les mauvaises
  lectures de « potentiellement », puis distinguer la capacité de l'exercice ».
  Jamais un verbe seul ni une suite de verbes sans objet (« préciser la
  puissance, répartir, conclure », « poser », « montrer »), ni l'exemple employé
  à la place du rôle (« la hache », « l'œil ») : c'est le tableau que
  l'utilisateur a refusé sur `aristote-ame-vue-oeil`, parce qu'il ne disait pas
  le rôle de chaque partie.
- **Ce qui s'y joue** dit, en une phrase complète, la thèse établie et sa raison
  (« la puissance de vivre suppose l'âme, ce qui exclut le cadavre et la
  semence ») : on doit pouvoir suivre l'argument du texte en lisant cette seule
  colonne.

**Leçons de prolongement** : une ou deux, leur pendant à la fin de l'unité,
après les paragraphes. Elles reçoivent ce que le commentaire développe *après*
le texte sans le commenter ligne à ligne (un exposé de fond, une notion
voisine, la conclusion d'un essai thématique), et, **toujours, les portées et
les confrontations** : la leçon de texte explique le texte, et rien d'autre ne
s'y mêle (demandé par l'utilisateur sur `aristote-ame-vue-oeil` ; modèle de
construction : les leçons `o1` et `o2` de `bichat-vie-mort`). Une leçon-paragraphe
garde seulement une phrase qui dit ce que le passage établit pour le concept de
l'épreuve. Les passages parallèles qui servent à comprendre une ligne restent
dans sa leçon ; ceux qui en tirent une thèse sur autre chose passent en
prolongement. S'il y a deux leçons, l'une pour les portées (le concept), l'autre
pour les confrontations (les auteurs et les débats). Même forme qu'une
introduction : `label: "Prolongement"`, pas de `text`, un rappel et des
cartes-explication. Avec un commentaire, ce qui prépare la lecture va en
introduction, ce qui la prolonge en prolongement. Pour faire apprendre un autre
texte, c'est une ouverture (§ 6), avec son texte, placée juste après les
paragraphes et avant les prolongements.

## 4. Le rappel de chaque paragraphe

Affiché sous le texte cité, avec le titre « Explication ». C'est un vrai
commentaire du paragraphe, pas un résumé d'une ligne :

- **la thèse**, dans un premier paragraphe dont l'idée directrice est en
  gras ;
- **l'argument pas à pas**, et la place du paragraphe dans le texte (ce qu'il
  reprend, ce qu'il prépare) ;
- **un tableau** dès qu'une notion se compare sur deux axes (quatre
  exemples et ce dont ils ont besoin, deux vertus, trois lectures) ;
- **un piège** (`! …`) en fin : le contresens à éviter.

Retouches de l'utilisateur sur Bichat, à anticiper :

- **Pas de précaution de méthode dans l'intitulé ni dans la phrase** (« Bichat
  ne nomme personne, et Huneman ne commente pas l'expression : il faut la
  reconstruire ») : la question suffit, et le tableau dit lui-même, par sa
  colonne de limite, que la piste est fragile.
- **Pas d'attribution à un commentateur** (« d'après Huneman », « Huneman
  note que », « Huneman le résume ») pour ce que le texte ou le raisonnement
  établit déjà ; le nom ne reste que pour une position qui lui appartient en
  propre (voir § 5, « Un commentateur »). Une phrase qui résume le texte se
  dit sans lui.
- **Cases de tableau courtes** : une référence principale par case ; les
  textes d'appoint (une méthode, un second auteur) qui l'alourdissent sont
  retirés.
- **`tables:` dans la leçon** quand un tableau est écrit : une banque sur la
  colonne qui s'apprend, une case seule (`cell`) sur chaque étiquette qu'on
  ne peut pas formuler autrement, ici les trois termes de la définition
  (`« fonctions »`, `« ensemble »`, `« qui résistent à la mort »`).

### La mise en relief du rappel

Même règles que pour les unités-œuvres (`cours-traite`, « La mise en
relief », et `content/philosophie.md`) : le rappel se lit d'un coup d'œil, et
chaque marque a une fonction. Les retouches de l'utilisateur sur
`bichat-vie-mort` les ont confirmées sur une unité de texte.

- **Gras** sur le contenu décisif et les conclusions, pas sur la formule qui
  l'introduit ; **souligné** (`__…__`) sur les propositions qui portent
  l'argument (prémisses, membres d'une alternative). Les deux se combinent
  pour l'intitulé d'une étape.
- **Couleurs**, le code fixe, toujours le même : `green` la thèse retenue ;
  `red` et `pink` ont la même valeur (le négatif, ce qui est rejeté, le
  contraire, l'opposition) et alternent surtout pour la lisibilité : deux
  membres négatifs voisins ne prennent pas la même couleur ; `violet` les termes techniques et notions
  clés ; `teal` les citations ; `sky` la structure et les sources ;
  `coral` les propriétés établies et les conclusions ; `yellow` les images
  et analogies ; `amber` libre, pour une nuance locale.
- **Dans la phrase de thèse d'ouverture**, seuls les mots qui portent
  l'idée sont colorés, la phrase n'est pas entièrement en couleur : par
  exemple la question en `amber`, la notion définie en `violet`, la
  définition en `coral` (`**Le texte répond à la question**
  {amber}**« qu'est-ce que la vie ? »**{/amber} **par une définition :**
  {violet}**la vie**{/violet} **est**
  {coral}**l'ensemble des fonctions qui résistent à la mort**{/coral}**.**`).
  Chaque couleur garde son rôle ; ce découpage n'est qu'un exemple.
- **Les paires vert/rouge (ou vert/rose, rouge et rose étant
  interchangeables)** opposent les deux pôles d'une même
  phrase : ce que la vie n'est pas, `{red}une chose{/red}`, `{red}une
  substance{/red}`, mais `{green}__une activité, un ensemble de
  fonctions__{/green}` ; le statut de ce qu'on ignore en `pink`, ce que
  l'on peut malgré tout savoir en `amber`.
- **Une notion et ce qu'on lui refuse** : la notion en `violet` gras, le
  verdict sur elle en `pink` (`**la** {violet}**physiologie**{/violet}
  **n'est** {pink}**pas une science reconnue**{/pink}`).
- **Dense, mais par petits groupes de mots** : les retouches de Bichat
  colorent beaucoup (presque chaque phrase porte une ou deux marques), sur
  un mot ou un membre court, jamais sur une phrase entière. Ce qui reste nu :
  les mots de liaison, la transition, le contexte historique. Un ensemble
  qu'on retient comme tel (« le vivant est entouré d'une destruction
  permanente ») se marque en `__souligné__`, avec la couleur du rôle sur son
  noyau (`__le vivant est entouré d'{red}une destruction permanente{/red}__`).
- **Rôles qui reviennent d'une retouche à l'autre** :
  - `violet` la notion, **chaque fois** qu'elle est le sujet de la phrase
    (`vie`, `mort`, `santé`, `milieu`, `menace`), et le terme cité entre
    guillemets (`{violet}« vie »{/violet}`) ;
  - `coral` la conclusion d'une phrase ou d'un paragraphe, la thèse que
    l'argument établit, et ce que le texte « fait comprendre » ; sur
    l'intitulé d'une étape, son dernier membre (`Le principe de réaction est
    le **{coral}principe de la vie{/coral}**`) ;
  - `amber` l'articulation (les « trois temps » d'un paragraphe, chacun
    marqué), la thèse épistémologique (ce qu'on ne connaît que par ses
    effets), la nuance ou la prudence, la phrase de synthèse ;
  - `yellow` les exemples, cas et images : les âges (l'enfant, l'adulte, le
    vieillard), le pouls du fonctionnaire et du marathonien, « l'un se nourrit
    de l'autre », la comparaison avec l'anatomie ;
  - `sky` les noms des commentateurs et des auteurs convoqués
    (`{sky}Huneman{/sky}`, `{sky}Canguilhem{/sky}`, `{sky}**Claude
    Bernard**{/sky}`) ;
  - `red` ou `pink` ce que l'auteur écarte (le calcul en physiologie, le
    mécanisme, les « considérations abstraites », l'essence), et le cercle
    vicieux qu'on lui oppose ; `green` le contraire retenu (l'« aperçu
    général », ce qu'une phrase pose comme réponse).
- **Une citation** se marque en `teal`, mais pas seulement ses guillemets :
  les mots clefs de la citation sont teintés aussi. On découpe donc la
  citation : guillemet ouvrant `{teal}« {/teal}`, puis en teal les membres
  décisifs, les mots de liaison restant nus, le guillemet fermant avec le
  dernier membre (`{teal}« {/teal}bientôt {teal}ils succomberaient{/teal}
  s'ils n'avaient en eux {teal}un principe permanent de réaction »{/teal}`),
  voir `content/philosophie.md`.
- **Gras d'intitulé** : il ne couvre que ce qui est dit, ponctuation
  comprise, et il se rompt autour d'une couleur (`**par une définition :**
  {violet}**la vie**{/violet} **est**`). Une question posée dans
  l'intitulé y est seule en gras (`**Que visent les « considérations
  abstraites » ?**`), sans phrase de précaution sur les sources.
- Reporter ces marques dans les cartes-explication (gras sur les termes clés
  et les conclusions, souligné sur les prémisses), et **garder les retouches
  de l'utilisateur** lors d'une réécriture.

**Paragraphe long, découpé en extraits** (une fiche linéaire qui explique
extrait par extrait) : une seule leçon pour le paragraphe, dont le rappel
s'ouvre sur une vue d'ensemble du mouvement (affichée avec le paragraphe
entier : un tableau `Moment | Fragment | Ce qui s'y joue`, aux mêmes exigences
que le plan du texte, § 3), puis une section par
extrait, ouverte par `=== k Intitulé`, où k est le premier fragment de
l'extrait : elle s'affiche juste avant ses cartes, avec le texte qu'elle
couvre. Fragments numérotés à la suite dans le paragraphe (un extrait long en
couvre plusieurs) ; les cartes de chaque extrait à la suite, citations puis
explications. Plutôt qu'une leçon par extrait : « Lire le texte » montre
alors de vrais paragraphes.

Mise en forme : des paragraphes plutôt que des puces (les puces seulement
pour une énumération courte et vraiment parallèle), du gras pour l'idée
directrice, `*titre*`, `` `terme grec` ``. **Jamais d'italique à l'intérieur
d'un gras** (`**L'*Éthique* dit…**`) : l'analyseur ne sait pas les imbriquer
et affiche les astérisques ; sortir le titre du gras.

## 5. Les cartes-citation (d'abord)

- **Fidélité absolue** : le texte vient de la source fournie, mot pour mot,
  dans la traduction retenue ; jamais de mémoire.
- **Une carte répète son fragment entier**, entre `« »`, et porte son
  `fragment` ; un paragraphe court, cité d'un seul tenant, n'en a pas.
- **En cascade** : pour chaque fragment, une carte par morceau qui compte, le
  trou se déplaçant d'une carte à l'autre. La répétition est voulue.
- **Plusieurs trous** dans une carte quand les termes vont ensemble :
  `answer` les donne dans l'ordre, séparés par ` ; `.
- **La réponse est exactement le texte masqué**, même une phrase entière.

### Choisir les trous

Jamais au hasard. Le trou porte sur **ce qu'il faudrait restituer en citant
la phrase dans une copie**, et c'est le commentaire qui dit ce qui compte.

1. **La thèse de la phrase** : le sujet dont elle parle et ce qu'elle en
   affirme (« ___ est celle qui traduit la vertu qui reste » : « la vie la
   plus heureuse »). Puis les notions et termes techniques, puis les images
   et formules frappantes.
2. **Ce que le commentaire désigne comme décisif**, même si c'est une
   modalité ou une incise : chez Aristote, « à titre secondaire » est le cœur
   du passage selon Bodéüs et mérite sa carte. Une incise ne se troue pas
   parce qu'elle est une incise ; elle ne se laisse pas non plus de côté pour
   cette raison.
3. **Le groupe qui porte le sens**, pas un mot isolé qui en dépend : « qui
   leur est propre » (l'automotricité) plutôt que « mouvement considérable » ;
   « arrachés à leurs parents » (l'image) plutôt que « dès la naissance ».
4. **Pas de trou qui se devine** : un mot que le contexte ou une symétrie
   donne (« subjectif » après « purement objective », « la vertu morale »
   après « la vertu intellectuelle ») ; s'il compte, il partage sa carte avec
   un autre trou (« objective ; subjectif »). Pas de trou sur une remarque de
   méthode (« un exposé rigoureux outrepasse notre propos »).
5. **Pas de doublon parfait** : jamais deux cartes identiques, ni deux trous
   qui ne diffèrent que par un mot sans rien apprendre de plus (« humaines »
   puis « des actes humains »). En revanche, **garder** les cartes qui se
   recoupent pour varier l'information (trous différents sur la même phrase)
   ou pour apprendre une citation pas à pas : d'abord la partie A, puis A+B,
   puis A+B+C. Cette progression est voulue.
6. **Aucune thèse sans carte** : relire chaque fragment et vérifier que ce
   qu'il affirme d'essentiel a sa carte (« celui qui médite ne requiert aucun
   appui de ce genre »).
7. **Pas de carte sur un détail sans enjeu** : dans un récit ou une
   description, l'âge, une mesure, une incise de témoin ne se trouent pas
   pour eux-mêmes. Chez Montaigne, l'utilisateur a supprimé « très
   simple », « qui se disaient être », « quatorze mois tout juste »,
   « quatre doigts environ », « plus courts et plus menus », « La nourrice
   nous a dit aussi » ; il a gardé ce qui porte la thèse (« d'une forme
   ordinaire », « comme les autres enfants de son âge »).
8. **Le trou sur le noyau, son cadre visible** : le verbe introducteur, la
   conjonction ou le groupe qui amène l'idée restent dans la phrase, et le
   trou ne prend que ce qui la porte : « Je ___ » (« vis avant-hier »),
   « de peur que ___ » (« les événements ne viennent le démentir »),
   « se raccordant à ___ » (« une seule tête »), « pourraient bien
   constituer pour le roi ___ » (« un présage favorable »). C'est le pendant
   de la règle 3 : le trou s'élargit quand le mot seul ne dit rien
   (« pâtre du Médoc », « regard humain »), il se resserre quand ce qui
   l'entoure n'apprend rien.

## 6. Les cartes-explication (ensuite, en fin de paragraphe)

Elles font trouver ce qu'il faut savoir *sur* le paragraphe : la portée d'une
formule, le sens d'une image, un terme technique et son grec, le contresens à
éviter, un renvoi, une note d'édition, un repère de localisation.

- **Source** : le commentaire, les notes, le rappel ; chaque carte reprend un
  point du rappel ou des notes, jamais une affirmation non attestée. Sans
  commentaire, le rappel ne vaut source que pour ce qu'il tire du texte ;
  le reste doit avoir été vérifié (§ 0, « Sans commentaire »).
- **Tout le commentaire**, digressions comprises : ce qu'il explique sans
  porter directement sur le texte (autres œuvres de l'auteur, notions de
  fond, débats, réception) se fait carte dès que cela aide à comprendre le
  texte, même indirectement. C'est ce qui ouvre l'unité sur les textes voisins
  qui comptent. Chaque carte va dans la leçon dont traite la section du
  commentaire (une section qui commente les lignes 3-4 va dans leur leçon ;
  un exposé de fond sans ligne précise, dans une leçon d'introduction ou,
  s'il vient après le texte dans le commentaire, de prolongement, à créer
  au besoin), et, dans cette leçon, **à sa place dans l'ordre du
  commentaire** parmi les autres cartes-explication : relire le scan page à
  page pour l'insérer au bon endroit. Le rappel en dit l'essentiel en une ou
  deux phrases.
- **Réponse unique, non paraphrasable** : un terme, un nom, une référence
  courte. Sinon, déplacer le trou sur un mot pivot.
- **Une référence se trouve entière** : « II, 31 », pas « 31 » ; livre et
  chapitre en deux trous (« XVI ; 8 ») plutôt qu'un trou sur l'un et
  l'autre en clair ; pas de variante en chiffres arabes dans `alt`.
- **Un renvoi à citer se fait cascade** : une citation d'un autre texte que
  l'unité fait apprendre (« Des boiteux », III, 11 ; « Sur la façon de
  ménager sa volonté », III, 10) ne tient pas en une carte au trou d'un
  mot. Elle est donnée en entier, précédée de sa référence (« *Les Essais*,
  III, 10, « … » : « … » »), et trouée comme une carte-citation : chacun
  de ses morceaux, puis le titre, puis la référence.
- **Un nom propre obscur** (un lieu, une institution) s'éclaire dans
  `explanation` sur sa carte (le Médoc : « un berger de la région du Médoc,
  au nord-ouest de Bordeaux »).
- **Mise en relief** : la notion en **gras**, ce qui la caractérise ou la
  justifie en __souligné__, comme l'utilisateur l'a fait dans presque toutes
  les cartes-explication de Montaigne.
- **Carte autonome** : elle revient seule en révision ; pas de « ce
  passage », « cette formule » sans les rappeler.
- **Portée visible** : la phrase dit pourquoi le point compte.
- **Jamais** de référence à la source (« selon le texte »), de terme inventé,
  de localisation tournée en question.
- **Un commentateur** n'est une réponse que s'il y a un débat réel (deux
  lectures qui s'opposent) ; sinon son nom va dans la phrase. Ne jamais
  attribuer une position à un nom qu'aucune source fiable n'atteste.
- Mise en forme permise dans la phrase : `*titre*`, `` `terme` ``, gras.

**Ouverture** (facultative) : un prolongement hors du texte, en leçon
`<id>-ouverture`, `label: "Ouverture"`, avec son texte et au moins une carte.

**Ponctuation** : aucun tiret cadratin (—) hors des guillemets français ;
dans une citation, garder ceux de l'auteur.

## 7. Partir d'un export Quizlet

Quand l'utilisateur fournit ses propres cartes (une par ligne,
`recto :: verso`, le recto commençant souvent par `§n, <intitulé> : ` et une
citation finissant par `(k/n)`), les reprendre **telles quelles** et les
structurer avec un court script Python (lancé avec `PYTHONUTF8=1`) :

- `§n` et l'intitulé donnent la leçon ; `(k/n)` devient `fragment` ; une
  carte sans préfixe appartient au paragraphe en cours.
- **Texte intégral** : remplir les trous des cartes-citation de chaque
  fragment et vérifier que toutes donnent le même texte ; une divergence
  trahit une coquille, à corriger et à signaler.
- **Ordre** : cartes-citation puis cartes-explication, l'ordre du fichier
  gardé dans chaque groupe.
- Appliquer ensuite la règle des trous (§ 5) et proposer les rappels et
  l'introduction (§ 3, § 4) ; corriger seulement les coquilles évidentes, et
  signaler le reste sans le réécrire.

## 8. Valider sans bruit

```bash
npm run content:check 2>&1 | grep -E -A4 "✗|<id>" ; npm run content:check 2>&1 | grep -c "Contenu valide"
```

Ne lire que les erreurs (`✗`) et les remarques qui citent l'unité. Ne pas
ouvrir l'app dans le navigateur : l'utilisateur regarde l'unité en ligne.

## 9. Relire avant de terminer

Pour toute l'unité, vérifier :

- [ ] des leçons d'introduction si le texte est difficile, et de
      prolongement pour les portées, les confrontations et ce que le
      commentaire développe après le texte, chacune avec son rappel et ses
      cartes ; aucune portée ni confrontation dans une leçon de texte ;
- [ ] un rappel complet (thèse, argument, tableau s'il y a lieu, piège) pour
      chaque paragraphe ;
- [ ] chaque trou choisi d'après la règle (§ 5) : thèse d'abord, ce que le
      commentaire juge décisif, pas de trou qui se devine, pas de doublon,
      aucune thèse sans carte ;
- [ ] chaque carte-explication attestée par une source ; les points douteux
      signalés, pas appris ;
- [ ] tout le commentaire couvert, digressions comprises, chaque carte dans
      la bonne leçon et dans l'ordre du commentaire (§ 6) ;
- [ ] pas d'italique dans un gras, pas de tiret cadratin hors citation ;
- [ ] sans commentaire : l'analyse écrite avant la première leçon, et ce
      qui ne sort pas du texte vérifié ou signalé ; les renvois cités dans
      la traduction de l'unité, d'après son édition ; des portées choisies
      pour ce texte, passées domaine par domaine (§ 0), qui apprennent du
      neuf au lieu de récapituler ;
- [ ] `version:` du cours incrémentée.

## 10. Terminer

1. Dernière validation (§ 8).
2. Commit sur `main` et push, sans demander (règle du projet), message en
   français : « Ajoute l'unité de texte <titre> (<cours>) », avec en corps
   les leçons et les cartes, et ce qui a été corrigé ou laissé de côté. Faire
   `git fetch` avant de pousser.
3. Rapporter en quelques lignes : leçons et cartes créées, passages
   illisibles ou douteux, points à vérifier sur le texte ; sans commentaire,
   les sources consultées et les choix d'interprétation.

Les fichiers écrits restent en fins de ligne LF : en Python, écrire avec
`newline=''` après avoir normalisé `\r\n` en `\n`.
