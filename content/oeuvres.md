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
| `question` | question à laquelle répond un bloc : **affichée, jamais interrogée** |
| `rel` | relation avec la partie qui la précède au même niveau (jamais sur la première) |
| `points` | thèses de la partie, phrases trouées (même format qu'un point de grammaire) |
| `parts` | sous-parties |

Une partie sans sous-partie doit porter au moins une thèse : elle n'aurait
sinon rien à replacer dans le plan à trous.

**Emplacements** : « II, 3 » pour un chapitre, « II, 1-6 » pour un bloc ;
quand le livre est évident (à l'intérieur de son arbre), « chap. 3 » ou
« chap. 1-6 » suffit.

## Les relations

Liste fermée : c'est ce qui permet de toujours dessiner le plan avec les
mêmes signes. Elle sert au dessin et au choix des exercices, pas à un QCM
« quel est ce lien ? ».

| `rel` | Sens | Dessin |
|---|---|---|
| `declinaison` | même plan : une autre face du même objet | repère « même plan », sans flèche ; côte à côte sur ordinateur |
| `limite` | borne ce que la précédente vient de poser | flèche nommée |
| `application` | cas particulier, mise en œuvre | flèche nommée |
| `consequence` | se déduit de la précédente | flèche nommée |
| `probleme-solution` | résout la difficulté que la précédente fait surgir | flèche nommée |
| `changement-de-question` | ouvre une autre question | flèche nommée |
| `reprise` | reprend une idée déjà formulée, pour un autre usage | flèche nommée |
| `objection-reponse` | répond à une objection faite à la précédente | flèche nommée |

`rel` ne relie que deux voisines. Pour deux parties éloignées (le chapitre 6
qui reprend une formule du chapitre 3), écrire un lien dans `links` : il
s'affiche sous chacune des deux parties. Un lien que l'arbre dessine déjà
(le chapitre 6 vers le chapitre 7, quand la flèche du chapitre 6 vers le bloc
7-12 le montre) ne s'affiche pas en double : il ne sert alors qu'à porter sa
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
   errer »), puis les cartes des liens qui aboutissent là ; et, pour un bloc
   d'au moins trois thèses, un plan à trous où tout le bloc est retiré.
4. **Le plan entier à trous** pour finir.

Rejouée, la leçon saute la lecture et ouvre sur un plan à moitié vide. La
séance finale de l'unité se termine par le plan de chaque livre, toutes
thèses retirées. En révision, chaque thèse revient seule, avec son
emplacement.

Depuis la bibliothèque, **« Voir la carte »** ouvre le plan de toute l'œuvre,
chaque chapitre coloré selon ce qui en est su.

## Pas encore construit

Exercices envisagés, à ajouter sur le même arbre : localiser (d'une thèse à
son emplacement, QCM aux distracteurs voisins puis saisie), association de
paires entre chapitres de même plan, remise en ordre des enchaînements (jamais
des chapitres de même plan, dont l'ordre est sans portée).
