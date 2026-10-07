# Écrire une unité-œuvre

Une unité-œuvre apprend à **se repérer dans une œuvre** : savoir où se trouve
chaque idée, associer une thèse à un endroit, et suivre le fil rouge (pourquoi
tel chapitre suit tel autre, lesquels sont de même plan, lesquels se déduisent
l'un de l'autre). Elle complète l'unité de texte (`content/textes.md`), qui
fait savoir citer un passage. Elle va dans une piste de repérage : Repérages
dans le Hors-programme (à la fin, séparée des pistes par domaine, qui ne
reçoivent pas d'unité-œuvre), ou Repérage chez Marx et Plotin. Même couleur
que la piste (`color: sky`) ; `group` reste utile pour réunir plusieurs
unités-œuvres d'un même auteur.

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
group: "Rousseau : Du contrat social"
work:
  parts:
    - id: l2                        # un livre : une leçon
      label: Livre II
      parts:
        - id: l2-1-5                # un bloc de chapitres
          label: chap. 1-5
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
| `summary` | ce qu'un chapitre affirme (« La volonté générale ne peut errer »), quand le titre de l'auteur ne le dit pas déjà : ce que montrent l'association et la remise en ordre, **jamais interrogé** |
| `rel` | relation avec la partie qui la précède au même niveau (jamais sur la première) |
| `points` | thèses de la partie, phrases trouées (même format qu'un point de grammaire) |
| `parts` | sous-parties |

Une partie sans sous-partie doit porter au moins une thèse : elle n'aurait
sinon rien à localiser.

**`summary` dit en mots simples ce que le chapitre affirme**, quand le titre
de l'auteur n'est qu'un intitulé ou une question (« Si la volonté générale
peut errer » : « La volonté générale ne peut errer »). Quand le titre
l'affirme déjà (« Que la souveraineté est inaliénable »), pas de `summary`.
Relire les affirmations d'un livre à la suite doit donner le raisonnement de
l'auteur.

**Emplacements** : « II, 3 » pour un chapitre, « chap. 1-6 » pour un bloc.
L'association, qui ne montre qu'un livre, écrit d'elle-même « chap. 3 » ; les
cartes de révision, qui reviennent seules, gardent « II, 3 ».

## Les relations

Liste fermée. Elle décide du choix des exercices (des chapitres de même plan
forment une seule étape de la remise en ordre), et ne fait l'objet d'aucun
QCM « quel est ce lien ? ».

| `rel` | Sens |
|---|---|
| `declinaison` | même plan : une autre face du même objet |
| `limite` | borne ce que la précédente vient de poser |
| `application` | cas particulier, mise en œuvre |
| `consequence` | se déduit de la précédente |
| `probleme-solution` | résout la difficulté que la précédente fait surgir |
| `changement-de-question` | ouvre une autre question |
| `reprise` | reprend une idée déjà formulée, pour un autre usage |
| `objection-reponse` | répond à une objection faite à la précédente |

`rel` ne relie que deux voisines. Pour deux parties éloignées (le chapitre 6
qui reprend une formule du chapitre 3), écrire un lien dans `links`, qui
porte les cartes justifiant le lien ; sa carte revient en phrase à trou,
située entre ses deux extrémités (« II, 3 → II, 6 »).

## Les thèses

Toutes les règles de `content/philosophie.md` s'appliquent : un seul `___`,
une réponse unique et non paraphrasable, une phrase qui tient seule. Quelques
précisions propres à l'unité-œuvre :

- **La thèse se lit en entier quand on la localise**, réponse soulignée :
  la plus courte qui dise vraiment ce que soutient le chapitre. Le détail
  (citation longue, exemple) va dans `explanation`.
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

## Les rappels

`recaps`, à la fin de `work`, résume les groupes de parties liées : un
rappel par moment, par bloc ou par groupe de chapitres qui vont ensemble
(les quatre moments de l'Analytique du beau ; les chapitres 1-3, 4-6, 7-10
et 11-12 du livre II du *Contrat social*). Il s'affiche à la découverte de la
leçon, juste avant les thèses de sa première partie (`at`), et se relit à
tout moment par « Lire le plan », sur la carte de l'unité dans la
bibliothèque (tous les rappels, livre par livre). Le groupe ne suit
pas forcément l'arbre : il peut réunir deux blocs voisins, d'où son propre
repère (`label`).

```yaml
  recaps:
    - at: l2-4-5                # la première partie du groupe
      label: "chap. 4-6"
      title: "Les bornes du souverain, et ce qu'est une loi"
      notes: |-
        **L'idée directrice du groupe, en gras.**

        | Chapitre | Thèse | Argument |
        | II, 4 | … | … |

        Le texte : « … » (II, 4) ; « … » (II, 6).

        ! Le contresens à éviter.
```

Un rappel sert à la fois de **résumé** (l'idée directrice), de **plan** (un
tableau, une ligne par chapitre ou paragraphe : sa thèse, son argument) et
de **texte** (les formules à retenir, citées exactement : seulement celles
des cartes ou d'une source fournie, jamais de mémoire). Il reprend ce que
disent les thèses et `summary`, et se clôt sur un piège (`! …`).
Mêmes marqueurs qu'un rappel de leçon ; jamais d'italique dans un gras.

## Ce que le moteur en fait

Une leçon par livre, qui suit l'ordre du plan :

1. **Bloc par bloc**, à la découverte, le rappel de chaque groupe avant sa
   première partie (voir « Les rappels ») ; puis chaque thèse à
   **localiser** dans l'œuvre, dès la première fois qu'on la rencontre
   (voir plus bas), puis les cartes des liens qui aboutissent là ; ensuite
   une **association** entre les chapitres du bloc et ce qu'ils affirment.
2. **La remise en ordre** du raisonnement pour finir.

Une unité-œuvre fait savoir *où* se trouve une idée, pas la citer au mot
près (c'est le travail de l'unité de texte, `content/textes.md`) : la
phrase à trou au clavier ne sert donc que de repli, pour une thèse sans
emplacement propre (la carte d'un lien) ou sans voisin pour servir de
leurre. Rejouée, la leçon saute les rappels ; chaque thèse continue de s'y
localiser. La séance finale de l'unité se termine, pour chaque livre, par
sa remise en ordre. En révision, chaque thèse
revient seule, avec son emplacement, et continue de s'y localiser.

**Repérage seul** : l'interrupteur « Repérage », dans l'en-tête de toute
séance qui en contient (leçon, révision, séance finale), saute en direct ce
qui ne fait pas associer une idée à une référence : la remise en ordre, et
la phrase à trou de repli (cartes de lien, thèse sans
voisin). Restent la localisation et l'association. Réglage retenu pour les
séances suivantes ; les cartes de lien, jamais jouées tant qu'il est
allumé, restent dues en révision.

**Localiser** : la thèse est donnée en entier, et on choisit son emplacement
parmi quatre (« II, 3 », « II, 4 »…), sans les titres des chapitres, qui
désigneraient souvent la réponse. Les leurres sont les emplacements les plus
proches dans le plan, tirés parmi les cinq voisins : c'est entre chapitres
voisins qu'on se trompe. La correction rappelle le titre du chapitre juste.
Une carte de lien, qui n'a pas d'emplacement unique, ne se localise jamais.

Une carte mûre **saisit l'emplacement au clavier** au lieu de le choisir : en
révision, dès qu'elle a tenu quelques jours (ou à l'approfondissement) ; dans
la leçon, à partir de la troisième fois qu'on la joue. Sont acceptés « II,
4 », « II 4 », « 2, 4 », « livre II chap. 4 », et le chapitre seul (« 4 »,
« chap. 4 », « chapitre 4 ») : le livre va de soi, mais s'il est donné, il
doit être le bon.
Localiser et restituer sont deux façons d'interroger la même thèse : une
seule carte de révision espacée pour les deux.

**Associer** : les chapitres d'un bloc (« chap. 3 ») à relier à ce qu'ils
affirment (« La volonté générale ne peut errer », à défaut le titre de
l'auteur), sur le plateau d'association habituel. Une manche par bloc d'au
moins trois chapitres, six au plus : un bloc plus long se coupe en manches
égales. C'est entre voisins qu'on confond, d'où des manches tirées d'un seul
bloc. Une paire manquée compte pour les thèses de son chapitre.

**Remettre dans l'ordre** : les étapes du raisonnement d'un livre, mélangées,
à toucher dans l'ordre. Une étape est un chapitre, ou plusieurs chapitres de
même plan réunis (les chapitres 1 à 3 du livre II forment une seule étape :
leur ordre entre eux est sans portée) ; pour le livre II, huit étapes. Chaque
étape ne montre que son affirmation (`summary`, à défaut le titre de
l'auteur) ; son emplacement ne se révèle qu'une fois placée, sans quoi il
suffirait de ranger des numéros. Une erreur se signale aussitôt, et compte
manquée pour les thèses des chapitres de l'étape attendue. Un livre de moins
de trois étapes n'a pas de remise en ordre.
