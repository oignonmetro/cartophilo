# Écrire du contenu

Tout le contenu vit ici, en YAML. Aucun code à toucher pour ajouter du
vocabulaire, des règles ou des tableaux de conjugaison.

```
content/courses/<id>/
├── course.yaml        métadonnées, agencement, et ordre des unités
└── units/
    ├── v1.yaml        une unité par fichier, le nom du fichier = son id
    └── …
```

Après toute modification :

```bash
npm run content:check   # valide sans rien écrire (ce que fait la CI)
npm run content:build   # compile vers public/content/
```

## Les deux agencements

`course.yaml` déclare un `layout`, qui décide de l'écran d'accueil.

- **`path`** : parcours guidé, les leçons se suivent, la première étoile
  débloque la suivante.
- **`library`** : accès libre, des **pistes** s'affichent en onglets, et
  l'apprenant choisit ses unités dans l'ordre qu'il veut. C'est le cours
  d'exemple (`demo`).

Un contenu qui exige un ordre n'appelle pas pour autant `path` : le parcours
*interne* d'une unité est déjà ordonné (leçon, révision, consolidation, séance
finale), seule la bibliothèque qui les contient est libre. Un alphabet en
profiterait ainsi, ses lettres et les mots qui les réemploient tiendraient
dans une seule unité, dont l'ordre des leçons garantirait qu'on ne lit jamais
un signe qu'on n'a pas appris.

## Les trois natures de contenu

Une piste déclare son `kind` une seule fois ; le compilateur le propage aux
unités puis aux leçons. Les fichiers d'unités n'ont donc pas à le répéter.

| `kind` | Données | Exercices générés |
|---|---|---|
| `vocab` | `vocab:` (mots et traductions) | association, QCM, phrase à trou, saisie |
| `grammar` | `points:` (phrases trouées) | rappel de cours, phrase à trou (banque puis clavier) |
| `conjugation` | `verbs:` (verbes et leurs formes) | rappel, association personnes/formes, production |

## Ajouter un mot (`kind: vocab`)

```yaml
- id: b2-to-tackle        # identifiant unique dans tout le cours
  term: to tackle         # le mot en anglais, verbe à l'infinitif
  translation: s'attaquer à
  alt:                    # autres réponses acceptées au clavier
    - aborder
  pos: verbe              # facultatif
  hint: …                 # facultatif : remarque affichée à la découverte
  gap: tackled            # facultatif : voir ci-dessous
  example:
    text: No government has seriously tackled the issue.
    translation: Aucun gouvernement ne s'est sérieusement attaqué à la question.
```

La phrase d'exemple sert à générer l'exercice à trou. Le compilateur y cherche
le terme, puis sa forme sans « to ». Quand le verbe est conjugué de façon
irrégulière dans l'exemple (`fell through` pour `to fall through`), indiquez la
forme exacte à masquer avec **`gap`**. Sans cela, la validation échoue plutôt
que de laisser un mot sans exercice.

Soyez généreux sur **`alt`**. En saisie, seules `translation` et `alt` sont
acceptées : sans variantes, un apprenant qui tape « bouillir » pour
`to boil` (traduit « faire bouillir ») est compté faux alors qu'il sait le
mot. La règle utile : dès que la traduction fait plus d'un mot, demandez-vous
ce qu'un francophone taperait spontanément, et ajoutez-le.

Une leçon de vocabulaire a besoin d'**au moins quatre mots** : en dessous,
l'exercice d'association ne peut pas se construire.

Aucun mot n'a d'écran de présentation à part : sa première rencontre se fait
déjà dans un exercice qui compte (association d'abord, où la bonne réponse
est toujours visible à côté). Autant dire que **`example` mérite d'être
rempli systématiquement** : c'est de lui que dépend la phrase à trou, le plus
indulgent des premiers contacts avec un mot nouveau.

## Ajouter un point de grammaire (`kind: grammar`)

```yaml
- id: g1-l1
  title: Le conditionnel mixte
  notes: |                       # rappel affiché avant la pratique
    Le conditionnel mixte relie une hypothèse passée à une conséquence présente.
    - Hypothèse passée : If + past perfect
    - Conséquence présente : would + base verbale
  points:
    - id: g1-mixed-1
      sentence: If I had taken that job, I ___ in Berlin now.   # ___ obligatoire
      answer: would be
      alt: []                    # autres formulations acceptées
      options:                   # facultatif : joue en banque de formes
        - would be
        - would have been
        - will be
      translation: Si j'avais accepté ce poste, je serais à Berlin maintenant.
      explanation: Hypothèse passée mais conséquence présente.
```

Quand `options` est fourni, l'exercice se joue en choisissant parmi ces formes
au premier passage, puis au clavier ensuite ; sans `options`, il est au clavier
d'emblée. Une leçon a besoin d'au moins trois points.

### Écrire un rappel de cours (`notes`)

`notes` est du texte brut, mais quatre conventions structurent l'affichage.
Elles valent aussi bien pour la grammaire que pour la conjugaison.

```yaml
notes: |
  Les modaux ne se conjuguent pas : pas de -s à la troisième personne,
  pas de « to » après eux, et pas d'auxiliaire « do » à la négation.

  - can → could, will → would, may → might.
  - must : pas de passé propre, on emploie « had to ».
    I had to leave early.

  ! « She cans » et « she can to swim » sont fautifs.
```

| Écriture | Rendu |
|---|---|
| lignes qui se suivent | un seul paragraphe, repliez librement à 80 colonnes |
| ligne vide | sépare deux paragraphes |
| `- …` | une règle, dans un panneau teinté ; les règles voisines forment une liste |
| `- étiquette : …` | l'étiquette passe en gras coloré (jusqu'à ~48 caractères) |
| ligne indentée sous une règle | l'exemple de cette règle, en italique |
| `! …` | un piège, encadré en ambre |
| `\| … \| … \| …` | une rangée de tableau ; la ligne suivante qui commence aussi par `\|` en ajoute une autre |

Cinq marqueurs enrichissent le texte, dans les paragraphes comme dans les
règles ou les pièges :

| Écriture | Rendu | À réserver à |
|---|---|---|
| `` `will` `` | mot étranger en italique | une forme citée au milieu du français |
| `**texte**` | gras | l'idée directrice, une opposition |
| `__texte__` | souligné | le mot qui décide, dans une règle |
| `*texte*` | italique | une nuance, une glose, un titre d'œuvre |
| `{violet}texte{/violet}` | teinté (gras) | distinguer deux notions qui reviennent tout au long d'un rappel |

`{couleur}…{/couleur}` accepte les dix teintes déjà en usage ailleurs dans
l'app : `teal`, `violet`, `coral`, `amber`, `sky`, `yellow`, `green`, `red`,
`orange`, `blue`. Utile pour opposer deux notions sur toute la longueur d'un
rappel (une thèse et l'objection qui lui répond, un auteur et son
commentateur) plutôt qu'à l'intérieur d'une seule phrase, où le gras suffit
déjà ; deux ou trois couleurs par rappel au plus, au-delà l'effet se perd.
Peut contenir du gras (`{amber}une **thèse** centrale{/amber}`), mais pas
l'inverse : une couleur ne s'ouvre pas à l'intérieur d'un gras.

Le plus utile des quatre premiers est `` `will` `` : sur `` `must have` ``,
l'œil repère la forme étrangère sans avoir à lire la phrase. Les trois
suivants se paient en
lisibilité dès qu'on en abuse (deux ou trois par rappel suffisent).

**Le tableau** croise deux classifications plutôt que d'égrener leurs
combinaisons en liste (utile en philosophie pour une notion qui se divise
selon deux axes, comme la finalité kantienne en subjective/objective et
formelle/matérielle) :

```
|              | Subjective | Objective |
| **Formelle** | …          | …         |
| **Matérielle** | …        | …         |
```

La première ligne pose les colonnes (sa première cellule, le coin, ne
s'affiche pas) ; chaque ligne suivante ajoute une rangée, son étiquette dans
la première cellule. Contrairement au reste de `notes`, une rangée ne se
replie jamais : elle doit tenir sur une seule ligne du fichier, même
longue, d'où l'intérêt d'y garder des cellules courtes (une notion, une
glose), pas des phrases entières.

Un titre d'œuvre s'italicise toujours (`*Fondements de la métaphysique des
mœurs*`, `*Critique de la faculté de juger*`), toujours traduit en français
quand l'auteur n'écrit pas en français, jamais laissé dans une langue tierce
(l'anglais d'un titre déjà traduit ne sert à rien) : c'est `*texte*` qu'il
faut alors, jamais `` `terme` `` (réservé à une forme citée hors titre, un
mot, une expression), pour ne pas confondre deux marqueurs qui rendent tous
deux en italique mais ne signalent pas la même chose.

**Vocabulaire seulement (`kind: vocab`) :** une ligne ne portant que `===`
coupe le rappel en plusieurs sections. Chacune s'affiche avant le bloc de
mots qui lui correspond (le premier avant les trois-quatre premiers mots, le
second avant les suivants, etc.), plutôt que tout dire avant le premier
exercice. Utile dès qu'un rappel est trop long à lire d'un coup, ou couvre
plusieurs idées qui gagnent à arriver au fil de la leçon plutôt qu'en bloc.
Sans `===`, tout le texte reste un seul rappel, affiché avant le premier
bloc.

Le premier paragraphe est l'attaque du rappel : il s'affiche plus grand et
plus sombre. Écrivez-y l'idée directrice, et laissez les détails aux règles.

Un commentaire final entre parenthèses est automatiquement mis en retrait :
`- I will call you as soon as I arrive. (jamais « as soon as I will arrive »)`.

**Une règle peut se replier librement**, comme la prose : tant que sa ligne
reste en suspens (sans point final), la ligne indentée suivante la poursuit.
C'est la ponctuation qui décide, pas l'indentation.

```yaml
  # le corps se poursuit : « superlatif. » complète la règle
  - `much`, `far` et `a lot` renforcent __un comparatif__, jamais un
    superlatif.
    much better, far more expensive   # ← l'exemple, la règle étant achevée
```

Corollaire : **terminez une règle par un point** dès que la ligne indentée qui
suit doit être lue comme son exemple. Sans cela, l'exemple serait recollé à la
règle. Une règle qui se termine par une forme citée (`` …`Children learn
fast.` ``) est bien considérée comme achevée : l'accent grave ne la laisse pas
en suspens.

La validation signale par ailleurs tout accent grave orphelin, qui s'afficherait
tel quel à l'écran.

## Ajouter un tableau de conjugaison (`kind: conjugation`)

```yaml
- id: c1-l2
  title: Present perfect
  notes: |
    have / has + participe passé.
  verbs:
    - verb: to see
      translation: voir
      tense: present perfect     # titre du paradigme, affiché comme étiquette
      note: have / has + seen, jamais « have saw ».
      forms:
        - id: c1-see-pp-1
          person: I / you / we / they   # libellé de la forme demandée
          answer: have seen
          alt: ["'ve seen"]
        - id: c1-see-pp-3
          person: he / she / it
          answer: has seen
```

`person` est le libellé de la forme demandée : ce peut être une personne, mais
aussi « prétérit » ou « participe passé ». Chaque verbe a besoin d'au moins
deux formes, et la leçon d'au moins quatre au total.

Deux formes identiques dans un même verbe (`sought` / `sought`) ne posent pas
de problème : l'association compare les libellés, pas les identifiants.

## Ajouter une unité

1. Créer `units/v5.yaml` (le nom du fichier doit être l'`id` de l'unité).
2. Référencer `v5` dans la liste `units:` de la piste (ou de la section).

```yaml
id: v5
title: Le monde universitaire
subtitle: Lire un article de recherche    # facultatif
icon: book                                 # wave, people, cup, clock, compass, book
color: teal                                # teal, violet, coral, amber, sky
level: B2.2                                # facultatif : repère affiché, n'impose rien
lessons: …
```

Une unité oubliée dans `course.yaml`, ou référencée sans fichier, fait échouer
la validation : le contenu ne peut pas contenir de trou.

### Regrouper plusieurs unités sous un même repli

`group` (facultatif) rassemble sous un même en-tête repliable les unités
*consécutives* qui le partagent, dans la bibliothèque (`layout: library`)
seulement :

```yaml
id: ea2
title: La déduction du jugement de goût et ses débats
group: L'esthétique de Kant   # même valeur que ea1, ea3, ea4, ea5
```

Utile dès qu'une piste couvre plusieurs unités sur un même auteur ou une
même œuvre : sans lui, cinq unités s'étalent l'une sous l'autre dans la
liste ; avec lui, elles se replient derrière un seul en-tête, dans l'ordre
où elles sont déclarées. Une unité sans `group` reste seule, comme avant ce
champ ; deux plages du même `group` séparées par une unité d'un autre
`group` forment deux replis distincts plutôt qu'un seul.

## Publier le squelette d'un niveau avant son contenu

Une piste (`kind: library`) peut avoir `units: []`, aucune unité. L'écran
affiche alors un état « à venir » pour cette piste plutôt qu'une page vide qui
ressemblerait à un bug. C'est ainsi que les niveaux B1 et C1 ont existé dans
le sélecteur avant d'avoir leur contenu ; aujourd'hui les trois cours sont
remplis, mais le mécanisme reste disponible pour ouvrir un nouveau niveau
avant de l'écrire.

## Le cours proposé par défaut

Un seul cours devrait porter `default: true` dans son `course.yaml` : c'est
celui que l'app ouvre tant que l'apprenant n'a rien choisi lui-même via le
sélecteur de niveau (le badge drapeau + niveau, en haut de l'écran). Sans ce
marqueur explicite, le premier cours par ordre alphabétique de dossier ferait
office de défaut (ce qui a réellement affiché un niveau vide en premier avant
que ce champ n'existe). Aujourd'hui c'est `demo` qui le porte.

## Archiver un cours

`status: archived` dans `course.yaml` retire le cours de la sélection sans rien
supprimer : le contenu reste versionné et validé par la CI, et il suffit de
repasser le champ à `available` pour le remettre en service. Un apprenant qui
avait ce cours sélectionné bascule automatiquement sur le cours par défaut.

La compilation échoue si **tous** les cours sont archivés.

## Publier une mise à jour de contenu

Incrémenter `version:` dans `course.yaml`, puis pousser sur `main`. Le
déploiement GitHub Pages régénère les fichiers, et les installations existantes
proposent la mise à jour au prochain démarrage avec du réseau.

## Ce que la validation vérifie

- identifiants uniques (éléments et leçons) sur tout le cours ;
- traduction distincte du terme (signalée en remarque, pas bloquante) :
  une carte « motif → motif » n'enseigne rien et l'association afficherait le
  même mot des deux côtés. Donnez une traduction qui informe, et gardez la
  forme identique dans `alt` ;
- verbe noté à l'infinitif (`to yield`), remarque : c'est la convention du
  corpus, et elle indique la forme attendue à la saisie ;
- deux mots d'une même leçon qui accepteraient la même réponse, remarque :
  la saisie ne peut plus les distinguer, et le couple perd son intérêt ;
- nom de fichier d'unité cohérent avec son `id` ;
- toute unité référencée existe, et toute unité existante est référencée ;
- au moins 4 mots par leçon de vocabulaire, 3 points par leçon de grammaire
  (sauf leçon de texte, voir `content/textes.md`), 4 formes par leçon de
  conjugaison ;
- pas de terme en double dans une leçon, ni de personne en double dans un verbe ;
- phrases d'exemple dont la forme à masquer est réellement présente ;
- phrases de grammaire contenant le marqueur `___`, et réponse figurant bien
  parmi les `options` quand il y en a.

## Ce que la validation surveille en plus : la difficulté

Les contrôles ci-dessus valident la structure. Ceux qui suivent vérifient
qu'un exercice **teste bien ce qu'il prétend tester** (`tools/content/difficulty.ts`).
Ce sont des remarques, jamais des erreurs : ce sont des heuristiques, elles se
trompent parfois, et c'est à vous de trancher.

Une seule règle les commande tous : **un distracteur doit être faux pour la
raison qu'enseigne le point.** Un distracteur qu'on écarte autrement laisse
résoudre l'exercice sans la règle visée, et la leçon cesse alors de valoir son
niveau sans que rien ne le signale.

- **Distracteur impossible à l'oreille** : un « an » devant un son de consonne
  (`an car`) s'élimine par la seule règle a/an, sans rien savoir de la règle
  testée. Le contrôle se tait quand le point porte justement sur a/an.
- **Distracteur qui casse l'accord** : dans « ___ in this bottle is not
  drinkable », l'option « The waters » se repère à l'accord avec `is`, pas à la
  règle d'article. Même chose pour un attribut au pluriel nu après `is`
  (« she is now researchers »). Le contrôle se tait quand le trou est
  lui-même le verbe, l'accord étant alors ce qu'on enseigne.
- **Paire de conjugaison qu'un seul mot sépare** : « will win » et
  « will not win » se relient en repérant `not`, sans rien savoir de la
  construction. Opposez deux constructions réelles (« would have passed » /
  « would pass »). Toléré en B1, où la négation et la question sont encore
  l'objet du cours ; signalé à partir de B2.
- **Phrase reprise d'un cours à l'autre** : un niveau qui rejoue l'exemple du
  niveau précédent n'approfondit rien, même quand la règle affichée diffère.
  Vaut pour les phrases d'exercice comme pour les exemples des cartes.

Attention à un piège plus discret : l'application n'affiche que **deux**
distracteurs, tirés au hasard parmi ceux que vous fournissez
(`GRAMMAR_CHOICE_SIZE` dans `src/engine/exercises.ts`). Un distracteur faible
parmi quatre options ne dilue pas l'exercice, il le remplace deux fois sur
trois. Mieux vaut trois options solides que quatre inégales.
