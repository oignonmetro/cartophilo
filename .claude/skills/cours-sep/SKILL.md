---
name: cours-sep
description: Écrit le cours tiré d'un article de la Stanford Encyclopedia of Philosophy (piste Idées de La vie, ou un domaine du Hors-programme) à partir du PDF de l'article et, quand l'auteur étudié le demande, des passages français que fournit l'utilisateur : une unité par grand ensemble de sections, une leçon par section, rappels qui déplient les arguments, mise en relief au mot près, cartes alignées sur le rappel ; citations reprises du texte français, jamais retraduites ; branchement dans la piste, validation, commit et push. Reprend ce que les retouches de l'utilisateur sur ces cours ont de systématique ou de tendanciel. À utiliser dès qu'on donne un article de la SEP pour en faire un cours, qu'on dit « faisons pareil » sur un nouvel article, ou qu'on demande de reprendre un cours `sep-…`.
---

# Écrire un cours tiré d'un article de la SEP

Le cours porte sur **ce que l'article fait comprendre de l'auteur ou de la
question**, pas sur l'article. Le fond et le format suivent
`content/philosophie.md` (règle d'or, six familles de points, code couleur,
`kind: grammar`, déroulé section par section, passe de clarification). Cette
skill y ajoute la conduite propre à ces cours, et ce que l'utilisateur corrige
en relisant : **le premier jet est exact mais allusif**, c'est lui qu'il faut
éviter.

## Où il va

- Piste **Idées** de La vie (`content/courses/la-vie/course.yaml`, ajouter les
  unités à `units`, après les autres groupes SEP ; l'ancienne piste SEP y a été
  fusionnée le 2026-11-06), ou le domaine voulu du Hors-programme.
- Fichiers `units/sep-<sujet>1.yaml`, `2`…, leçons `sep-<sujet>1-l1`…, même
  `group` (`"La biologie d'Aristote (SEP)"`), une `color` par groupe. Monter
  `version` du cours ; une autre session peut l'avoir montée entre-temps :
  relire le fichier juste avant.
- Ajouter le préfixe à la liste des groupes SEP de la piste Idées dans `CLAUDE.md`.
- En tête de chaque fichier, en commentaire : auteur et révision de l'article,
  sections couvertes, édition des citations, vocabulaire de la traduction,
  coquilles écartées, ce qui reste provisoire.

Modèles : `sep-arbio1` et `sep-psy1`, tels que l'utilisateur les a retouchés.

## Les citations

- **Jamais retraduites de l'anglais** quand l'auteur est un classique. Lire
  tout l'article, dresser la liste des passages utiles, et **les demander à
  l'utilisateur en une fois**, numérotés, avec l'œuvre, le chapitre et les
  lignes Bekker, Stephanus ou autre.
- **Contrôler chaque extrait reçu** : il arrive qu'il soit tronqué, qu'il répète
  le précédent ou qu'il porte sur un autre passage. Le dire avec le numéro, en
  citant ce qui manque ; en attendant, traduire depuis l'article et le signaler
  en tête du fichier.
- **Le vocabulaire est celui de la traduction citée, partout**, explication
  comprise (« intelligence » chez Bodéüs, jamais « intellect »).
- **Comparer par script** chaque fragment entre guillemets aux extraits reçus.
- La *Métaphysique* se cite par ses lettres (E, 1 ; A, 1 ; M, 10).
- **Pas de citation de philosophe laissée de côté**, surtout en bloc : entière
  dans le rappel, avec sa référence, et en cascade dans les cartes ; une
  paraphrase s'ouvre sur sa référence (« *Parties des animaux*, I, 1 : … »).
  Les phrases des commentateurs, elles, ne s'apprennent pas en morceaux (voir
  `content/philosophie.md`, « Un cours sur un auteur, tiré d'un commentaire »).
- Un doute sur une date, un nom, une citation se vérifie par une recherche ; on
  ne retire pas par prudence.

## Ce que les retouches corrigent

Tiré des retouches de l'utilisateur sur `sep-psy1` et `sep-arbio1`
(novembre 2026), le 3 novembre : deux unités, ce qui reste un échantillon. À
compléter à la prochaine relecture, et à déclasser si un point n'y revient pas.

### Systématique : présent dans les deux

1. **Déplier l'argument, ne pas le résumer.** Là où le premier jet alignait
   une formule et une citation, écrire ce qui manque : le principe, l'exemple,
   la conséquence, la conclusion. Pour *Parties des animaux*, I, 1 : pourquoi
   étudier une faculté oblige à étudier son objet (la sensation et les couleurs,
   les sons, les odeurs). Pour le triangle : la soustraction, attribut par
   attribut. Un exemple concret à chaque étape, sans jargon non expliqué
   (« réduction », « termes relatifs » ont disparu).
2. **Le relief au mot près, pas à la phrase.** Pas de phrase-thèse entière en
   vert et soulignée : `violet` sur le terme, `amber` sur chaque élément de la
   définition, `coral` sur ce qui en est établi.
3. **Les contrastes colorés par paire.** Deux membres d'une opposition ont leur
   marque : vert et rouge coupés à la virgule, rose et vert (`{pink}expérience…{/pink}`
   / `{green}savoir…{/green}`), même `amber` sur deux membres parallèles,
   l'italique sur le mot qui fait la différence (*ce qui* / *si*).
4. **Les pôles soulignés.** `__forme__` / `__matière__`, `__tous__` les états /
   `__états matériels__`. Le souligné tient aux pôles et aux prémisses.
5. **La question se voit.** Mise en gras ou en vedette, suivie de ses réponses
   (`{amber}__**L'âme relève-t-elle… ?**__{/amber}`, puis `**Oui, pour**` /
   `**Non, pour**` ; `**qu'est-ce qu'une véritable démonstration… ?**`).
6. **Le tableau porte le contenu.** Pas d'étiquettes rangées, à côté d'une
   explication dans un autre bloc : la citation y devient une colonne (les causes
   et la *Physique*), la notion s'y définit dans sa case (« **Le fait** (to
   hoti) : déterminer *si*… »), l'exemple prend la forme d'une question. Une case
   de plus de 60 caractères ne se demande jamais seule : régler les exercices en
   conséquence. Changer l'en-tête fait repartir le tableau de zéro en révision :
   le faire dès le premier jet.
7. **Le terme grec, à l'endroit où il sert.** (`apodeixis`, `prōton`, `zētēsis`,
   `epistēmē`, `nous` / `dianoia`) : donné dans l'explication, et il a sa carte.
8. **Moins d'à-côtés.** Tout ce que dit l'article n'a pas à rester : exemples
   secondaires (le père et l'enfant, la promenade), anecdotes, et jusqu'à une
   leçon entière sur l'état des sources (« Ce que nous ne savons pas »).

9. **Assez de cartes, et mises en relief.** Le premier jet du Manuel n'en
   donnait qu'une pour 300 caractères de rappel, sur des termes grecs pris au
   hasard, en laissant de côté les thèses. **La première carte d'une leçon porte
   son idée directrice** (la phrase d'ouverture en gras, le coral du premier
   paragraphe), et chaque paragraphe ouvert sur une thèse a la sienne : c'est
   ce qu'il faut retenir en premier. Interroger ensuite ce que le rappel met en
   relief, sans redondance ni répétition entre leçons, et mettre le relief dans
   la carte elle-même : voir « Le relief dans la carte » et « Ce qu'on
   interroge » dans `content/philosophie.md` (retouches d'`arvie1`, le
   2026-11-06 ; modèle : `arvie1-l1`).

### Tendanciel : vu une fois, net, à suivre

- **Dépasser l'article quand il ne donne que la conclusion.** Aller à la méthode
  de l'auteur dans le texte même : *Seconds Analytiques*, I, 5, absent de
  l'article, a remplacé un résumé. Le signaler en tête du fichier.
- **Finir par un pont vers le sujet du cours** : le principe du triangle
  rapporté à la biologie (ne pas expliquer la respiration espèce par espèce).
- **Gloser aussitôt une citation difficile** : « Autrement dit, … ».
- **Préférer l'explication à la citation** quand celle-ci ne s'entend pas seule ;
  et couper dans une citation ce que la phrase qui précède vient de dire.
- **Pas de reprise vague** : « si tout est ainsi commun » devient « si tout est
  commun à l'âme et au corps ».
- **Relief à l'intérieur d'une citation** : `__pourquoi__` / `__ce qu'est__`,
  `**réalité inhérente**`.
- **Citation longue découpée en teal** : le guillemet ouvrant `{teal}«{/teal}`,
  puis en teal les membres décisifs, les mots de liaison restant nus.

### Décidé par l'utilisateur

**Les couleurs suivent le code de `content/philosophie.md`** (harmonisé le
2026-11-05), sans écart propre aux cours SEP. Pour les citations : guillemet
ouvrant en teal, puis en teal les mots clefs, les mots de liaison restant nus ;
une citation courte peut s'écrire entière dans la couleur, `{teal}« … »{/teal}`,
dont l'application ne teinte que les guillemets (`quoteEdges`,
`src/content/notes.ts`).

## Déroulé

1. Lire l'article entier. Pour un classique, demander les passages (voir plus
   haut) ; tout le reste s'écrit sans question avant la relecture finale de
   l'utilisateur, sauf blocage réel (source absente).
2. Découper : une unité par grand ensemble de sections, une leçon par section.
   Écarter dès ce moment ce qui ne sert pas à comprendre l'auteur.
3. Écrire chaque leçon comme le dit `content/philosophie.md`, puis la relire
   contre « Systématique » ci-dessus, point par point. C'est cette relecture qui
   évite le premier jet allusif.
4. Après toute réécriture d'un rappel, **aligner les cartes** : aucune ne doit
   reposer sur une phrase, un exemple ou un mot retirés (« équilatéral » quand le
   rappel dit « isocèle »), et chaque nouvel argument a sa carte de pivot. Vérifier
   aussi le sous-titre de l'unité.
5. Avant de réécrire un fichier, `git status` et
   `python -I .claude/skills/glossaire/retouches.py <fichier>` : l'utilisateur
   retouche directement les YAML, et ses mises en relief se reportent.
6. `npx tsx tools/content/tidy-cli.ts <fichiers>`, `npm run content:check`,
   `npm run content:build`, et un coup d'œil au rappel dans l'application
   (`#/fiches/<unité>`).
7. Committer (« Ajoute le cours … (La vie, SEP), tiré de l'article de la SEP :
   N unités, M leçons (version V) ») et pousser. Le compte rendu dit ce qui n'a pas
   été vérifié et les passages encore manquants.
