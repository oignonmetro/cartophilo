---
name: cours-oeuvre
description: Écrit ou refond le cours d'une œuvre d'un autre auteur que Plotin (le De l'âme d'Aristote, la Critique de la faculté de juger téléologique de Kant, un livre de l'Éthique…) avec exactement la méthode des cours de traités de Plotin (skill cours-traite) : un notebook NotebookLM consacré à l'œuvre (découpage en mouvements, explication de chaque argument) et, si possible, le PDF de l'édition de référence (citations, repères, notes), analyse du raisonnement, questions à l'utilisateur, plan en tableau de structure et sous-repérages, une leçon par mouvement, rappels qui argumentent en homme de fer, cascades de citations et cartes d'argument, passe de clarification, validation, branchement dans la piste (Œuvres de La vie, Repérages du Hors-programme, Repérage de Marx), commit et push. À utiliser dès qu'on demande un « cours » ou une « unité-œuvre » sur une œuvre ou une partie d'œuvre à partir d'un NotebookLM, de « faire comme les traités de Plotin » pour un autre auteur, ou de refondre un tel cours.
---

# Écrire le cours d'une œuvre, à la manière des traités de Plotin

Le cours d'une œuvre fait **comprendre comment l'auteur raisonne** dans cette
œuvre, exactement comme le cours d'un traité de Plotin : un plan d'abord, la
question ensuite, puis une leçon par mouvement du raisonnement, chaque
argument expliqué jusqu'à convaincre, et des cartes qui font retenir le texte
et le raisonnement.

**Lire d'abord `.claude/skills/cours-traite/SKILL.md` en entier.** Sa
méthode s'applique telle quelle, de son § 1 à son § 6 : on y remplace
Plotin par l'auteur, la GF par l'édition de référence, le traité par
l'œuvre (ou la partie traitée), le chapitre par l'unité de découpage de
l'œuvre, le notebook « Plotin » par celui de l'œuvre. Ses règles sont nées
des retouches de l'utilisateur ; elles valent ici sans exception (homme de
fer, explication NotebookLM de chaque argument reprise presque telle quelle,
citer seulement ce qui est utile ou marquant, pas de numérotation des
arguments, code de couleurs, cascades, cartes de pivot, passe de
clarification). Le présent fichier ne dit que **ce qui change**. Quand
`cours-traite` s'enrichit, ce cours en profite : ne pas recopier ses règles
ici.

Modèles : `content/courses/plotin/units/traite2.yaml` (plan, sous-repérages,
arguments expliqués après retouches de l'utilisateur) et `traite7.yaml`.

Ne pas confondre avec l'**unité-œuvre à plan seul** de `content/oeuvres.md`
(champ `work`, sans `lessons`, pour se repérer dans une œuvre entière sans
rappels) : le cours d'une œuvre est une unité à `lessons`, comme `traiteN`.
Les deux peuvent coexister pour une même œuvre.

## 0. Cadrer avec l'utilisateur, avant tout

Poser en une fois (`AskUserQuestion`, une option recommandée en premier) ce
que la demande ne fixe pas :

- **Le notebook NotebookLM** de l'œuvre (son lien), s'il ne l'a pas donné.
- **L'édition de référence et son PDF.** Proposer de ranger les PDF dans
  `C:\Users\Arthur\Œuvres` (un fichier par œuvre), comme les traités de
  Plotin dans `C:\Users\Arthur\Traités Plotin`. Sans PDF, prévenir : les
  citations ne viendront que de NotebookLM, vérifiées sur ses extraits de
  source (§ 1), et les repères resteront au niveau du chapitre.
- **L'étendue** : l'œuvre entière, ou une partie (le livre II du *De
  l'âme*, les § 61-68 de la *Critique de la faculté de juger*). Une œuvre
  longue se coupe en **une unité par partie** (un livre, une section), chacune
  avec son plan, ses sous-repérages et ses leçons, réunies par `group`.
- **La piste** : Œuvres de La vie (`la-vie`, piste `oeuvres`), Repérages du
  Hors-programme (`hors-programme`, piste `reperages`), Repérage de Marx
  (`marx`). Par défaut, celle dont relève l'œuvre ; pour un auteur classique
  sur la vie (Aristote, Kant, Bergson, Canguilhem), Œuvres de La vie.
- **Ce qui sert l'épreuve visée** (la vie, hors-programme), si cela doit
  orienter le choix des passages développés.

## 1. Sources, par ordre de fiabilité

Comme au § 0 de `cours-traite`, avec ces équivalents :

1. **La traduction de référence**, avec ses repères (pagination Bekker pour
   Aristote, Stephanus pour Platon, paragraphes pour Kant, livre et
   chapitre ailleurs) : seule source des citations et des repères.
2. **Son appareil** (introduction, notes, plan s'il y en a un) : source de
   l'analyse savante, comme la notice et les notes de la GF.
3. **Les notes que l'utilisateur fournit.**
4. **NotebookLM** : découpage en mouvements et explication des arguments,
   jamais une citation ni un repère sans vérification.
5. **Ma propre connaissance de l'auteur**, pour expliquer un raisonnement
   que le texte laisse implicite, jamais pour une citation.

**Lire le PDF** comme au § 0 de `cours-traite` (`pdftotext -enc UTF-8
-layout`, ou les outils de `unite-texte` pour un scan). Pour vérifier une
citation, un passage, ou tout un fichier, depuis la racine du dépôt :
```bash
python -I .claude/skills/cours-oeuvre/texte.py cherche "<pdf>" "phrase à retrouver"
python -I .claude/skills/cours-oeuvre/texte.py passage "<pdf>" "début du passage"
python -I .claude/skills/cours-oeuvre/texte.py verifie "<pdf>" <fichier.yaml> [id de leçon]
python -I .claude/skills/cours-oeuvre/texte.py reprises "<pdf>" <fichier.yaml> [id de leçon]
```
(`<pdf>` peut être un `.txt` déjà extrait ; plusieurs sources se séparent
par « ; »). Ils remplacent `gf.py`, propre aux volumes de la GF.

**Sans PDF**, une citation de NotebookLM ne s'emploie que si elle se lit mot
pour mot dans l'extrait de source qu'il affiche (cliquer sur le numéro de
référence de sa réponse, puis lire l'extrait avec `get_page_text`). Au
traité 2 de Plotin, il a inventé toutes ses citations des chapitres 13-15 :
une citation sans extrait se retire.

## 2. Analyser, puis interroger NotebookLM

L'analyse écrite (§ 1 de `cours-traite`) pose les mêmes questions, avec ces
adaptations :

- **Contre qui** : les adversaires et interlocuteurs propres à l'œuvre
  (pour le *De l'âme*, les prédécesseurs du livre I : Démocrite, Platon,
  l'âme-harmonie ; pour la *Critique de la faculté de juger*, le mécanisme et
  l'hylozoïsme).
- **Ce qui l'amène ici** : la place de la partie dans l'œuvre et de l'œuvre
  dans le corpus de l'auteur (ce qu'elle reprend, ce qui la prolonge).
- **Les termes techniques** dans la langue de l'auteur, translittérés pour
  le grec, en allemand pour Kant (*Naturzweck*, *Zweckmäßigkeit*), en
  italique, avec la traduction retenue.

NotebookLM s'interroge exactement comme au § 1 bis de `cours-traite`, dans
le navigateur intégré (jamais Claude in Chrome), historique de la discussion
supprimé au début de chaque nouvelle unité, une question à la fois :

1. *Découpage* : « Dans [œuvre] de [auteur], [partie], dans la traduction
   [éditeur, traducteur] : propose un découpage en mouvements
   argumentatifs… » (suite comme dans `cours-traite`).
2. *Arguments, unité par unité* : un chapitre (ou un paragraphe de Kant, ou
   une colonne Bekker) par question, en rappelant à chaque fois l'œuvre, la
   traduction et l'incipit du passage.
3. *Explication, argument par argument* : systématique, la question de
   `cours-traite` (« pourquoi est-il concluant ? quelle prémisse implicite
   le rend contraignant, et pourquoi l'adversaire ne peut-il pas la
   refuser ? »), par bloc quand les arguments d'un chapitre sont courts.
4. *Relances* jusqu'à pouvoir expliquer soi-même sans trou.

Tout se recoupe sur l'édition de référence (citations, repères,
attributions, découpage), comme dans `cours-traite`. Les erreurs typiques de
NotebookLM y sont recensées : les chercher ici aussi (passage voisin pris
pour le bon, notion venue d'une autre œuvre de l'auteur, causalité
renversée, citation inventée, analogie que l'auteur récuse ailleurs).

## 3. Découper, écrire, clarifier

§ 3 à § 6 de `cours-traite`, sans changement de fond. Ce qui change :

- **Les repères de la colonne Lieu** du plan doivent être reconnus par le
  moteur comme tableau de structure (`locationKey` dans
  `src/engine/exercises.ts`), dans un seul format par tableau, rangés dans
  l'ordre du texte : « II, 1 » (livre, chapitre), « 412a3-b9 » (Bekker,
  Stephanus), « § 64 » (paragraphe), « chap. 3 ». Pas « livre II, chap. 1 »
  ni « II, 1, 412a3 », que le moteur ne lit pas. L'éditeur visuel (onglet
  Tableaux) dit si un plan est reconnu.
- **Les repères des rappels et des cartes** : la forme la plus précise que
  l'édition permet avec certitude (« (412a27-b1) », « (§ 65) », « (II, 1) »),
  sans jamais déduire une ligne ; dans une leçon qui ne porte que sur un
  chapitre, son repère est dans le titre et les cartes ne le répètent pas,
  comme dans `cours-traite`.
- **Les noms** : « Aristote », « Kant » remplacent « Plotin » partout où
  `cours-traite` le nomme ; les renvois à une autre œuvre de l'auteur
  donnent son titre en italique (« *Métaphysique*, Λ, 7 »).
- **Les cartes tirées des notes** viennent de l'appareil de l'édition de
  référence.

## 4. Valider, brancher, publier

1. `npm run content:tidy -- <fichier>`, `npm run content:check` jusqu'à
   « Contenu valide », puis `texte.py verifie` (aucune citation introuvable)
   et `texte.py reprises` (rien de repris sans guillemets) si l'on a le PDF.
2. **Le fichier** : `content/courses/<cours>/units/<auteur>-<oeuvre>[-<partie>].yaml`
   (`aristote-de-l-ame-2`, `kant-cfj-teleologie`), en tête un commentaire
   qui dit la source (édition, traduction, notebook) ; `id` identique au nom
   du fichier ; `title` « Aristote, *De l'âme*, livre II » ; `subtitle` ce
   que la partie établit ; `icon: compass`, `color` celle de la piste ;
   `group` commun aux unités d'une même œuvre.
3. **Le branchement** : ajouter l'`id` à `units:` de la piste choisie dans
   `content/courses/<cours>/course.yaml`, sans toucher aux autres unités
   (d'autres sessions travaillent peut-être en parallèle : une unité à la
   fois).
4. **Les identifiants des cartes** : `<id de l'unité>-lK-qM`, avec les mêmes
   règles de refonte que `cours-traite` (nouvelle lettre pour une carte qui
   change).
5. `npm run content:build`, puis regarder le rendu dans le navigateur
   intégré (`#/fiches/<id>`), le plan surtout : remise en ordre et repères.
6. Incrémenter `version:` du cours, puis commit (« La vie, Aristote, *De
   l'âme* II : … ») et push, sans demander.

## 5. Rendre compte

Comme au § 8 de `cours-traite` : le découpage (une ligne par leçon, avec ce
qu'elle établit), le nombre de cartes, les erreurs de NotebookLM corrigées
sur l'édition, et les points restés ouverts, posés comme des questions.
