/**
 * Langue apprise, hors prononciation.
 *
 * Cartophilo n'a plus d'usage de synthèse vocale (voir la suppression de la
 * lecture à voix haute) : ce qui reste ici ne sert plus qu'à l'attribut HTML
 * `lang` (clavier proposé, prononciation du lecteur d'écran) et au nom de la
 * langue affiché dans une consigne — deux besoins qui n'ont jamais dépendu
 * du moteur de synthèse.
 */

let LEARNING = 'fr'
let LEARNING_NAME = 'français'

/** Appelé au chargement d'un cours (voir `CourseProvider`). */
export function setSpokenLanguage(learning: string): void {
  LEARNING = learning
}

/**
 * Code court de la langue du cours actif.
 *
 * Sert à l'attribut HTML `lang` des champs où l'on tape dans cette langue :
 * c'est ce qui fait proposer au clavier du téléphone la disposition
 * correspondante, pourvu qu'elle soit installée.
 */
export function learningLanguage(): string {
  return LEARNING
}

/**
 * Nom de la langue du cours, tel qu'affiché dans une consigne. Vient de
 * `course.name` — la seule source qui l'écrive en toutes lettres — et non
 * d'une liste figée ici, qui aurait fini par diverger du contenu réel à
 * mesure que des cours s'ajoutent.
 */
export function setLearningLanguageName(name: string): void {
  LEARNING_NAME = name.toLowerCase()
}

export function learningLanguageName(): string {
  return LEARNING_NAME
}
