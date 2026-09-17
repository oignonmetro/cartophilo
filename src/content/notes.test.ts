import { describe, expect, it } from 'vitest'
import { parseInline, parseNotes, splitAside, type NoteRule } from './notes'

describe('rappels de cours', () => {
  it('recolle une phrase repliée sur plusieurs lignes', () => {
    // Le cas qui motivait tout : le repli à 80 colonnes du fichier YAML
    // s'affichait en deux paragraphes séparés par un blanc.
    const blocks = parseNotes(
      "Les modaux ne se conjuguent pas : pas de -s à la troisième personne, pas\nde « to » après eux, et pas d'auxiliaire « do » à la négation.",
    )
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        text: "Les modaux ne se conjuguent pas : pas de -s à la troisième personne, pas de « to » après eux, et pas d'auxiliaire « do » à la négation.",
      },
    ])
  })

  it('sépare deux paragraphes sur une ligne vide', () => {
    const blocks = parseNotes('Premier paragraphe.\n\nSecond paragraphe.')
    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'Premier paragraphe.' },
      { kind: 'paragraph', text: 'Second paragraphe.' },
    ])
  })

  it('groupe les règles consécutives en une seule liste', () => {
    const blocks = parseNotes('- can → could.\n- will → would.\n- may → might.')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ kind: 'rules' })
    expect(blocks[0].kind === 'rules' && blocks[0].rules).toHaveLength(3)
  })

  it('détache l’étiquette d’une règle « cas : contenu »', () => {
    const blocks = parseNotes('- Une syllabe : -er + than.')
    expect(blocks[0]).toEqual({
      kind: 'rules',
      rules: [{ label: 'Une syllabe', body: '-er + than.', example: null }],
    })
  })

  it('ne coupe pas une règle dont le « : » arrive trop tard', () => {
    // Sinon « If + présent simple, … will + base verbale » se ferait charcuter.
    const long = '- Quand la condition est plausible et que rien ne s’y oppose : on garde le présent.'
    const blocks = parseNotes(long)
    expect(blocks[0].kind === 'rules' && blocks[0].rules[0].label).toBeNull()
  })

  it('rattache une ligne indentée à la règle qu’elle illustre', () => {
    const blocks = parseNotes('- If + présent simple, … will + base verbale.\n  If it rains, we will stay at home.')
    expect(blocks[0]).toEqual({
      kind: 'rules',
      rules: [
        {
          label: null,
          body: 'If + présent simple, … will + base verbale.',
          example: 'If it rains, we will stay at home.',
        },
      ],
    })
  })

  it('reconnaît un piège signalé par « ! »', () => {
    const blocks = parseNotes('Règle générale.\n! « very better » est faux.')
    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'Règle générale.' },
      { kind: 'warning', text: '« very better » est faux.' },
    ])
  })

  it('recolle un piège replié sur plusieurs lignes', () => {
    const blocks = parseNotes('! Jamais de -s derrière un modal :\n« she wills » est fautif.')
    expect(blocks).toEqual([
      { kind: 'warning', text: '! Jamais de -s derrière un modal : « she wills » est fautif.'.replace('! ', '') },
    ])
  })

  it('referme un piège sur une ligne vide, sans avaler la suite', () => {
    // Le piège absorbe ses propres lignes repliées, mais une ligne vide le
    // clôt : sans quoi la règle qui suit se retrouverait encadrée en ambre.
    const blocks = parseNotes('! Jamais de « will » après « if » :\nc’est la faute la plus fréquente.\n\nQuand le fait est toujours vrai, les deux propositions sont au présent.')
    expect(blocks.map((block) => block.kind)).toEqual(['warning', 'paragraph'])
    expect(blocks[1]).toEqual({
      kind: 'paragraph',
      text: 'Quand le fait est toujours vrai, les deux propositions sont au présent.',
    })
  })

  it('reprend la prose après une liste de règles', () => {
    const blocks = parseNotes('Avant.\n- Une règle.\nAprès, sur deux\nlignes repliées.')
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'rules', 'paragraph'])
    expect(blocks[2]).toEqual({ kind: 'paragraph', text: 'Après, sur deux lignes repliées.' })
  })

  it('ne rend rien pour des notes vides', () => {
    expect(parseNotes('')).toEqual([])
    expect(parseNotes('\n  \n')).toEqual([])
  })

  it('lit un tableau : la première rangée pose les colonnes', () => {
    const blocks = parseNotes(
      '|            | Subjective | Objective |\n' +
        '| Formelle   | beau       | figures   |\n' +
        '| Matérielle | agréable   | organisme |\n',
    )
    expect(blocks).toEqual([
      {
        kind: 'table',
        columns: ['Subjective', 'Objective'],
        rows: [
          { label: 'Formelle', cells: ['beau', 'figures'] },
          { label: 'Matérielle', cells: ['agréable', 'organisme'] },
        ],
      },
    ])
  })

  it('tolère une rangée sans barre verticale de fermeture', () => {
    const blocks = parseNotes('| | A | B |\n| Ligne | 1 | 2')
    expect(blocks).toEqual([
      {
        kind: 'table',
        columns: ['A', 'B'],
        rows: [{ label: 'Ligne', cells: ['1', '2'] }],
      },
    ])
  })

  it('referme un tableau sur une ligne vide, comme les autres blocs', () => {
    const blocks = parseNotes('| | A |\n| L | x |\n\nAprès.')
    expect(blocks.map((block) => block.kind)).toEqual(['table', 'paragraph'])
  })
})

describe('mise en forme dans le texte', () => {
  it('laisse un texte sans marqueur en un seul fragment', () => {
    expect(parseInline('Rien à signaler.')).toEqual([{ kind: 'text', text: 'Rien à signaler.' }])
  })

  it('reconnaît les cinq marqueurs', () => {
    expect(parseInline('**g** *i* __s__ `f` {violet}c{/violet}')).toEqual([
      { kind: 'strong', children: [{ kind: 'text', text: 'g' }] },
      { kind: 'text', text: ' ' },
      { kind: 'em', children: [{ kind: 'text', text: 'i' }] },
      { kind: 'text', text: ' ' },
      { kind: 'underline', children: [{ kind: 'text', text: 's' }] },
      { kind: 'text', text: ' ' },
      { kind: 'form', text: 'f' },
      { kind: 'text', text: ' ' },
      { kind: 'color', color: 'violet', children: [{ kind: 'text', text: 'c' }] },
    ])
  })

  it('imbrique du gras à l’intérieur d’une couleur', () => {
    expect(parseInline('{amber}une **thèse** centrale{/amber}')).toEqual([
      {
        kind: 'color',
        color: 'amber',
        children: [
          { kind: 'text', text: 'une ' },
          { kind: 'strong', children: [{ kind: 'text', text: 'thèse' }] },
          { kind: 'text', text: ' centrale' },
        ],
      },
    ])
  })

  it('n’ouvre pas de couleur sur un nom qui n’est pas dans la palette', () => {
    expect(parseInline('{rose}texte{/rose}')).toEqual([{ kind: 'text', text: '{rose}texte{/rose}' }])
  })

  it('n’ouvre pas de couleur dont la fermeture porte un autre nom', () => {
    expect(parseInline('{violet}texte{/amber}')).toEqual([{ kind: 'text', text: '{violet}texte{/amber}' }])
  })

  it('ne confond pas le gras avec l’italique', () => {
    expect(parseInline('**deux** puis *un*')).toEqual([
      { kind: 'strong', children: [{ kind: 'text', text: 'deux' }] },
      { kind: 'text', text: ' puis ' },
      { kind: 'em', children: [{ kind: 'text', text: 'un' }] },
    ])
  })

  it('interprète une forme anglaise à l’intérieur du gras', () => {
    // Régression : « **pas de `to`** » affichait les accents graves en clair.
    expect(parseInline('**pas de `to`**')).toEqual([
      {
        kind: 'strong',
        children: [
          { kind: 'text', text: 'pas de ' },
          { kind: 'form', text: 'to' },
        ],
      },
    ])
  })

  it('conserve le texte autour des marqueurs', () => {
    expect(parseInline('avant `will` après')).toEqual([
      { kind: 'text', text: 'avant ' },
      { kind: 'form', text: 'will' },
      { kind: 'text', text: ' après' },
    ])
  })

  it('laisse intact un marqueur non refermé', () => {
    expect(parseInline('un * isolé')).toEqual([{ kind: 'text', text: 'un * isolé' }])
  })
})

describe('commentaire entre parenthèses', () => {
  it('isole le commentaire final', () => {
    expect(splitAside('I will call you as soon as I arrive. (jamais « I will arrive »)')).toEqual({
      main: 'I will call you as soon as I arrive.',
      aside: 'jamais « I will arrive »',
    })
  })

  it('laisse intacte une phrase sans commentaire final', () => {
    expect(splitAside('She can swim.')).toEqual({ main: 'She can swim.', aside: null })
  })

  it('ne se laisse pas piéger par une parenthèse au milieu', () => {
    const text = 'Les horaires (trains, cinémas) prennent le présent simple.'
    expect(splitAside(text)).toEqual({ main: text, aside: null })
  })
})

describe('règle repliée sur plusieurs lignes', () => {
  it('poursuit le corps quand la ligne reste en suspens', () => {
    const blocks = parseNotes(
      '- `much`, `far` et `a lot` renforcent un comparatif, jamais un\n' +
        '  superlatif.\n' +
        '  much better, far more expensive\n',
    )
    const rule = (blocks[0] as { kind: 'rules'; rules: NoteRule[] }).rules[0]
    expect(rule.body).toBe('`much`, `far` et `a lot` renforcent un comparatif, jamais un superlatif.')
    expect(rule.example).toBe('much better, far more expensive')
  })

  it('traite la ligne indentée en exemple quand la règle est achevée', () => {
    const blocks = parseNotes('- `will` : décision prise à l\'instant.\n  I will help you.\n')
    const rule = (blocks[0] as { kind: 'rules'; rules: NoteRule[] }).rules[0]
    expect(rule.example).toBe('I will help you.')
  })

  it('ne se laisse pas abuser par une forme citée en fin de règle', () => {
    // « …that…` » se termine par une ellipse : la règle est achevée, la ligne
    // suivante est bien un exemple.
    const blocks = parseNotes('- `it is essential that…`\n  It is essential that he remain.\n')
    const rule = (blocks[0] as { kind: 'rules'; rules: NoteRule[] }).rules[0]
    expect(rule.body).toBe('`it is essential that…`')
    expect(rule.example).toBe('It is essential that he remain.')
  })

  it('recolle un corps replié sur trois lignes', () => {
    const blocks = parseNotes('- Suivis d\'une proposition : although,\n  even though,\n  whereas.\n')
    const rule = (blocks[0] as { kind: 'rules'; rules: NoteRule[] }).rules[0]
    // L'étiquette est détachée du corps, comme pour toute règle en « … : … ».
    expect(rule.label).toBe("Suivis d'une proposition")
    expect(rule.body).toBe('although, even though, whereas.')
    expect(rule.example).toBeNull()
  })
})
