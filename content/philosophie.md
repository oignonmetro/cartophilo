# Écrire une leçon de philosophie

Ce document adapte au format YAML de `content/README.md` les principes de la
skill **quizlet-fiche-sep**, conçue pour transformer un article de la Stanford
Encyclopedia of Philosophy (SEP) en fiches de révision à réponse unique. Les
quatre cours philosophiques (Hors-programme, La vie, Plotin, Marx) écrivent
tous leur contenu selon ces principes : ce fichier prime sur toute habitude
héritée de Cartolang, l'application de vocabulaire dont Cartophilo est issu.

**Décision de `kind` (referme le point ouvert dans `CLAUDE.md`) :** toutes les
pistes des quatre cours philosophiques utilisent `kind: grammar`, jamais
`vocab` ni `conjugation`. Le moteur grammar ne produit que deux exercices :
un rappel de cours (`notes`), puis une phrase à trou. C'est exactement le
format voulu, et à la condition suivante près, il exclut mécaniquement
l'association et le QCM, ce que `CLAUDE.md` demandait déjà pour Glossaire et
Repérage et qui vaut maintenant pour toutes les pistes philosophiques :

> **Ne jamais renseigner `options` sur un point de grammaire philosophique.**
> Avec `options`, l'exercice se joue en partie en banque de formes (un choix
> parmi des propositions, donc un QCM déguisé) ; sans `options`, il se joue
> toujours au clavier. `npm run content:check` signale tout point d'un cours
> philosophique qui porte `options` (voir plus bas).
>
> **Ne jamais renseigner `translation` sur un point de grammaire
> philosophique.** Ce champ existe pour l'apprentissage d'une langue
> (traduction dans la langue de l'apprenant) ; il n'a pas de sens ici, et sa
> présence changerait l'énoncé montré (voir `GrammarCue` dans
> `src/engine/exercises.ts`).

## Règle d'or : un point, une réponse unique et exacte

Chaque point de grammaire (`sentence` / `answer`) a une réponse unique,
jamais paraphrasable. `answer` est toujours l'une de ces natures : un terme
technique, un nom propre (auteur, commentateur, titre d'œuvre), une référence
textuelle précise (partie, section, paragraphe), ou un chiffre. Jamais un
résumé ni une reformulation de l'idée posée par `sentence`.

Avant d'écrire un point, se demander : « quelqu'un qui connaît le texte par
cœur écrirait-il cette réponse avec exactement ces mots, ou pourrait-il
l'exprimer autrement ? » Si la seconde réponse est possible, restructurer le
point plutôt que de le garder tel quel.

Ce test est le plus dur à respecter sur les points qui portent un
raisonnement (une objection, une thèse défendue, la raison d'un échec
argumentatif) : le réflexe naturel est d'y écrire une réponse qui résume ou
explique. Ce contenu ne doit pourtant jamais être évité (les thèses et
objections centrales méritent le plus d'être retenues), mais construit dès
la rédaction comme un texte à trou : `sentence` pose tout sauf un mot ou un
groupe de mots pivot, `answer` est ce mot. Quand un point est dense ou
important mais qu'aucune réponse non paraphrasable ne se dégage
naturellement, préférer un trou qui isole un mot ou groupe de mots précis
plutôt que de forcer une réponse floue ou d'abandonner le point.

## Test de clarté pédagogique de `sentence`

Au-delà de l'exactitude de `answer`, chaque `sentence` doit permettre de
comprendre, à sa seule lecture, pourquoi ce point mérite d'être su : quel
problème il résout, quel enjeu de l'argumentation il éclaire. Un `sentence`
qui se contente de demander un fait isolé (« Kant appelle ___ la faculté de
juger le particulier sous l'universel. ») sans jamais indiquer sa portée est
insuffisant, même si `answer` est correct et non paraphrasable.

Avant de valider un point, se demander : « en le relisant dans six mois sans
le contexte de sa rédaction, est-ce que je comprends pourquoi il compte ? »
Si la réponse est non, développer `sentence` (au besoin sur plusieurs
phrases) pour restituer cet enjeu, quel que soit le type de point concerné.
`explanation` peut ajouter un complément (référence précise, mise en
perspective), mais ne dispense jamais `sentence` de porter seul l'essentiel
de la clarté : c'est `sentence` qui s'affiche d'abord, et il arrive qu'on
retrouve un point sans jamais dérouler son `explanation`.

## Six familles de points, dans l'ordre du texte source

Les points d'une leçon suivent l'ordre du texte source, sans en-tête indiquant
leur famille : la distinction ci-dessous sert à la rédaction, jamais à
l'affichage.

1. **Terminologique** : `sentence` décrit ou définit ; `answer` est le terme
   technique.
2. **Attributionnel (auteur du texte source, ou personnage d'un dialogue)** :
   `sentence` pose une thèse sans nommer son auteur ; `answer` est son nom.
   Savoir qui défend une thèse donnée est presque toujours essentiel et doit
   rester testé, sans restriction.
3. **Attributionnel (commentateur secondaire)** : `sentence` pose la thèse du
   commentateur ; `answer` est son nom, **uniquement** si son identité relève
   d'un débat interprétatif substantiel (plusieurs commentateurs en désaccord
   explicite sur ce point précis dans le texte source). Sinon, intégrer son
   nom directement dans `sentence` et faire porter `answer` sur autre chose
   (le concept, la thèse, un terme technique). Ne jamais construire de point
   attributionnel quand la source se contente de citer une liste
   bibliographique sans différencier la thèse propre de chaque auteur cité.
4. **Localisation** : `sentence` rappelle l'enjeu ou la fonction du passage
   dans l'argumentation d'ensemble, puis introduit le passage à localiser,
   **sans aucun repère de position** (ni « vers la fin », ni « juste après…
   »), et sans jamais tourner la phrase en question (« où situer ce
   passage ? » est proscrit ; préférer une phrase fluide intégrée : « dans
   ___, … », « passage qui se trouve ___ »). `answer` situe le passage
   textuellement, en allant du plus général au plus précis : l'œuvre, puis la
   partie ou le paragraphe numéroté, puis sa position dans ce mouvement du
   texte (par son avancement propre, début / milieu / fin, ou par rapport
   à un autre moment marquant proche). Une référence de pagination (Akademie,
   Bekker, Stéphanus…) peut venir en plus dans `explanation`, à titre
   documentaire, quand la source ne l'indique pas explicitement pour le
   passage testé.

   > **Toujours transposer une référence de passage donnée par la source.**
   > Quand l'article qui sert de source à la leçon indique explicitement où
   > se situe un passage cité ou discuté (numéro de paragraphe, pagination
   > Bekker, pagination Stéphanus, pagination Akademie, section numérotée…),
   > cette référence n'est plus seulement documentaire : elle doit apparaître
   > dans le rappel (`notes`), **et** être testée par un point de
   > localisation dédié, construit comme n'importe quel autre point de cette
   > famille (`sentence` fluide, sans repère de position, un trou sur la
   > référence elle-même comme `answer`). Ne jamais laisser une référence que
   > la source donne disparaître dans le seul `explanation` d'un autre point,
   > à titre de simple décoration.
5. **Citation** : un blanc marqué `___` au milieu d'une citation reproduite
   fidèlement depuis le texte source (jamais reconstituée de mémoire). Pour
   un passage jugé particulièrement important, plutôt qu'un seul point,
   décliner la citation intégrale en série de plusieurs lessons de grammaire
   consécutifs : chaque point répète l'intégralité de la citation, seul le
   trou se déplaçant d'un point à l'autre, jusqu'à ce que toutes les clauses
   importantes aient été testées une à une. La répétition intégrale y est
   volontaire, elle ne compte pas comme redondance à élaguer.
6. **Distinction** : `sentence` isole un pôle conceptuel par une question ou
   une phrase à trou (« Par opposition à la beauté libre, la beauté ___
   suppose un concept de la perfection de l'objet. ») ; `answer` est le terme
   correspondant.

### Arguments

Pour chaque argument central du texte, produire localisation + attribution +
citation + distinction si pertinent, en plusieurs points plutôt qu'un seul.
Si l'argument ne comporte pas de terminologie ou de distinction propre, le
développer via un point de localisation ou de citation plus étoffé :
`sentence` peut faire plusieurs phrases si nécessaire. Il est bienvenu qu'un
même point de connaissance fasse l'objet de plusieurs points de grammaire
(densité qualitative, pluralité d'informations à mémoriser) : la répétition
d'une notion entre lessons n'est pas un problème, du moment que les points
restent cohérents entre eux.

### Débats et positions rivales

Quand une section pose un débat interprétatif, le rappel (`notes`) de la
lesson qui le couvre l'expose d'abord avec le même soin pédagogique qu'on y
consacrerait à quelqu'un qui ne le comprend pas du tout, avec un exemple
concret qui montre ce qui distingue les positions, pas seulement une
reformulation abstraite. Une fois le débat exposé dans `notes`, les points
qui le pratiquent précisent explicitement qui défend chaque position : la
source le précise presque toujours, ne jamais laisser cette attribution
implicite dans `sentence`.

## Règles éditoriales

Ce qui ne doit jamais apparaître dans `sentence`, `explanation` ou `notes` :

- Une référence à la matérialité de la source (« selon l'article », « le
  texte dit que », « la SEP précise que ») : fusionner l'information
  directement dans la phrase. `npm run content:check` signale ces tournures
  (voir plus bas), mais la liste qu'il connaît n'est pas exhaustive : rester
  vigilant au-delà.
- Un renvoi interne flou (« cette distinction », « ce passage », « cet
  auteur ») quand il n'est identifiable que par le contexte de rédaction :
  remplacer par un descripteur autosuffisant. Un renvoi déjà borné par un
  chiffre ou un déterminant précis (« ces quatre moments », « les trois
  formules ») peut rester.
- Un point de localisation tourné en question (« Où situer… ? »).

**Terminologie :** ne jamais inventer un terme ou une étiquette pour désigner
une thèse ou une position si le texte source ne l'emploie pas lui-même.

**Langue étrangère (allemand, latin, grec) :** pour chaque terme technique
kantien en allemand introduit par le texte source (`Gesinnung`, `Achtung`,
`Verstand`…), produire deux points séparés : un où `answer` est la traduction
française retenue, un où `answer` est le terme allemand original. Ne jamais
mélanger dans un même `answer` une traduction et le terme original entre
parenthèses.

**Citations :** ne jamais inventer ni reconstituer de mémoire une citation ;
la reprendre telle que le texte source la donne. Le texte source de départ
(les deux articles de la Stanford Encyclopedia of Philosophy sur Kant) cite
déjà en anglais des passages traduits des œuvres allemandes de Kant : partir
de cette traduction anglaise pour en donner une traduction française fidèle
plutôt que d'aller chercher une édition française tierce non vérifiée par
cette session.

**Points laissés de côté :** si un point du texte source paraît important
mais n'est qu'effleuré (renvoi à une note, à une référence bibliographique
non développée), le signaler dans un commentaire YAML plutôt que de produire
un point superficiel ou complété de mémoire.

## Le rappel de cours (`notes`)

Une lesson de grammaire n'affiche son rappel qu'une fois, avant tous ses
points (contrairement au vocabulaire, la marque `===` de
`content/README.md` n'y a pas d'effet de découpage). Ce rappel doit donc
suffire à lui seul à situer tous les points de la lesson : c'est lui qui
porte la synthèse de la section du texte source, ses moments ou étapes, ses
règles, et les pièges d'interprétation courants, en s'appuyant sur les
mêmes conventions d'écriture que `content/README.md` documente
(paragraphes, listes `- …`, étiquettes `- terme : …`, pièges `! …`,
tableaux `| … | … |` pour une notion qui se divise selon deux axes, et les
cinq marqueurs `` `terme` ``, `**gras**`, `__souligné__`, `*italique*`,
`{couleur}texte{/couleur}`).

**N'hésitez pas sur la mise en forme.** Un rappel purement en prose se lit
mal à l'écran ; mettez en gras l'idée directrice de chaque paragraphe, et
réservez une couleur à une opposition qui traverse tout le rappel (une thèse
et l'objection qu'on lui oppose, un auteur et son commentateur) plutôt que de
tout laisser au ton neutre. Vaut pour toute lesson écrite désormais, et pour
les lessons déjà écrites : une relecture qui ajoute du gras et de la couleur
à un rappel resté trop uniforme est toujours bienvenue.

**« De nombreux rappels »** ne veut donc pas dire un rappel exceptionnellement
long, mais **de nombreuses lessons**, chacune bornée à une section ou
sous-section cohérente du texte source (une lesson par « moment » du beau
chez Kant, par exemple, plutôt qu'une lesson unique pour les quatre), chacune
avec son propre rappel. Un rappel qui déborde d'un écran est le signal qu'une
lesson couvre en réalité deux sections : mieux vaut la couper en deux
lessons successives, chacune avec son rappel et son lot de points, que de
la laisser grossir.

## Déroulé de rédaction

Le déroulé qui suit adapte celui de la skill quizlet-fiche-sep à une
rédaction sans validation humaine section par section (ce contenu est
produit par un agent, en tâche de fond) : la prudence qu'apporterait
normalement cette validation se reporte sur un auto-audit systématique.

1. **Une section du texte source à la fois**, dans son ordre. Ne jamais
   traiter tout un article d'un bloc.
2. **Écrire d'abord le rappel (`notes`) de la lesson**, qui résume la section
   avec le soin pédagogique décrit ci-dessus : ce rappel sert de garde-fou de
   compréhension avant la rédaction des points.
3. **Écrire les points de la lesson**, dans l'ordre du texte, en appliquant
   dès la rédaction (pas seulement en relecture) la règle d'or et le test
   de clarté pédagogique.
4. **Auto-audit avant de passer à la section suivante**, sur l'ensemble des
   lessons déjà écrites du cours (pas seulement le dernier lot) :
   - chaque `sentence` passe-t-elle le test des six mois ?
   - chaque point attributionnel de commentateur secondaire relève-t-il
     réellement d'un débat interprétatif substantiel ? sinon, remonter le nom
     dans `sentence` et changer ce que porte `answer` ;
   - chaque terme allemand a-t-il ses deux points séparés (traduction ;
     terme original) ?
   - aucun `sentence`/`explanation`/`notes` ne référence la matérialité de la
     source, ni ne contient de renvoi flou ;
   - aucun point de localisation n'est tourné en question ;
   - aucun point ne porte `options` ni `translation` ;
   - `answer` reste toujours un terme, un nom ou une référence courte, jamais
     une phrase qui résume l'idée.
5. **Compiler et valider** avec `npm run content:check` après chaque unité
   écrite (pas seulement à la fin) : une erreur trouvée tôt coûte moins cher
   à corriger qu'une erreur découverte après plusieurs unités de plus.

## Ce que `npm run content:check` vérifie en plus, pour ces cours

En complément des contrôles génériques de `content/README.md`, la validation
signale (en remarque, jamais bloquant : ce sont des heuristiques, elles se
trompent parfois) pour tout cours dont `learning` n'est pas un code de langue
naturelle (`hors-programme`, `la-vie`, `plotin`, `marx`) :

- un point de grammaire qui porte `options` ou `translation` (voir plus
  haut : ces champs ne devraient jamais être renseignés dans ces cours) ;
- une tournure de référence à la matérialité de la source (« selon le
  texte », « l'article dit que », « le texte précise »…) dans `sentence`,
  `explanation` ou `notes` ;
- un point de localisation tourné en question (« où se trouve… », « où
  situer… ») ;
- une réponse (`answer`) anormalement longue, qui sent la paraphrase plutôt
  que le terme ou la référence précise.

Voir `tools/content/difficulty.ts` (`philosophyContentRemarks`) pour le détail
des motifs recherchés.
