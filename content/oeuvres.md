# Écrire une unité-œuvre

Une unité-œuvre apprend à **se repérer dans une œuvre** : savoir où se trouve
chaque idée, associer une thèse à un endroit, et suivre le fil rouge (pourquoi
tel chapitre suit tel autre, lesquels sont de même plan, lesquels se déduisent
l'un de l'autre). Elle complète l'unité de texte (`content/textes.md`), qui
fait savoir citer un passage, et vaut pour toute piste : une œuvre du
Hors-programme, ou la piste Repérage de Marx et de Plotin.

Premier exemple : `hors-programme/units/rousseau-contrat-social.yaml`
(*Du contrat social*, livre II).

## Principe : on écrit le plan, pas les leçons

L'unité ne porte qu'un champ `work` : l'arbre de l'œuvre (livres, blocs de
chapitres, chapitres), ses thèses et ses relations. **On n'écrit pas
`lessons`** : le compilateur en dérive une leçon par partie de premier niveau
(un livre), et c'est de l'arbre que viennent les exercices.

```yaml
id: rousseau-contrat-social
title: "Du contrat social : le plan"
subtitle: "Rousseau · Livre II"
icon: map
color: red
group: "Rousseau, Du contrat social"
work:
  parts:
    - id: l2                        # un livre : une leçon
      label: Livre II
      parts:
        - id: l2-1-5                # un bloc de chapitres
          label: chap. 1-5
          question: Quelles sont les propriétés du pouvoir souverain ?
          parts:
            - id: l2-1              # un chapitre
              label: II, 1
              title: Que la souveraineté est inaliénable
              points:
                - id: cs2-1
                  sentence: "… « le pouvoir peut bien se transmettre, mais non pas la ___ »."
                  answer: volonté
            - id: l2-2
              label: II, 2
              title: Que la souveraineté est indivisible
              rel: declinaison       # relation avec la partie qui précède
              points: [...]
        - id: l2-6
          label: II, 6
          rel: consequence
          points: [...]
  links:                            # parties éloignées
    - from: l2-3
      to: l2-6
      rel: reprise
      points: [...]                 # cartes qui justifient le lien (facultatif)
```

Chaque partie (`parts`) porte :

| Champ | Rôle |
|---|---|
| `id` | identifiant, unique dans l'unité |
| `label` | emplacement : « Livre II », « chap. 1-5 », « II, 3 » |
| `title` | titre donné par l'auteur, tel quel (facultatif) |
| `question` | question à laquelle répond un **grand** bloc, dans sa bulle : **affichée, jamais interrogée** |
| `summary` | ce que la case d'un chapitre affirme, en réponse à la question de son bloc (« La souveraineté est inaliénable ») |
| `gloss` | ce qui précise l'affirmation, en italique sous elle (« = le peuple ne peut ni la céder ni se faire représenter ») |
| `rel` | relation avec la partie qui la précède au même niveau (jamais sur la première) |
| `points` | thèses de la partie, phrases trouées (même format qu'un point de grammaire) |
| `parts` | sous-parties |

Une partie sans sous-partie doit porter au moins une thèse : elle n'aurait
sinon rien à replacer dans le plan à trous.

**La carte se lit comme un schéma de manuel**, et c'est ce que `question`,
`summary` et `gloss` doivent servir (ils ne sont jamais interrogés) :

- **Une question par grand bloc seulement** (« chap. 1-5 : Quelles sont les
  propriétés du pouvoir souverain ? », « chap. 7-12 : Comment le peuple
  peut-il se donner de bonnes lois ? »). Un simple regroupement de chapitres
  (1 à 3 de même plan, 4 et 5, 8 à 10) n'a pas de question, donc pas de
  bulle : des questions emboîtées qui ne se répondent pas brouillent la
  progression au lieu de la montrer.
- **Chaque case répond à la question de son bloc**, par une affirmation
  claire, en mots simples : « La souveraineté est indivisible », pas le titre
  de l'auteur, qui n'est souvent qu'un intitulé (« Si la volonté générale
  peut errer ») ; le titre reste lisible en dépliant la case. Relire les
  cases d'un bloc à la suite de sa question doit donner le raisonnement de
  l'auteur.
- **La précision (`gloss`) tient en une ligne**, sans jargon ni citation :
  ce qu'on écrirait derrière un « = » dans un schéma.

`content:check` signale un chapitre sans `summary`.

**Emplacements** : « II, 3 » pour un chapitre, « chap. 1-6 » pour un bloc.
La carte, qui ne montre qu'un livre, écrit d'elle-même « chap. 3 » ; les
cartes de révision, qui reviennent seules, gardent « II, 3 ».

## Les relations

Liste fermée. Elle décide de la forme du plan et du choix des exercices ;
elle ne s'écrit jamais sur la carte, et ne fait l'objet d'aucun QCM « quel
est ce lien ? ». Une flèche suffit : le lecteur voit l'enchaînement, le mot
« conséquence » ou « limite » écrit dessus n'ajoutait que du texte.

| `rel` | Sens | Dessin |
|---|---|---|
| `declinaison` | même plan : une autre face du même objet | éventail depuis la bulle du bloc : côte à côte sur ordinateur, suspendues à un rail sur téléphone |
| `limite` | borne ce que la précédente vient de poser | flèche |
| `application` | cas particulier, mise en œuvre | flèche |
| `consequence` | se déduit de la précédente | flèche |
| `probleme-solution` | résout la difficulté que la précédente fait surgir | flèche |
| `changement-de-question` | ouvre une autre question | flèche |
| `reprise` | reprend une idée déjà formulée, pour un autre usage | flèche |
| `objection-reponse` | répond à une objection faite à la précédente | flèche |

`rel` ne relie que deux voisines. Pour deux parties éloignées (le chapitre 6
qui reprend une formule du chapitre 3), écrire un lien dans `links` : il se
dessine en **flèche pointillée** qui les joint par la droite. N'en écrire que
pour un lien qui se voit mal autrement : une longue courbe de plus entre deux
blocs déjà reliés par des flèches n'apporte rien. Un lien que l'arbre dessine
déjà (le chapitre 6 vers le chapitre 7, quand la flèche du chapitre 6 vers le
bloc 7-12 le montre) n'est pas retracé : il ne sert alors qu'à porter sa
carte.

## Les thèses

Toutes les règles de `content/philosophie.md` s'appliquent : un seul `___`,
une réponse unique et non paraphrasable, une phrase qui tient seule. Quelques
précisions propres à l'unité-œuvre :

- **La thèse doit se lire dans le plan.** Elle y est affichée complète,
  réponse soulignée, à côté de ses voisines : la plus courte qui dise
  vraiment ce que soutient le chapitre. Le détail (citation longue, exemple)
  va dans `explanation`.
- **Le mot troué ne répète pas le titre du chapitre**, sinon la réponse est
  donnée d'avance : sous « Que la souveraineté est inaliénable », trouer
  *volonté*, pas *inaliénable*.
- **Un chapitre peut porter plusieurs thèses** (deux ou trois moments), mais
  un chapitre à cinq thèses est le signe qu'il faut le couper en deux parties.
- **Deux chapitres qu'on confond** méritent chacun la thèse qui les
  distingue (au chapitre 3, le peuple est *trompé* ; au chapitre 6, il est
  *aveugle*), et souvent une carte de lien (`reprise`) qui les oppose.
- Les citations suivent la règle de `philosophie.md` : exactes, entre
  guillemets français, coupes marquées `[...]`, jamais de mémoire.

## Ce que le moteur en fait

Une leçon par livre, qui suit l'ordre du plan :

1. **Le plan**, à lire (première fois seulement) : l'arbre du livre, thèses
   complètes.
2. **Un premier plan à trous**, aussitôt : trois thèses retirées, une par
   bloc autant que possible, à replacer depuis une banque.
3. **Bloc par bloc**, chaque thèse en carte à trou, au clavier, avec son
   emplacement en tête de carte (« II, 3 · Si la volonté générale peut
   errer »), puis les cartes des liens qui aboutissent là ; ensuite trois
   thèses du bloc à **localiser** ; et, pour un bloc d'au moins trois thèses,
   un plan à trous où tout le bloc est retiré.
4. **Le plan entier à trous** pour finir.

Rejouée, la leçon saute la lecture et ouvre sur un plan à moitié vide ;
chaque thèse y est soit restituée, soit localisée, une sur deux. La séance
finale de l'unité se termine par le plan de chaque livre, toutes thèses
retirées. En révision, chaque thèse revient seule, avec son emplacement, et
une révision sur deux la fait localiser plutôt que restituer.

**Localiser** : la thèse est donnée en entier, et on choisit son emplacement
parmi quatre (« II, 3 », « II, 4 »…), sans les titres des chapitres, qui
désigneraient souvent la réponse. Les leurres sont les emplacements les plus
proches dans le plan, tirés parmi les cinq voisins : c'est entre chapitres
voisins qu'on se trompe. La correction rappelle le titre du chapitre juste.
Une carte de lien, qui n'a pas d'emplacement unique, ne se localise jamais.
Localiser, restituer et replacer dans le plan sont trois façons d'interroger
la même thèse : une seule carte de révision espacée pour les trois.

Depuis la bibliothèque, **« Voir la carte »** ouvre le plan de toute l'œuvre
dessiné comme un schéma (bulles des blocs, cases des chapitres, flèches),
chaque case colorée selon ce qui en est su et dépliable sur ses thèses. Le
plan lu avant une leçon est le même dessin ; le plan à trous aussi, ses cases
montrant alors les thèses à replacer plutôt que les gloses.

## Pas encore construit

Exercices envisagés, à ajouter sur le même arbre : localiser au clavier
(saisir « II, 4 » plutôt que le choisir) pour une carte mûre, association de
paires entre chapitres de même plan, remise en ordre des enchaînements (jamais
des chapitres de même plan, dont l'ordre est sans portée).
