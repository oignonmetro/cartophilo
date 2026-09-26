---
name: verifier-liste
description: Vérifie, avant son import manuel dans l'éditeur visuel (« ⇪ Importer une liste… » d'une unité de texte Cartophilo), qu'une liste de cartes au format Quizlet respecte les normes : format lu par l'import (préfixes §n, repères (k/n), séparateurs, trous et réponses), fidélité des citations au texte de référence, cohérence des fragments, mise en forme, puis choix des trous et qualité des cartes-explication. Produit un rapport et une liste corrigée prête à coller. À utiliser dès qu'on demande de « vérifier une liste », « contrôler un export Quizlet avant import », « voir si la liste est conforme », ou avant de coller une longue liste dans l'éditeur.
---

# Vérifier une liste avant import

L'utilisateur colle lui-même la liste dans l'éditeur ; cette skill s'assure
qu'elle y entrera **sans perte ni coquille** et qu'elle donnera de bonnes
cartes. Elle ne crée pas l'unité (c'est `unite-texte`, ou l'éditeur) et ne
touche pas au dépôt.

Deux temps : un **script** vérifie tout ce qui est mécanique, avec le lecteur
même de l'éditeur (ce qu'il voit, l'import le verra) ; une **relecture** juge
ce qu'aucun script ne peut juger (les trous, les explications).

## 1. Les normes

Ce que l'import attend, ligne par ligne :

| Élément | Norme |
|---|---|
| Ligne | Une carte par ligne : `recto :: verso` (ou une tabulation), un seul séparateur. |
| Paragraphe | `§n, Intitulé : ` en tête du recto ouvre une leçon ; les cartes sans préfixe qui suivent y restent. Même intitulé à chaque répétition du même §. |
| Citation | Entre `« »`, **mot pour mot** dans la traduction retenue ; un paragraphe long est cité en fragments, `(k/n)` à la toute fin du recto, `n` identique dans le paragraphe, chaque `k` de 1 à `n` présent. |
| Trou | Exactement `___`. Plusieurs trous : réponses dans l'ordre, séparées par ` ; ` (ou `//`). La réponse est exactement le texte masqué. |
| Mise en forme | `*italique*`, `**gras**`, `__souligné__`, `` `terme` ``, tous refermés ; jamais d'italique dans un gras. |
| Ponctuation | Guillemets français ; tiret cadratin (—) seulement dans une citation (ailleurs l'import le change en virgule). |
| Cartes sans § | En tête de liste : une introduction, à nommer « Introduction » à l'étape « Découper » de l'import. |

Et ce qui fait une bonne carte, que seule la relecture vérifie (règles
complètes : `.claude/skills/unite-texte/SKILL.md`, § 5 et 6) :

- **Trous** : la thèse de la phrase d'abord ; ce que le commentaire juge
  décisif, même une incise (« à titre secondaire ») ; le groupe qui porte le
  sens, pas un mot isolé ; rien qui se devine par le contexte ou une
  symétrie ; une idée, un trou ; aucune thèse du fragment sans sa carte.
- **Cartes-explication** : autonomes (elles reviennent seules en révision),
  réponse courte et non paraphrasable, portée visible, attestées par une
  source, sans « selon le texte ».

## 2. Rassembler

- **La liste** : un fichier, ou du texte collé à écrire tel quel dans un
  fichier du scratchpad (`liste.txt`).
- **Le texte de référence** (facultatif, mais seul moyen de vérifier la
  fidélité) : la traduction retenue, en `.txt`. Depuis un PDF, suivre
  « Lire les sources » de `unite-texte` (`pdftotext -enc UTF-8`, ou le rendu
  en images pour un scan, puis transcription). Pour un texte déjà dans l'app,
  le tirer des `passage.text` de l'unité.
- **Le commentaire ou les notes**, s'il y en a : c'est d'eux que dépend le
  jugement sur les trous.

Ne demander que ce qui manque, en une seule question ; sans texte de
référence, prévenir que la fidélité n'est pas vérifiée et continuer.

## 3. Vérifier mécaniquement

```bash
npx tsx .claude/skills/verifier-liste/check_list.ts liste.txt --texte texte.txt
```

Le rapport classe en **erreurs** (l'import perdrait ou fausserait quelque
chose), **à vérifier** et **infos**, avec le numéro de ligne (lignes non
vides, comme dans l'éditeur). Lire ainsi les cas délicats :

- *même passage mais un mot diffère* : deux cartes d'un fragment se
  contredisent ; la ligne signalée en **fidélité** est la fautive. Sans texte
  de référence, les montrer toutes deux à l'utilisateur.
- *phrases distinctes sous un même repère* : pas une faute, mais le texte du
  paragraphe reconstitué n'en gardera qu'une ; le dire, pour qu'il le
  complète à l'étape « Découper ».
- *paragraphe absent* : souvent voulu (un § sans carte) ; demander.
- *explications mêlées aux citations* : l'import les regroupe en fin de
  leçon (option cochée par défaut) ; rien à faire.

## 4. Relire ce que le script ne voit pas

Paragraphe par paragraphe, avec le commentaire sous les yeux s'il y en a :

1. Chaque fragment : ses thèses ont-elles leur carte ? un trou tombe-t-il sur
   un mot qui se devine, une remarque de méthode, une idée déjà testée ?
2. Chaque carte-explication : autonome, attestée, réponse unique ? une
   affirmation qu'aucune source fournie n'appuie est **signalée**, jamais
   corrigée d'autorité.
3. Les coquilles de langue (accords, accents, apostrophes) hors citation.

Rester sobre : ne signaler que ce qui changerait la carte, pas des
préférences de style.

## 5. Rendre

1. **Le rapport**, en français, bref : une phrase de bilan (cartes,
   paragraphes, verdict), puis un tableau `Ligne | Problème | Correction
   proposée`, erreurs d'abord. Les remarques sur les trous et les
   explications à part, en quelques phrases plutôt qu'en liste.
2. **La liste corrigée**, à côté de l'originale (`<nom>-corrigee.txt`),
   jamais en écrasant l'originale. N'y appliquer d'office que les
   corrections sûres : format (séparateurs, `___`, préfixes, `(k/n)`),
   mise en forme, coquille avérée par le texte de référence. Ce qui relève
   d'un choix (déplacer un trou, reformuler une explication, ajouter une
   carte) est proposé dans le rapport et appliqué seulement si l'utilisateur
   l'accepte. Écrire en UTF-8, fins de ligne LF.
3. **Relancer le script** sur la liste corrigée : zéro erreur avant de dire
   qu'elle est prête.
4. Terminer par la marche à suivre : dans l'éditeur, « ⇪ Importer une
   liste… » sous l'unité, coller, « Analyser la liste », vérifier le
   découpage et le texte reconstitué de chaque leçon, « Créer ». Rappeler ce
   qui reste à faire à la main (texte d'un fragment à compléter, leçon à
   nommer « Introduction »).

Rien à commiter : la liste n'entre dans le dépôt qu'à l'import.
