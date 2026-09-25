import { Rich } from '@/components/session/RuleNote'

/**
 * Le texte d'un paragraphe étudié, tel qu'il est cité (voir `passageSchema`).
 *
 * Rendu en citation plutôt qu'en rappel : un filet à gauche, un corps plus
 * sombre et plus aéré que la prose du rappel, pour qu'on sache au premier
 * coup d'œil que ce sont les mots de l'auteur, pas un commentaire. Une ligne
 * vide sépare deux alinéas ; les marqueurs de `content/README.md` restent
 * disponibles (un mot grec en `` `forme` ``, un titre en `*italique*`).
 */
export function PassageText({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
  return (
    // Justifié sur grand écran seulement : sur une colonne de téléphone, un
    // corps serif justifié creuse des blancs entre les mots d'une ligne sur
    // deux ; la césure (`lang="fr"`) y adoucit le fer à gauche.
    <blockquote lang="fr" className="flex flex-col gap-3 border-l-4 border-violet/40 pl-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="font-serif text-[1.02rem] leading-relaxed text-ink hyphens-auto md:text-justify">
          <Rich text={paragraph} />
        </p>
      ))}
    </blockquote>
  )
}
