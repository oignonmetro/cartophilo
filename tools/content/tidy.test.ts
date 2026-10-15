import { describe, expect, test } from 'vitest'
import { pointProblems, tidyAlt, tidyAnswer, tidyLine, tidyPoint, tidySentence, tidyText } from './tidy'

describe('tidyLine', () => {
  test('sort les espaces des marques fermées trop tard', () => {
    expect(tidyLine("L'**ambiguïté **autour")).toBe("L'**ambiguïté** autour")
    expect(tidyLine('un __sujet __et __ce qu\'on en dit__')).toBe("un __sujet__ et __ce qu'on en dit__")
    expect(tidyLine("ce qu'une chose *est *revient")).toBe("ce qu'une chose *est* revient")
    expect(tidyLine('dans le *Banquet *de Platon')).toBe('dans le *Banquet* de Platon')
  })

  test('sort les espaces des marques ouvertes trop tôt', () => {
    expect(tidyLine("d'emblée,** il est deux**.")).toBe("d'emblée, **il est deux**.")
    expect(tidyLine('puisque** c\'est précisément**')).toBe("puisque **c'est précisément**")
  })

  test('ne prend pas le trou pour un souligné', () => {
    expect(tidyLine('il est __lui-même__ ___ ; le __beau__')).toBe('il est __lui-même__ ___ ; le __beau__')
    expect(tidyLine('**___**')).toBe('**___**')
  })

  test('ferme le souligné avant un trou qui le termine', () => {
    expect(tidyLine("__comme s'il était ___ __?")).toBe("__comme s'il était__ ___ ?")
  })

  test('sort les espaces des couleurs', () => {
    expect(tidyLine('Des {red}intermédiaires {/red}ne feraient')).toBe('Des {red}intermédiaires{/red} ne feraient')
    expect(tidyLine('La {violet}dyade {/violet} (ce qui')).toBe('La {violet}dyade{/violet} (ce qui')
  })

  test('laisse le gras, les couleurs et la ponctuation française bien formés', () => {
    const line = "__**Il est {coral}simple{/coral}.**__ Pourquoi ? « Le beau » ; voir *Phèdre*, 247b."
    expect(tidyLine(line)).toBe(line)
  })

  test('remplace les apostrophes typographiques et les doubles espaces', () => {
    expect(tidyLine('l’âme  et le corps')).toBe("l'âme et le corps")
  })

  test('laisse une ligne à marques impaires telle quelle', () => {
    expect(tidyLine('un **gras orphelin et un **autre ** ici')).toBe('un **gras orphelin et un **autre ** ici')
  })

  test('apparie les marques sur tout un paragraphe, pas ligne à ligne', () => {
    const text = "    dans la *Profession de foi du vicaire\n    savoyard* et le « **mythe de\n    l'intériorité** »"
    expect(tidyText(text)).toBe(text)
    expect(tidyText('    une **thèse\n    centrale **ici')).toBe('    une **thèse\n    centrale** ici')
  })

  test("n'apparie pas par-dessus une ligne vide", () => {
    const text = '**un\n\ndeux**'
    expect(tidyText(text)).toBe(text)
  })

  test("garde l'alignement des tableaux", () => {
    const line = '    | Fin        | arbitraire |'
    expect(tidyText(line)).toBe(line)
  })

  test('est idempotente', () => {
    const once = tidyLine("Des {red}intermédiaires {/red}ne, **hapax **chez *est *revient __x ___ __")
    expect(tidyLine(once)).toBe(once)
  })
})

describe('cartes', () => {
  test('retire les `\\ ` de fin de ligne et les espaces de bord', () => {
    expect(tidySentence('ailleurs.\\ \n\nLe ___ suit. ')).toBe('ailleurs.\n\nLe ___ suit.')
  })

  test('nettoie la réponse et les variantes', () => {
    expect(tidyAnswer(' Forme ')).toBe('Forme')
    expect(tidyAlt(['dualite ', '', 'dualite', 'dualité'], 'dualité')).toEqual(['dualite'])
    expect(tidyPoint({ sentence: 'Le ___ ', answer: 'feu ', alt: [' feux'] })).toEqual({
      sentence: 'Le ___',
      answer: 'feu',
      alt: ['feux'],
    })
  })

  test('signale ce qui demande un choix', () => {
    expect(pointProblems({ sentence: 'Sans trou.', answer: '' })).toEqual([
      "la phrase n'a pas de trou (___)",
      'la réponse est vide',
    ])
    expect(pointProblems({ sentence: 'La ___ et les ___', answer: 'neige ; remèdes' })).toEqual([])
    expect(pointProblems({ sentence: 'La ___ et les ___', answer: 'neige' })).toHaveLength(1)
  })
})
