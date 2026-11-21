---
name: explication-texte
description: Explique à fond un texte philosophique de concours (explication de texte d'agrégation, Marx, Plotin ou autre) dans un Claude Doc, en trois phases menées séparément et jamais d'un seul coup. D'abord le global (question, thèse, problématique, mouvements, provisoires). Puis une lecture linéaire en profondeur, très progressive, partie par partie et phrase par phrase, qui cherche l'argument implicite derrière chaque mot. Enfin un retour au global qui corrige thèse, problématique et découpage d'après ce que la lecture a appris. Le texte est lu dans son édition de référence, avec ce qui l'entoure ; le commentaire éventuel et les autres textes de l'auteur sont mobilisés dans le fil. À utiliser dès qu'on demande d'« expliquer ce texte », de « faire l'explication », d'identifier « la thèse, la problématique, les mouvements » d'un extrait, ou de préparer un texte avant d'en faire une unité-texte. Remplace, dans ce dépôt, la skill analyse-texte-philo-rapport-jury du compte claude.ai.
---

# Expliquer un texte, du global au détail et retour

Le produit est un **Claude Doc** qui permet de réexpliquer le texte de
mémoire, en partant de presque rien. Il sert souvent de base à une unité-texte
(skill `unite-texte`), qui en reprend le découpage et les explications.

Cette skill reprend la skill `analyse-texte-philo-rapport-jury` du compte
claude.ai, en y ajoutant ce que l'utilisateur a dû demander à la main sur le
Chapitre VI de Marx (unité `n1863`, novembre 2026) : sources lues dans leur
contexte, passe mot à mot, justification des parallélismes, retour au
global.

## Le principe : trois phases, beaucoup d'étapes, jamais tout d'un coup

L'erreur à éviter est d'écrire l'explication d'un trait : on fixe alors une
thèse et un découpage avant d'avoir compris le texte, puis on plie le détail
à ce cadre. Le travail se fait donc en **trois phases**, chacune faite
d'étapes distinctes :

- **Phase A, le global** : une première lecture d'ensemble, qui pose question,
  thèse, problématique et mouvements, **à titre provisoire**.
- **Phase B, la lecture linéaire en profondeur** : le texte repris dans
  l'ordre, partie par partie, puis phrase par phrase, puis mot par mot, en
  cherchant le moindre argument implicite.
- **Phase C, le retour au global** : ce que la phase B a appris sert à
  corriger, préciser ou refaire ce que la phase A avait posé.

**Une étape à la fois.** Chaque étape est une passe à part : relire le texte
(et le doc tel qu'il est, l'utilisateur ayant pu le retoucher), faire ce que
l'étape demande et seulement cela, écrire dans le doc, puis rendre compte en
quelques lignes dans la conversation : ce qui a été ajouté, ce qui a changé,
et ce que l'étape a fait apparaître pour la suite (une thèse à nuancer, une
coupure à déplacer). Par défaut, on s'arrête après chaque étape et
l'utilisateur relance ; s'il demande d'enchaîner, les étapes restent des
passes séparées, dans l'ordre, sans en fusionner deux. La phase B en
particulier ne se fait jamais en une fois : une étape par partie du texte au
moins.

## Exigence d'exactitude (la plus importante)

L'erreur typique est de renforcer le texte en le reformulant. Avant toute
formulation, vérifier contre le texte :

- **Le type de lien logique.** Une analogie (« de même que… ») rend plausible
  sans déduire ; une question rhétorique n'est pas une démonstration ; une
  distinction proposée n'est pas prouvée.
- **La force exacte des conclusions**, modalisateurs compris (« dans cette
  mesure », « sous un certain angle », « d'emblée »).
- **La portée des quantificateurs dans ses propres reformulations** (seul,
  tout, toujours, nécessaire) : sur quoi porte exactement le « seul » de
  l'auteur. Sur le Chapitre VI, « les forces productives, seule base d'une
  société libre » était devenu à tort « le capitalisme, seul chemin vers la
  liberté ».
- **Les prémisses implicites** : quand un « donc » ne tient qu'à une prémisse
  non formulée, la reconstruire et dire qu'elle n'est pas dans le texte.
- **Les gloses** : les mots qui viennent d'un commentateur ou de sa propre
  lecture sont signalés comme tels, jamais attribués à l'auteur.
- **La dépendance réelle entre arguments** : un argument présenté comme
  conséquence peut en fait fonder le précédent ; l'ordre de présentation
  n'est pas toujours l'ordre des raisons.
- **Ne pas séparer** un critère et sa preuve par l'exemple ; **ne pas
  fusionner** deux arguments distincts.
- **Pas de numéros de lignes inventés**, pas de renvoi à des numéros de
  paragraphe (§) dans le doc ; dire « le paragraphe suivant », « quelques
  lignes plus haut ».
- **Pas de citation de mémoire** d'une autre œuvre ni de référence précise
  dont on n'est pas sûr : vérifier par une recherche, et, si le doute reste,
  le dire. Vérifier plutôt que retirer.

## Sources

- **L'édition de référence.** Citer le texte et les autres œuvres de l'auteur
  dans la traduction de référence (chez Marx, celles de
  `content/courses/marx/traductions.md`, la GEME autant que possible ; pour
  le Chapitre VI, Éditions sociales 2010). Si l'utilisateur n'a fourni qu'une
  autre traduction, s'en servir sans la nommer : jamais « traduction de
  marxists.org » ni de mention de site.
- **Le contexte immédiat.** Quand l'œuvre entière est disponible (PDF,
  texte), lire les paragraphes qui précèdent et qui suivent l'extrait : c'est
  souvent là que l'auteur formule ce que le passage suppose ou en tire la
  conséquence en clair. Sur le Chapitre VI, « en tant qu'effort, dépense de
  force vitale » (juste avant), « la nature spécifiquement polarisée »
  (quelques lignes plus haut) et « simple personnification du travail pour
  le capital » (juste après) ont donné l'essentiel de la partie 1.2.
- **Le commentaire fourni** (article, chapitre, PDF Cairn) : une ressource,
  pas une autorité ; on en reprend ce qui éclaire, en lui attribuant ses
  thèses. Un PDF Cairn qui n'est pas en mode lecture (titre « | Cairn.info »,
  police Alegreya) se signale à l'utilisateur.
- **Le rapport de jury**, s'il est fourni : liste des points attendus,
  contresens signalés. S'il n'y en a pas, n'en pas chercher, ne rien
  attribuer à un jury, faire soi-même le travail qu'il attendrait.
- **Les autres textes de l'auteur**, mobilisés au moment où ils éclairent
  (pas dans une liste finale), avec leur référence précise, vérifiée en
  ligne en cas de doute.

## Phase A : le global, provisoire

Chaque étape est une passe ; le doc est créé à l'étape A1 avec ses sections
en attente.

- **A1. Mise en place.** Œuvre, référence exacte, date, édition ; place de
  l'extrait dans l'œuvre (ce qui précède et suit, d'après le contexte lu) ;
  cadre doctrinal minimal. Créer le doc : titre, Question, Thèse,
  Problématique, mouvements, Analyse de la structure, Conclusion.
- **A2. Question.** Le problème auquel le texte répond, en une question
  nette, et le débat dans lequel il s'inscrit.
- **A3. Thèse.** La réponse de l'auteur, en une ou deux phrases, quantificateurs
  vérifiés.
- **A4. Problématique.** La tension que la défense de la thèse doit surmonter
  (le défi : ce qui rend la thèse difficile à tenir, paradoxale, ou
  contraire à une évidence), formulée en question, avec les points du texte
  qui l'aggravent. Présentée comme hypothèse de lecture.
- **A5. Arguments.** Une phrase par argument, dans l'ordre du texte, puis
  vérification de chacune selon l'exigence d'exactitude, et liste corrigée.
- **A6. Mouvements.** Deux, trois ou quatre mouvements, chacun dit par sa
  fonction dans la stratégie argumentative et dans la résolution de la
  problématique. Puis chaque mouvement découpé en **trois ou quatre parties
  numérotées X.Y**, titrées par leur contenu (« 1.1 Le capitaliste,
  « capital personnifié » »), jamais « Argument n » ni « Sous-argument 2a ».
  Ces parties sont les sections (titres de niveau 3) où s'écrira la phase B.

Fin de phase A : dire à l'utilisateur ce qui reste incertain (une coupure
hésitante, une thèse qui pourrait être plus forte ou plus faible) ; la phase
C y reviendra.

## Phase B : la lecture linéaire en profondeur

Le texte est repris dans l'ordre, **une partie X.Y par étape au moins** (une
partie dense se fait en plusieurs étapes). Pour chaque partie, les passes
suivantes, dans cet ordre, chacune séparée :

- **B1. Ce que dit la partie.** Reformuler la phrase ou le segment au plus
  près, en langage ordinaire, avec un exemple concret ; dire sa fonction dans
  le mouvement.
- **B2. Mot à mot.** Prendre chaque terme et chaque locution qui porte du
  sens (substantifs techniques, verbes, connecteurs, adverbes, pronoms,
  incises, parenthèses, guillemets, singuliers génériques), un par un, et se
  demander pour chacun : pourquoi ce mot plutôt qu'un autre, ce qu'il veut
  dire ici, ce qu'il présuppose, ce qu'il exclut. Sur le Chapitre VI, la
  liste a couvert « fonctions », « valorisation », « souffrance, effort »,
  « substance », « crée et multiplie », « incorporé », « procès de
  production », « facteur vivant, variable », « par conséquent », « la
  chose », « en fait », « deviennent »… Traiter les points **un par un, pas
  d'un seul coup** : une définition ou une explication par point, ancrée
  dans le texte.
- **B3. L'implicite.** Chercher l'argument implicite derrière chaque phrase :
  - derrière chaque **« donc », « par conséquent », « puisque »** : la
    prémisse qui manque, reconstruite et signalée comme absente du texte ;
  - derrière chaque **« de même que », parallélisme ou symétrie** : ce qui
    *justifie* le parallèle, et non seulement le constat qu'il y en a un.
    Exemple : que le travailleur soit « travail personnifié » se comprend
    parce que le capital ne se valorise qu'en absorbant du travail, qu'il
    suppose donc en face de lui ce qu'il absorbe, et que le travailleur,
    ayant vendu sa force de travail, n'apporte au rapport que ce travail ;
    comprendre le premier pôle fait comprendre le second ;
  - derrière chaque **affirmation forte non argumentée** : ce qui la fonde
    ailleurs dans l'œuvre, ou le dire posé et non démontré ;
  - derrière chaque **réponse** : l'objection, formulée ailleurs, qu'il faut
    reconstituer.
- **B4. Les notions.** Définir chaque notion à l'endroit où elle sert pour
  la première fois, dans le fil de la phrase (« à savoir », « soit »,
  « c'est-à-dire »), sans glossaire séparé. Une notion à plusieurs sens
  (le travailleur « libre », libre de sa personne et « libre » de tout moyen
  de production, c'est-à-dire privé) : distinguer les sens, et rattacher
  chaque conséquence au bon sens, sans attribuer à l'un ce qui vient de
  l'autre.
- **B5. Les références.** Mobiliser à cet endroit les autres textes de
  l'auteur, le contexte immédiat et le commentaire qui éclairent la partie,
  citations vérifiées (édition de référence, recherche en cas de doute).
- **B6. Contresens et force.** Les contresens probables sur la partie (un
  encadré « on serait tenté de considérer que… »), et la mesure exacte de ce
  qu'elle établit.

À la fin de chaque partie, noter pour la phase C ce que la lecture a fait
apparaître sur le global (une thèse à nuancer, une articulation entre
mouvements différente de celle posée en A).

## Phase C : le retour au global

Chacune de ces étapes est une passe à part, qui relit tout le doc :

- **C1. Thèse.** La confronter à ce que la phase B a établi : trop forte, trop
  faible, mal centrée ; quantificateurs revérifiés ; la réécrire au besoin.
- **C2. Problématique.** Le défi est-il vraiment celui que le texte affronte ?
  Le reformuler d'après les tensions que la lecture linéaire a rencontrées.
- **C3. Découpage.** Mouvements et parties X.Y : une coupure à déplacer, une
  partie à scinder ou à fusionner, un intitulé qui ne dit plus ce que la
  partie fait. Reporter tout changement dans les renvois du doc (« partie
  X.Y »).
- **C4. Analyse de la structure.** En prose, mouvement par mouvement : ce que
  chaque partie établit réellement, comment elles s'appuient les unes sur
  les autres, où la démonstration est faible ; bilan qui relie la structure
  à la problématique.
- **C5. Conclusion.** Répondre à la question puis à la problématique (comment
  la tension se résout ou pourquoi elle demeure) ; ce que le texte laisse
  sans démonstration ; son originalité.
- **C6. Cohérence.** Traquer les contradictions entre le global et le
  détail : une thèse annoncée en tête que la partie 2.3 dément, une notion
  définie deux fois différemment, une formule qui se contredit elle-même,
  un renvoi vague.
- **C7. Fluidité.** Fluidifier et réordonner le développement **sans rien
  retirer** : transitions, ordre des paragraphes dans une partie, redites
  fusionnées en gardant tout le contenu.

## Style d'écriture du doc

- Français académique, phrases longues avec subordonnées, connecteurs
  logiques (donc, car, or, dès lors, ainsi, en revanche).
- Toujours « on », jamais « nous », « l'on » ni « je » ; les citations de
  l'auteur restent telles quelles.
- Jamais de tiret cadratin ; pas de point d'exclamation.
- Pas de gras ; pas de listes à puces dans la prose explicative (seulement
  pour la liste des arguments et la structure).
- Objections introduites par « on serait tenté de considérer que ».
- Tout terme technique reformulé en langage ordinaire et ancré dans un
  exemple concret.
- Paragraphe de synthèse à la fin de chaque mouvement, qui traduit
  concrètement ce qui a été établi.
- Références précises (œuvre, livre, chapitre) ; une citation n'est là que si
  elle fait avancer l'explication.

## Vers l'unité-texte

Quand l'utilisateur demande ensuite d'en faire une unité-texte, la skill
`unite-texte` reprend le découpage X.Y comme repères des leçons (`passage.label`
et `passage.part`) et les explications de la phase B comme matière des
rappels, notions en encadré `? terme : …` à leur première apparition.
