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

Avant d'écrire, lire les titres et sous-titres des entrées existantes
(`grep -h "^title:\|^subtitle:" content/courses/<cours>/units/g-*.yaml`) :
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

NotebookLM, une question à la fois, en rappelant chaque fois l'auteur et la
notion (règles de `cours-traite` § 1 bis) :

1. « Chez Plotin, dans la traduction GF : où la notion de X (*terme grec*)
   est-elle établie ou définie ? Donne les deux à quatre passages décisifs,
   avec traité, chapitre et lignes, et ce que chacun établit. »
2. « Chez Plotin : quels sens ou emplois distincts la notion de X a-t-elle,
   et quelles distinctions commande-t-elle ? Pour chacun, un passage de la
   traduction GF avec ses repères. »
3. Relances, pour chaque emploi que je ne saurais pas expliquer à quelqu'un
   qui ne croit pas Plotin : « Je ne comprends pas pourquoi … explique pas
   à pas, avec l'exemple que donne Plotin. »

Puis poser à l'utilisateur, en une fois (`AskUserQuestion`), ce que les
sources ne tranchent pas, en particulier **le partage** quand il est
discutable : faut-il une sous-entrée pour tel sens, une entrée de
distinction pour telle division ?

## 3. Écrire le rappel

Une leçon, un rappel, qui tient sur un écran ou un peu plus. S'il déborde,
c'est qu'il traite deux notions : en sortir une, qui deviendra une entrée,
et la remplacer par un renvoi.

- **L'attaque dit ce que la notion fait**, pas sa définition de dictionnaire :
  « Chez Plotin, la conversion est le mouvement par lequel ce qui procède se
  retourne vers sa source, et c'est ce retournement qui le constitue. »
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
  (GF, mot pour mot, entre `« »`) et expliqué, avec un repère de la forme
  **« (traité 30, chap. 10) »**, partout et à chaque fois : le numéro
  chronologique et le chapitre, sans la numérotation des Ennéades, même à
  la deuxième occurrence d'un traité ; « (traité 45, chap. 3, l. 36-38) »
  quand les lignes sont sûres.
- **Les termes techniques grecs en violet**, en plus de l'italique :
  `{violet}*pollakhôs legomenon*{/violet}`.
- **Ce qu'elle n'est pas** : le contresens principal, désamorcé dans le fil
  du rappel ou par un piège `! …` en fin. **Un piège ne répète pas un
  paragraphe** : si une étape du rappel dit déjà que l'Un est au-dessus de
  la vie, le piège « l'Un n'est pas la vie première » est en trop. Les
  pièges sont réservés aux contresens que le fil ne désamorce pas lui-même.
- **Les renvois** (§ 4) là où le rappel touche une notion qui a, ou aura,
  son entrée.
- **Repères** : la GF ne marque ses lignes que toutes les cinq. Donner le
  chapitre seul (« (traité 46, chap. 3) »), sauf si une note ou une notice
  fixe les lignes (« (traité 45, chap. 3, l. 36-38) »). Jamais une ligne
  déduite.
- **Citer des phrases qui se tiennent.** Une citation tronquée qui ne se lit
  plus seule (« … et qu'elle a une signification… ») se coupe en deux
  citations entières plutôt que de garder un « […] ».
- **Pas de guillemets autour d'un intitulé** (« vie végétative, sensitive,
  psychique » écrit comme une étiquette) : `gf.py verifie` le prend pour une
  citation introuvable. Les guillemets sont réservés au texte de la GF.
- Mise en relief, couleurs, grec en italique, tableaux, interdits : comme
  `cours-traite` § 4.

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
  aligne deux ou trois longues citations par étape se lit comme un pavé
  turquoise. La citation complète va aux cartes en cascade.
- **Le titre et son terme grec disent la même chose** : « Vie parfaite
  (`teleia zôê`) », pas « Vie véritable (`teleia zôê`) ». Un terme grec que
  la GF ne donne pas ne s'écrit pas.

**Deux micro-sections closent le rappel** :

- **Passages clefs**, pour une notion, après les étapes : un tableau
  « Passage | Ce qu'il établit », une ligne par lieu décisif
  (« traité 30, chap. 10 | la vie a pour cause ce qui la dépasse »), cases
  courtes et distinctes. Le régler dans `tables:` (banque sur « Ce qu'il
  établit », case seule sur « Passage ») : sans réglage, une colonne de
  repères rangée par numéro serait prise pour un plan à remettre dans
  l'ordre.
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

Dans l'application, le renvoi est souligné en pointillé et ouvre l'entrée
visée dans une feuille, par-dessus l'écran en cours, sans quitter la leçon
(`NoteRefSheet`) ; l'éditeur visuel le garde tel quel. `content:check`
refuse un renvoi dont la cible n'est pas une unité du cours, et signale un
renvoi glissé dans une carte.

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
subtitle: <une ligne, ce que la notion fait>
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
  ou par son nom usuel (« Trois vies »).
- `group:` réunit sous un même repli des entrées consécutives d'une même
  famille (voir Multiplicité) ; ne l'employer qu'après accord de
  l'utilisateur.
- **Branchement** : ajouter l'identifiant à `units:` de la piste
  `glossaire` dans `content/courses/<cours>/course.yaml`, à côté de l'entrée
  générale pour une sous-entrée, sinon en fin de liste. D'autres sessions
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
   cartes : abstrait ? contresens possible ? argument à déplier ?
2. `npm run content:tidy -- <fichiers>`, `npm run content:check` jusqu'à
   « Contenu valide », puis pour Plotin
   `python -I .claude/skills/cours-traite/gf.py verifie <fichier> <id de la leçon>`
   et `… reprises …` : aucune citation introuvable, aucune reprise sans
   guillemets.
3. `npm run content:build`, regarder le rendu de l'entrée dans le navigateur
   intégré.
4. Incrémenter `version:` du `course.yaml`.
5. Commit (« Plotin, Glossaire : … ») et push, sans demander.
6. Rendre compte en quelques lignes : ce que l'entrée établit, les renvois
   posés (et les renvois inverses ajoutés), les cartes dont la progression
   repart de zéro ; puis, par `AskUserQuestion`, les entrées que le partage
   a fait apparaître sans qu'on les écrive, à créer ensuite ou non.
