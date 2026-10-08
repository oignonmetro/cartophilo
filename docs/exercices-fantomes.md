# QCM et associations « fantômes » : fonctionnement, pour le porter dans Cartolang

Ce document décrit, aussi complètement que possible, le mécanisme adopté dans
Cartophilo pour le « grand exercice de repérage » de Plotin (`/reperage`), afin
de le reproduire dans Cartolang (l'application de vocabulaire dont Cartophilo
est issu). Les chemins donnés sont ceux de Cartophilo ; les noms de types et
de fonctions sont repris tels quels pour qu'on puisse les retrouver.

Fichiers de référence :

| Rôle | Fichier |
|---|---|
| Cœur : ordre, maîtrise, tirage, formation des exercices | `src/engine/treatises.ts` (+ `treatises.test.ts`) |
| Types d'exercices | `src/engine/exercises.ts` (section « Treatise… ») |
| Notation et stockage | `src/store/progressStore.ts` (`gradeTreatises`) |
| File de séance, fantômes, notation par exercice | `src/screens/SessionScreen.tsx` |
| Route de la séance | `src/screens/TreatiseTrainRoute.tsx` |
| Plateau d'association | `src/components/session/PairBoard.tsx`, `TreatiseMatch.tsx` |
| QCM | `src/components/session/TreatiseChoice.tsx`, `OptionList.tsx` |
| Poids d'une manche dans le combo | `src/engine/combo.ts` (`effortOf`) |

---

## 1. L'idée en une page

**Avant** : une séance était une liste d'exercices fabriqués d'avance (une
manche d'association = un exercice, un QCM = un exercice). La « réussite » se
comptait par exercice, comme une valeur absolue : « la manche 3 est réussie ».

**Maintenant** : ce qu'on mesure, ce sont des **associations** : « pour *ce*
élément, *ce* lien (titre ↔ numérotation, titre ↔ thèse…) a-t-il été établi
correctement ? ». Les exercices ne sont que des véhicules jetables :

1. **Les éléments sont des lignes d'un tableau.** Un élément (un traité ; chez
   Cartolang, un mot) se dit de plusieurs façons, comme les colonnes d'un
   tableau : titre, numérotation, thèse 1 / 2 / 3. Chaque cellule est ce qu'on
   peut montrer ou demander.
2. **Les exercices n'existent pas d'avance.** Une séance réserve des *places*
   (« exercices fantômes ») ; chaque place se **forme à l'instant où on
   l'ouvre**, d'après ce que l'apprenant sait à ce moment-là. Rien n'est
   pré-généré.
3. **Le hasard est réglé.** On tire au sort, mais pondéré par le besoin : ce
   qui n'a jamais été réussi passe d'abord, ce qui a été raté revient plus
   souvent.
4. **Chaque réponse est notée pour un (élément, lien)**, pas pour un exercice :
   une manche de quatre paires produit quatre notes indépendantes.
5. **Un élément est « maîtrisé » quand chacun de ses liens a eu une bonne
   association du premier coup.** Dès qu'un élément est maîtrisé, un nouveau
   entre aussitôt dans le lot en cours (toujours le même nombre en cours).
6. **Consolidation** : un élément maîtrisé n'est « acquis » qu'après une
   nouvelle réussite dans une **autre séance**.

Quatre notions à ne jamais confondre :

- **actif** : dans le lot en cours d'apprentissage (≤ `ACTIVE_COUNT`, soit 6) ;
- **maîtrisé** (`isValidated`) : tous ses liens réussis une fois du premier coup ;
- **à consolider** (`reviewTreatises`) : maîtrisé, pas encore acquis ;
- **acquis** (`isAcquired`) : maîtrisé et réussi dans ≥ 2 séances différentes.

---

## 2. Modèle de données

### 2.1 Le contenu : le « tableau »

Dans le schéma de contenu (`src/content/schema.ts`, `treatiseEntrySchema`),
une entrée porte :

```
id, title, ennead, numberInEnnead, chrono,     // titre et numérotation
highlight?  (en gras)                          // groupe d'arrivée n° 2
priority?   (rang 1..N)                        // groupe d'arrivée n° 1
theses?: string[]   (0 à 3)                    // colonnes « thèse »
```

Transposition Cartolang : un mot = une entrée ; colonnes possibles = mot (L2),
traduction (L1), forme(s) conjuguée(s), exemple… Le principe : **une entrée
expose des colonnes ; un « lien » est une paire de colonnes**.

Colonnes (`TreatiseColumn`) : `'title' | 'number' | 'thesis'`.
Liens (`TreatiseLink`) : `'title-number' | 'title-thesis'`.

**Le titre sert de pivot.** On ne lie jamais directement numérotation et thèse
(le lien `number-thesis` a été essayé puis abandonné) : tout passe par le titre.
Chez Cartolang, le mot (L2) serait le pivot : `mot-traduction`, `mot-forme`…

`linksOf(entry)` : les liens qu'une entrée permet. `title-number` toujours ;
`title-thesis` seulement si l'entrée a au moins une thèse (`hasColumn`).

**Plusieurs valeurs pour une colonne (« ou »).** Une entrée peut avoir jusqu'à
3 thèses. Elles sont des **variantes d'une même colonne** : un exercice n'en
montre jamais qu'**une seule** par entrée (jamais deux thèses d'un même traité
dans une manche, ni dans un QCM). Chaque variante a un rang (0, 1, 2) qui sert
à la notation (voir 2.2).

### 2.2 La progression (store)

Dans `useProgress` (Zustand persisté) : `treatises: CourseBucket<TreatiseProgress>`,
c'est-à-dire par cours, `Record<entryId, TreatiseRecord>`. Sans bump de
`SAVE_FORMAT` : une clé absente vaut `{}` ; `exportSave`, `importSave` et
`partialize` l'incluent.

```ts
interface LinkRecord { right: number; wrong: number }

interface TreatiseRecord {
  right?: number      // legacy : réussites sur la numérotation (avant les liens)
  wrong?: number      // legacy
  thesis?: number     // legacy : réussites sur les thèses
  links?: Partial<Record<TreatiseLink, LinkRecord>>   // par lien
  theses?: Record<number, LinkRecord>                 // par thèse (rang 0,1,2)
  session?: string    // dernière séance où l'élément a été réussi
  sessions?: number   // nombre de séances DIFFÉRENTES où il l'a été
}
```

- `right` = bonnes associations **du premier coup** uniquement. Une reprise
  réussie après erreur ne compte jamais comme réussite (mais l'erreur compte
  toujours dans `wrong`).
- `wrong` sert au tirage (pondération) ; il ne bloque jamais la maîtrise.
- Les comptes `right`/`thesis` à la racine sont ceux d'avant les liens :
  `rightsOn(record, link) = max(links[link].right, legacy)`. Si Cartolang
  démarre à zéro, on peut s'en passer.

### 2.3 Les exercices (`src/engine/exercises.ts`)

Trois types, tous dans l'union `Exercise` :

```ts
// Place réservée : rien n'est formé.
interface TreatiseGhostExercise {
  kind: 'treatise-ghost'
  id: string                    // 'treatise-ghost:0', ':1', …
  shape: 'match' | 'choice'     // décidé d'avance, pour le rythme seulement
}

// Manche d'association : UNE paire par élément.
interface TreatiseMatchExercise {
  kind: 'treatise-match'
  id: string
  link: TreatiseLink
  columns: [TreatiseColumn, TreatiseColumn]       // gauche, droite
  pairs: { id: string; left: string; right: string; thesis?: number }[]
  session?: string
  practice?: boolean            // remise à niveau : rien n'est noté
}

interface TreatiseChoiceExercise {
  kind: 'treatise-choice'
  id: string
  link: TreatiseLink
  from: TreatiseColumn; to: TreatiseColumn   // ce qu'on montre / ce qu'on cherche
  entryId: string                            // l'élément interrogé
  prompt: string; answer: string; options: string[]
  thesis?: number                            // rang de la thèse interrogée
  session?: string
  practice?: boolean
}
```

Points clés :

- `pair.id` = **l'id de l'élément** (pas un id de paire). C'est ce qui permet de
  noter par élément quand la manche se termine.
- `thesis` (rang) accompagne chaque paire/QCM où une colonne est une thèse : sans
  lui, on ne saurait pas laquelle des trois variantes a été réussie.
- `session` : l'identifiant de la séance qui a formé l'exercice (voir §6).
- `itemIdsOf(exercise)` renvoie `[]` pour ces trois types : **ce ne sont pas des
  éléments de révision espacée** (SM-2). Ils ne passent pas par `gradeItem`. La
  progression des traités est un système séparé (`gradeTreatises`).
- `combo.ts` (`effortOf`) : une manche vaut ⌈paires/2⌉, un QCM ou un fantôme 1.

---

## 3. Ordre d'arrivée, lots et maîtrise (`src/engine/treatises.ts`)

Trois choses sont volontairement **séparées** pour qu'on puisse ajouter d'autres
types d'exercices sans bouleverser l'ordre d'apprentissage :

1. l'ordre d'arrivée (`learningOrder`) ;
2. ce qui valide un élément (`isValidated`) ;
3. la façon de former les exercices (`materializeTreatise`).

### 3.1 Ordre d'arrivée

`learningOrder(entries)` : d'abord ceux qui ont une `priority` (dans l'ordre de
ce rang), puis les autres `highlight`, puis le reste ; hors rang, ordre de
Porphyre (ennéade, puis place dans l'ennéade).
Transposition : mots « fondamentaux » d'abord, puis le reste dans l'ordre du
cours.

### 3.2 Lot en cours

`ACTIVE_COUNT = 6`. `activeTreatises(entries, progress)` = les 6 premiers
éléments **non maîtrisés** dans l'ordre d'arrivée. **Invariant** : tant qu'il en
reste à apprendre, il y en a toujours exactement 6 en cours — ni plus, ni moins.
Quand l'un est maîtrisé, il sort du lot et le suivant y entre **immédiatement**
(dans la même séance, à l'exercice suivant : voir §5).

### 3.3 Maîtrise ponctuelle

```ts
isLinkDone(entry, record, link):
  'title-number' → rightsOn(record, link) >= 1
  'title-thesis' → CHAQUE thèse de l'entrée a theses[i].right >= 1

isValidated(entry, record) = linksOf(entry).every(link => isLinkDone(...))
```

Conséquences :

- un élément sans thèses n'a qu'un lien (`title-number`) : une seule bonne
  réponse du premier coup le maîtrise ;
- un élément à 3 thèses demande 1 (numérotation) + 3 (une par thèse) = **4
  réussites** distinctes ;
- réussir une thèse ne vaut pas les autres (c'était le choix initial « n'importe
  laquelle des trois suffit », abandonné : on pouvait confondre les deux autres) ;
- chaque réussite est liée à un **élément** et à un **lien** (et à une thèse) :
  réussir le lien d'un élément n'en valide aucun autre.

### 3.4 Consolidation

```ts
ACQUIRED_SESSIONS = 2
isAcquired(entry, record) = isValidated(entry, record) && (record.sessions ?? 0) >= 2
reviewTreatises(entries, progress, session) =
  entries.filter(validés, pas acquis, et record.session !== session)
```

- `sessions` s'incrémente dans le store à chaque bonne réponse faite dans une
  séance **différente** de `record.session` (voir §6).
- Un élément à consolider **revient dans les séances suivantes, jamais dans celle
  où il vient d'être réussi** (`record.session !== session`).
- La maîtrise ponctuelle reste la **porte d'entrée** (elle déclenche
  l'introduction d'un nouvel élément) ; l'« acquis » n'ouvre rien, il retire
  l'élément des révisions.
- Le compteur affiché dans la bibliothèque (« N / 54 maîtrisés ») compte les
  éléments **acquis** (`acquiredCount`), pas seulement abordés.

### 3.5 Remise à niveau (« practice »)

Quand il n'y a plus ni actif ni à consolider (`targetsOf`), la séance tire des
éléments au hasard (`sample`) et marque les exercices `practice: true` : **rien
n'est noté** dans ce mode (voir §6).

---

## 4. Hasard réglé : former un exercice

Point d'entrée : `materializeTreatise(ghost, entries, progress, seed)`.

```ts
const session = String(seed)
const rng = createRng(seedFrom(seed, ghost.id, Object.keys(progress).length))
if (ghost.shape === 'match') { const m = formMatch(...); if (m) return m }
return formChoice(...)      // aussi le repli d'une manche impossible
```

- Le générateur (`createRng`, `seedFrom` : `src/engine/rng.ts`, PRNG à graine)
  est **déterministe** pour (graine de séance, id du fantôme, nombre d'entrées
  déjà notées). Le dernier terme fait que l'exercice dépend de la progression
  *au moment où il est formé*, tout en restant reproductible dans un test.
- La **graine de séance** est `Date.now() + attempt` (voir `TreatiseTrainRoute`).
  `String(seed)` sert d'identifiant de séance (`session`).

### 4.1 Cibles (`targetsOf`)

`targets = [...activeTreatises, ...reviewTreatises]` ; si les deux sont vides :
échantillon aléatoire + `practice: true`.

### 4.2 Besoin et poids

```ts
thesisNeed(record, i) = (theses[i].right == 0 ? 3 : 0) + min(theses[i].wrong, 3)

need(entry, link, record):
  'title-thesis' → somme des thesisNeed de toutes ses thèses
  sinon          → (rightsOn == 0 ? 3 : 0) + min(wrongsOn(link), 3)

REVIEW_WEIGHT = 1
weightOf(entry, link, progress) =
  isValidated ? REVIEW_WEIGHT : need(entry, link, record)
```

- Jamais réussi → +3 ; chaque erreur → +1 (plafonné à 3). Donc le plus urgent
  (jamais vu, ou souvent raté) tombe le plus souvent.
- Un élément à consolider a un poids faible (1) mais non nul ; `weightedPick`
  applique un plancher de 0,1 à tout poids pour que rien ne soit impossible.
- `weightedPick(items, weight, rng)` : tirage proportionnel (roulette).

### 4.3 Une manche (`formMatch`)

1. Candidats = chaque lien pour lequel au moins `MIN_BOARD = 3` cibles le
   permettent (`pool`). Aucun → retourne `null` → repli sur un QCM.
2. Lien tiré par `weightedPick`, pondéré par la somme des `weightOf` du pool :
   le lien qui reste le plus à réussir passe le plus souvent.
3. Groupe : le pool mélangé (`shuffle`), puis trié par `weightOf` décroissant
   (stable → au hasard à besoin égal), puis `slice(0, BOARD_SIZE = 4)`. Donc 3 à
   4 paires, les éléments qui ont le plus à gagner d'abord.
4. Orientation des colonnes :
   - `title-thesis` : **toujours** `['thesis', 'title']` (la thèse à gauche du
     titre, demande explicite) ;
   - `title-number` : sens tiré à pile ou face.
5. Chaque paire : pour un lien thèse, `pickThesis(entry, record, rng)` choisit
   **une** thèse par `weightedPick` sur `thesisNeed` (les thèses jamais réussies
   d'abord) et la paire porte son rang `thesis`. `valueIn(entry, column, thesis)`
   fournit le texte de la colonne.
6. L'exercice porte `session` et, éventuellement, `practice`.

### 4.4 Un QCM (`formChoice`)

1. Élément : `weightedPick` sur la somme des `weightOf` de tous ses liens.
2. Lien : parmi ses liens **pas encore faits** (`!isLinkDone`) ; s'ils le sont
   tous, parmi tous. Tirage uniforme (`sample`).
3. Sens : tiré au sort (colonne montrée `from`, colonne cherchée `to`, en
   inversant éventuellement les deux colonnes du lien).
4. Thèse : si le lien est `title-thesis`, `pickThesis` (même règle que ci-dessus).
5. **Leurres** (`OPTIONS = 4` options en tout) :
   - pool = autres éléments qui ont la colonne `to` ;
   - si `to === 'thesis'` : pool mélangé (peu d'éléments ont des thèses, les
     voisins n'existent guère) ;
   - sinon : les 8 plus **proches** par `distance` (même ennéade, rangs
     chronologiques et places proches) : c'est entre voisins qu'on se trompe ;
   - 3 leurres échantillonnés, valeur de leur colonne (thèse : au hasard parmi
     les leurs).
   - options mélangées, la bonne comprise, **toutes distinctes** ;
   - pas de leurre issu du même élément (`entry.id !== target.id`).
6. Transposition Cartolang : `distance` devient une proximité entre mots (même
   famille, même initiale, même catégorie grammaticale…) pour des leurres
   plausibles.

### 4.5 Rythme d'une séance

```ts
SHAPES = ['match', 'choice', 'choice']   // une manche pour deux QCM
SESSION_LENGTH = 12
treatiseGhosts(count = 12) → fantômes 'treatise-ghost:0..11',
                              shape = SHAPES[index % 3]
```

Seule la **forme** (manche/QCM) est fixée à l'avance, pour le rythme. Le contenu,
lui, n'est décidé qu'à l'ouverture.

---

## 5. La file de séance et la formation à l'ouverture (`SessionScreen`)

`SessionScreen` reçoit `exercises` (les fantômes) et une prop optionnelle
`materialize(ghost) → Exercise`.

```ts
const formed = useRef(new Map<string, Exercise>())
const queued = queue[position]
let current = queued
if (queued?.kind === 'treatise-ghost') {
  let made = formed.current.get(queued.id)
  if (!made && materialize) {
    made = { ...materialize(queued), id: queued.id }
    formed.current.set(queued.id, made)
  }
  current = made
}
```

Ce qu'il faut absolument retenir :

1. **Formation paresseuse** : l'exercice se forme au premier rendu où le fantôme
   est en tête de file — donc après toutes les réponses précédentes, donc avec
   la progression à jour. C'est ce qui produit l'« introduction immédiate »
   d'un nouvel élément : `materialize` relit `useProgress.getState()` à chaque
   appel (ne pas capturer la progression une fois pour toutes dans la route).
2. **Mise en cache par `ghost.id`** : le résultat est retenu pour que l'exercice
   reste **identique** tant qu'il est à l'écran et quand il **revient après une
   erreur**. L'exercice formé reçoit `id: ghost.id` : la file, `attempt.seen`,
   `attempt.passed` et le retour d'un exercice raté fonctionnent sans rien
   changer (ils ne connaissent que des ids).
3. **Un exercice raté revient** : `advance(requeue)` le réinsère plus loin
   (`retryIndex`). Pour un QCM raté, c'est **la même question** qui revient
   (choix assumé). La séance ne s'achève que quand tout est réussi.
4. **Seul le premier essai compte pour la réussite** de la séance
   (`attempt.seen` / `passed`).
5. Pause « Récapitulatif » tous les `BATCH_SIZE = 10` réponses (mécanisme
   existant, inchangé).
6. Les fantômes ne sont pas des « présentations » ; `isPresentation`, `skips`,
   etc. ne s'y appliquent pas (le rendu les traite après formation).

`TreatiseTrainRoute` (route `/reperage`) :

```ts
const ghosts = useMemo(() => treatiseGhosts(), [attempt])
const seed = useMemo(() => Date.now() + attempt, [attempt])
const materialize = useCallback(
  (ghost) => materializeTreatise(ghost, entries,
      useProgress.getState().treatises[course.id] ?? {}, seed),
  [entries, course.id, seed])
```

`attempt` s'incrémente via « Étape suivante » : nouvelle séance, nouveau `seed`
(donc nouvel identifiant de séance, ce qui compte pour la consolidation), sur ce
que la précédente a validé. `finishStep(course.id, 'traites:reperage', outcome)`
clôt. Quand tous les éléments sont acquis, la séance continue en `practice`.

---

## 6. Notation (le cœur du changement)

Dans `SessionScreen` :

### 6.1 QCM (`answer`)

```ts
if (exercise.kind === 'treatise-choice' && !exercise.practice && (!correct || firstTry)) {
  gradeTreatises(course.id, [{
    id: exercise.entryId, link: exercise.link, correct,
    thesis: exercise.thesis, session: exercise.session,
  }])
}
```

Règle : **on note toute erreur, mais une bonne réponse seulement du premier
coup.** Une reprise réussie après erreur ne compte pas comme réussite (sinon un
élément serait « maîtrisé » en tombant par élimination après avoir échoué).

### 6.2 Manche (`answerMatch`)

```ts
if (exercise.kind === 'treatise-match' && !exercise.practice) {
  gradeTreatises(course.id,
    exercise.pairs
      .filter((pair) => missed.has(pair.id) || firstTry)
      .map((pair) => ({
        id: pair.id, link: exercise.link,
        correct: !missed.has(pair.id),
        thesis: pair.thesis, session: exercise.session,
      })))
}
```

`missedIds` (renvoyés par `PairBoard.onDone`) = les paires où l'utilisateur s'est
trompé au moins une fois. Chaque paire devient donc **une note pour un élément**
et un lien. Quand on se trompe entre deux paires, **les deux** sont marquées
manquées (`PairBoard` ajoute les deux `pairId`) — c'est voulu : l'association
de A avec B était fausse pour les deux. Même règle « premier essai » : sur la
reprise d'une manche ratée, seules les paires encore manquées sont renotées.

### 6.3 `gradeTreatises` (`progressStore.ts`)

```ts
gradeTreatises(courseId, results: {id, link, correct, thesis?, session?}[])
```

Pour chaque résultat :

- `links[link].right++` ou `.wrong++` ;
- si `thesis !== undefined` : `theses[thesis].right++` / `.wrong++` ;
- si `correct && session !== undefined && record.session !== session` :
  `record.session = session`, `record.sessions = (sessions ?? 0) + 1`.

La consolidation se compte donc ainsi : le nombre de séances **distinctes** où
l'élément a été réussi au moins une fois du premier coup. La séance où il a été
maîtrisé compte pour 1 ; une réussite dans une autre séance donne 2 → acquis.
(Les erreurs ne font jamais redescendre ce compte.)

### 6.4 Pas de SM-2 ici

`itemIdsOf` renvoie `[]` pour ces exercices : ils n'écrivent rien dans
`cards`. Le score de séance (`record(exercise, correct)`, XP, série) fonctionne
comme pour tout exercice : `record(exercise, missed.size === 0, true)` pour une
manche.

---

## 7. Composants

### 7.1 `PairBoard` (association)

Plateau commun à toutes les associations (vocabulaire, conjugaison, œuvres,
repérage). Ce qui a changé ou a été ajouté pour ce chantier :

- **Une seule grille**, rangée par rangée (un jeton de chaque colonne), en
  `grid auto-rows-fr grid-cols-2` : toutes les rangées prennent la hauteur de la
  plus haute (avant, deux colonnes indépendantes donnaient des cases inégales sur
  téléphone).
- Les deux colonnes sont mélangées **indépendamment** (graine = `exercise.id`) :
  jamais de paire alignée.
- **Taille de texte adaptative** (`textSizeFor`) : estimation du nombre de
  lignes (`CHAR_WIDTH = 0.55` du corps par caractère) d'après la largeur d'une
  case ; on garde la plus grande taille de `text-lg / base / sm / xs` dont la
  hauteur estimée (`lignes × interligne + remplissage`) tient dans le budget d'une
  rangée `(hauteur visible − TEXT_CHROME(200) − gaps) / rangées`. **Une taille par
  colonne** (celle du libellé le plus long : `smallest`). Suit la fenêtre
  (`useViewport`, écoute `resize`). Un seuil fixe en nombre de caractères avait
  rétréci inutilement le texte dans des cases à moitié vides, puis une version
  trop généreuse avait fait déborder la dernière rangée.
- **`italicSides`** : `[boolean, boolean]` pour mettre en italique une colonne
  (les titres d'œuvres/traités). `TreatiseMatch` le dérive de `columns`
  (`columns[i] === 'title'`).
- Au-delà de 4 paires, la densité passe en `COMPACT`.
- Le garde-fou `CHROME_BUDGET = 250` borne la hauteur de carte
  (`cardHeight`) ; `TEXT_CHROME = 200` est plus juste, pour le texte seulement.

### 7.2 `TreatiseMatch`

Fine enveloppe : consigne par lien (`MATCH_PROMPT`), `italicSides`, et renvoie
`{ missedIds }` à `answerMatch`. Consignes : « Associez chaque traité à sa
numérotation » ; « Associez chaque thèse au traité qui la défend ».

### 7.3 `TreatiseChoice` (QCM)

- Énoncé : la valeur montrée (`prompt`), en gras ; italique si c'est un titre ;
  plus petit (`text-lg leading-snug`) si c'est une thèse.
- Question (`questionOf(from, to)`) : « Quelle numérotation ? », « Quel traité ? »,
  « Quel traité défend cette thèse ? », « Quelle thèse défend ce traité ? »,
  « Quelle numérotation porte le traité de cette thèse ? ».
- Options : `OptionList` (numéros = raccourcis clavier via `useNumberKeys`),
  `size='long'` quand on cherche une thèse (texte aéré, numéro aligné en haut),
  `renderOption` en italique quand on cherche un titre.
- Après la réponse : bouton « Continuer » ; sur ordinateur, **Entrée** continue
  (`useEnterToContinue`/écouteur).
- `useEffect` sur `exercise.id` remet `picked` à zéro (le composant est réutilisé
  d'un fantôme à l'autre).

---

## 8. Pour Cartolang : plan de transposition

1. **Définir le « tableau » du vocabulaire.** Une entrée = un mot ; colonnes
   `word` (pivot), `translation`, éventuellement `form`/`example`. Choisir les
   liens (`word-translation`, …) en gardant **le mot pour pivot**. Si une colonne
   admet des variantes (plusieurs traductions), reprendre le « ou » : une seule
   par exercice, notée par rang (`theses` → `variants`).
2. **Types** : copier les trois types d'exercices (`ghost`, `match`, `choice`) en
   les nommant génériquement (`entry-*`). Ajouter `session`, `variant?`,
   `practice?`.
3. **Store** : ajouter le seau `entries: CourseBucket<EntryProgress>` (sans bump
   de format si l'absence vaut `{}`) et `gradeEntries(...)`. Ne pas toucher à
   `cards` (SM-2) : à décider si les mots maîtrisés alimentent aussi SM-2 ; ce
   n'est pas le cas dans Cartophilo.
4. **Moteur** : reprendre `treatises.ts` en remplaçant : colonnes/liens, `linksOf`,
   `valueIn`, `distance` (leurres), `learningOrder`, constantes (`ACTIVE_COUNT`,
   `BOARD_SIZE`, `MIN_BOARD`, `OPTIONS`, `SHAPES`, `SESSION_LENGTH`). Les fonctions
   `need`, `weightOf`, `weightedPick`, `targetsOf`, `isValidated`, `isAcquired`,
   `reviewTreatises`, `formMatch`, `formChoice`, `materialize…` sont génériques.
5. **SessionScreen** : prop `materialize`, cache `formed`, branches de notation
   (§6.1 et §6.2). C'est la partie la plus délicate : bien conserver
   l'`id` du fantôme sur l'exercice formé.
6. **Route** : fantômes + `materialize` qui lit le store à l'instant (§5).
7. **PairBoard / QCM** : reprendre le plateau (grille unique, texte adaptatif,
   `italicSides`) et le composant QCM ; ne pas oublier `renderOption`.
8. **Tests** (`treatises.test.ts` à reprendre) :
   - lots de 6 ; remplacement d'un élément maîtrisé ;
   - maîtrise lien par lien, toutes les variantes requises ;
   - une seule variante par élément et par exercice, jamais deux fois le même
     élément dans une manche ;
   - le lien non réussi passe d'abord (statistique sur 80 graines, > 90 %) ;
   - introduction immédiate d'un nouvel élément ;
   - consolidation (`sessions`, `reviewTreatises` exclut la séance courante) ;
   - `practice` quand tout est acquis.

---

## 9. Pièges rencontrés et choix assumés

- **Ne pas pré-générer** : sinon un exercice figé ne reflète plus la progression
  (un élément maîtrisé en cours de séance reviendrait quand même).
- **Cache obligatoire** : sans `formed`, chaque rendu reformerait l'exercice
  (et le tirage dépend de la progression, qui change à chaque réponse).
- **Graine** : y inclure la progression (`Object.keys(progress).length`) ; sans
  cela, deux fantômes d'une même séance, formés sur le même état, tireraient
  identiquement.
- **Notation du premier coup** : indispensable, sinon un QCM raté puis repris
  « valide » l'élément.
- **Double comptage** : une paire fausse marque *deux* éléments ; c'est normal.
- **Maîtrise trop rapide** : lors d'une séance de test, ~17 éléments avaient été
  « maîtrisés » en 12 exercices (un seul bon QCM à 4 choix suffit pour un
  élément sans variantes). D'où la consolidation (§3.4). À ajuster pour
  Cartolang (ex. exiger 2 liens, ou ACQUIRED_SESSIONS plus élevé).
- **Un QCM raté revient identique** (même question) : choix assumé.
- **`/reperage` rechargé** (deep link) redirige vers l'accueil : le cours
  initial n'a pas encore ses entrées ; non corrigé.
- **Tests de séance** : le panneau de prévisualisation fige les transitions ;
  mesurer le DOM (`getBoundingClientRect`) plutôt que se fier aux captures.
- **Textes** : voir `CLAUDE.md` et les préférences de rédaction (pas de point
  d'exclamation dans les libellés d'interface).
