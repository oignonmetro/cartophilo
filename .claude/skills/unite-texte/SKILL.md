---
name: unite-texte
description: Crée de A à Z une unité de texte Cartophilo (piste « Textes » de Marx ou de Plotin) à partir d'un texte à étudier, d'un PDF, d'informations complémentaires ou d'un export Quizlet de cartes déjà écrites : découpage en paragraphes, texte intégral de chaque paragraphe, cartes-citation puis cartes-explication, validation, branchement dans le cours, commit et push. À utiliser dès qu'on demande de « faire une unité-texte », « ficher ce texte pour l'app », « créer les cartes de ce passage de Marx/Plotin », ou d'importer des cartes Quizlet portant sur un texte précis.
---

# Créer une unité de texte

Une unité de texte fait **savoir citer un texte précis** : une leçon par
paragraphe, qui montre le paragraphe en entier, puis ses **cartes-citation**
(le texte même, troué sur un terme, une formule ou une phrase clef), puis ses
**cartes-explication** (à trou, une information centrale sur le paragraphe).
L'app joue les cartes dans l'ordre écrit, révélées ou écrites au choix.

Cette skill est autonome : ses règles suffisent. N'ouvrir `content/textes.md`
ou `content/philosophie.md` qu'en cas de doute précis, jamais par principe.

## 0. Ce qu'il faut avoir avant de commencer

- **Le cours** : `marx` ou `plotin`.
- **Le texte** : collé, ou un fichier (PDF : `pdftotext -enc UTF-8 -layout
  fichier.pdf sortie.txt`, puis lire la sortie). Si l'utilisateur ne donne que
  des cartes Quizlet, le texte se reconstitue depuis elles (voir § 6).
- **La référence** : œuvre, partie, chapitre ou paragraphe où se situe le
  texte, traduction utilisée si elle est connue.
- **Facultatif** : informations complémentaires (contexte, commentaire,
  enjeux), qui nourrissent l'introduction et les cartes-explication.

Ne demander que ce qui manque vraiment, en une seule question groupée.

## 1. Préparer

- **Identifiant de l'unité** : court, sans accent, unique dans le cours
  (`n1841` pour la note de 1841). Les leçons s'appellent `<id>-p1`, `<id>-p2`…
  (numéro du paragraphe dans le texte), `<id>-ouverture` pour l'ouverture ;
  les cartes `<id>-p1-1`, `<id>-p1-2`…
- **Découpage en paragraphes** : suivre la numérotation du texte source s'il
  en a une, sinon ses alinéas. Donner à chaque paragraphe un intitulé court
  qui dit son mouvement (« La loi psychologique du passage à la praxis »). Un
  paragraphe sans intérêt pour l'épreuve peut être sauté : les autres gardent
  leur numéro.
- **Fragments** : un paragraphe de plus de 80 mots environ se cite en
  plusieurs fragments (`1/3`, `2/3`, `3/3`), coupés aux fins de phrase.

## 2. Écrire au fil de l'eau

Un paragraphe à la fois, directement dans le fichier : ne jamais rédiger
toute l'unité d'un bloc.

1. Créer `content/courses/<cours>/units/<id>.yaml` avec l'en-tête et le §1
   seulement (gabarit ci-dessous), ajouter `<id>` à la fin de `units:` dans la
   piste `textes` de `content/courses/<cours>/course.yaml`, et incrémenter
   `version:` de ce même fichier.
2. Valider (voir § 5), corriger.
3. Ajouter le paragraphe suivant **à la fin du fichier**, sans relire ni
   réécrire les précédents. Valider. Recommencer.

```yaml
# Unité de texte (voir content/textes.md) : <œuvre, référence>.

id: <id>
title: <Titre court du texte>
subtitle: <Œuvre, partie, chapitre, paragraphe>
icon: page
color: coral
intro: |-
  <Facultatif : contexte et grandes idées, deux ou trois phrases.>
lessons:
- id: <id>-p1
  title: "<Intitulé du §1>"
  passage:
    label: "§1"
    text: "<Le §1 en entier, tel quel, sans guillemets autour>"
  points:
  - id: <id>-p1-1
    fragment: "1/2"
    sentence: "« <Le fragment 1/2 en entier, avec ___ sur le terme testé> »"
    answer: "<le terme>"
    alt: []
  - id: <id>-p1-2
    fragment: "1/2"
    sentence: "« <Le même fragment, trous : ___ … ___> »"
    answer: "<réponse 1> ; <réponse 2>"
    alt: []
  - id: <id>-p1-7
    sentence: "<Carte-explication : phrase autonome avec un ___>"
    answer: "<réponse unique>"
    alt: []
```

Toutes les chaînes entre guillemets droits doubles (`"`) : les phrases
contiennent des deux-points. Un guillemet droit à l'intérieur s'échappe
(`\"`) ; les guillemets du texte cité sont toujours français `« »`.

## 3. Les cartes-citation (d'abord)

- **Fidélité absolue** : le texte vient de la source fournie, mot pour mot,
  jamais de mémoire. Si la source est une traduction, garder celle-ci.
- **Une carte répète son fragment entier**, entre `« »`, et porte son
  `fragment`. Un paragraphe court, cité d'un seul tenant, n'a pas de
  `fragment`.
- **Tester tout ce qui compte, en cascade** : pour chaque fragment, une carte
  par terme clef, formule clef ou phrase clef, le trou se déplaçant d'une
  carte à l'autre. La répétition du fragment est voulue.
- **Plusieurs trous** dans une carte sont permis quand les termes vont
  ensemble (« chose reçue » / « chose en devenir ») : `answer` les donne dans
  l'ordre, séparés par ` ; `.
- **La réponse est exactement le texte masqué**, même si c'est une phrase
  entière : pas de limite de longueur ici.

### Choisir les trous

Le trou porte sur **ce qu'il faudrait restituer en citant la phrase dans une
copie**. Se demander : « si je cite cette phrase, quel morceau dois-je
absolument savoir ? » C'est lui, le trou.

1. **D'abord la thèse de la phrase** : le sujet dont elle parle et ce qu'elle
   en affirme (« Cependant, à titre secondaire, ___ est celle qui traduit la
   vertu qui reste » : « la vie la plus heureuse »). Puis les notions et
   termes techniques, puis les images et formules frappantes.
2. **Le groupe qui porte le sens**, pas un mot isolé qui en dépend : « qui
   leur est propre » (l'automotricité) plutôt que « mouvement considérable » ;
   « arrachés à leurs parents » (l'image) plutôt que « dès la naissance ».
3. **Jamais de trou sur** :
   - une modalité ou une incise (« à titre secondaire », « en effet ») ;
   - une remarque de méthode (« un exposé rigoureux outrepasse notre
     propos ») ;
   - un mot que le contexte ou une symétrie fait deviner (« la vertu
     morale » juste après « la vertu intellectuelle », « servira ») ; si le
     mot compte quand même, l'associer à un autre trou de la même carte
     (« leurs activités respectives ; considérable »).
4. **Une idée, un trou** : ne pas tester deux fois la même idée dans un même
   fragment (« humaines », puis « des actes humains »). Un terme important
   mais secondaire dans la phrase, comme une modalité (`deuterōs`), se teste
   par une carte-explication, pas par la citation.
5. **Ne pas laisser la thèse sans carte** : relire chaque fragment et
   vérifier que ce qu'il affirme d'essentiel (« celui qui médite ne requiert
   aucun appui de ce genre ») a sa carte.

## 4. Les cartes-explication (ensuite, en fin de paragraphe)

Elles font trouver ce qu'il faut savoir *sur* le paragraphe : la portée d'une
formule, le sens d'une image, un terme technique, le contresens à éviter, le
lien avec un autre paragraphe, un repère de localisation.

- **Réponse unique, non paraphrasable** : un terme, un nom, une référence
  courte. Se demander : « quelqu'un qui connaît le texte écrirait-il
  exactement ces mots ? » Sinon, déplacer le trou sur un mot pivot.
- **Carte autonome** : elle revient seule en révision, des semaines plus
  tard. Pas de « ce passage », « cette formule » sans les rappeler ; pas de
  « la deuxième raison » sans dire de quoi.
- **Portée visible** : la phrase dit pourquoi le point compte, pas un fait
  isolé.
- **Jamais** de référence à la source (« selon le texte », « l'article dit
  que »), de terme ou d'étiquette inventés, de localisation tournée en
  question (« où se trouve… ? »).
- Un commentateur n'est une réponse que s'il y a un débat interprétatif
  réel ; sinon son nom va dans la phrase.

## 4 bis. Faire comprendre avant de faire apprendre

Les cartes-citation font apprendre le texte par cœur : elles ne doivent pas
venir avant qu'on le comprenne.

- **Chaque leçon-paragraphe a un rappel complet** (`notes`), affiché sous le
  texte cité avec le titre « Explication » : la thèse du paragraphe, son
  argument pas à pas, sa place dans le texte, les pièges d'interprétation.
  C'est un vrai commentaire du paragraphe, pas un résumé d'une ligne. Mise en
  forme : des paragraphes ouverts sur l'idée directrice en gras, un tableau
  dès qu'une notion se compare sur deux axes (quatre exemples, deux vertus,
  trois lectures), peu de puces, un piège `!` en fin.
- **Des leçons d'introduction** (`<id>-i1`, `<id>-i2`… placées avant la
  première leçon-paragraphe) dès que le texte est difficile ou que la matière
  fournie donne un contexte : le problème auquel répond le texte, les notions
  qu'il suppose, les débats qu'il ouvre. `passage: {label: "Introduction"}`
  sans `text` ; un rappel complet (un écran au plus, sinon deux leçons), puis
  des cartes-explication. Les cartes de contexte général (débats
  d'interprétation, place dans l'œuvre) vont là, pas dans les paragraphes.

**Introduction** (`intro` de l'unité, facultative) : deux ou trois phrases de
situation, affichées avant la première leçon. **Ouverture** (facultative) : un prolongement
hors du texte (autre texte de l'auteur, postérité d'une formule), en leçon
`<id>-ouverture`, `label: "Ouverture"`, avec son texte et au moins une carte.

**Ponctuation** : aucun tiret cadratin (—) hors des guillemets français ;
dans une citation, garder ceux de l'auteur.

## 5. Valider sans bruit

```bash
npm run content:check 2>&1 | grep -E -A4 "✗|<id>" ; npm run content:check 2>&1 | grep -c "Contenu valide"
```

Ne lire que les erreurs (`✗`) et les remarques qui citent l'unité ; ignorer
les remarques préexistantes des autres unités. Ne pas ouvrir l'app dans le
navigateur : l'utilisateur regarde l'unité en ligne.

## 6. Partir d'un export Quizlet

Quand l'utilisateur fournit ses propres cartes (une par ligne,
`recto :: verso`, le recto commençant souvent par `§n, <intitulé> : ` et une
citation finissant par `(k/n)`), les reprendre **telles quelles** et les
structurer avec un court script Python (lancé avec `PYTHONUTF8=1`) :

- `§n` et l'intitulé donnent la leçon ; `(k/n)` devient `fragment` et sort de
  la phrase ; une carte sans préfixe appartient au paragraphe en cours.
- **Texte intégral** : remplir les trous des cartes-citation de chaque
  fragment et vérifier que toutes donnent le même texte ; une divergence
  trahit une coquille dans une carte, à corriger et à signaler.
- **Ordre** : cartes-citation (avec `fragment`, ou phrase ouvrant sur `«`)
  puis cartes-explication, l'ordre du fichier étant gardé dans chaque groupe.
- Corriger seulement : tirets cadratins hors citation, majuscule initiale
  après retrait du préfixe, contradiction flagrante avec la citation. Tout le
  reste se signale à l'utilisateur, sans le réécrire.

## 7. Terminer

1. Dernière validation (§ 5).
2. Commit sur `main` et push, sans demander (règle du projet), message en
   français : « Ajoute l'unité de texte <titre> (<cours>) », avec en corps le
   nombre de leçons et de cartes, et ce qui a été corrigé ou laissé de côté.
   Faire `git fetch` avant de pousser.
3. Rapporter en quelques lignes : leçons et cartes créées, points laissés de
   côté ou douteux (à vérifier sur le texte), corrections faites.

Les fichiers écrits restent en fins de ligne LF : en Python, écrire avec
`newline=''` après avoir normalisé `\r\n` en `\n`.
