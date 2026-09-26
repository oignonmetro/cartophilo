import { describe, expect, it } from 'vitest'
import {
  citationCardFromSelection,
  fillGaps,
  nextParagraphLabel,
  reconstructPassage,
  sentenceBounds,
  splitMultiGap,
} from './textUnit'

describe('outils de l’éditeur pour les unités de texte', () => {
  it('remplit plusieurs trous dans l’ordre', () => {
    expect(fillGaps('par ___, en un mot : ___.', 'l’accommodement ; moralement')).toBe(
      'par l’accommodement, en un mot : moralement.',
    )
    expect(fillGaps('un seul ___ ici', 'a ; b')).toBe('un seul a ; b ici')
  })

  it('reconstitue le paragraphe fragment par fragment et signale les divergences', () => {
    const { text, conflicts } = reconstructPassage([
      { sentence: '« B ___ fin. »', answer: 'deux', fragment: '2/2' },
      { sentence: '« A ___ un. »', answer: 'mot', fragment: '1/2' },
      { sentence: '« A mot ___. »', answer: 'un', fragment: '1/2' },
      { sentence: '« B ___ fin. »', answer: 'autre', fragment: '2/2' },
      { sentence: 'Une explication ___.', answer: 'x' },
    ])
    expect(text).toBe('A mot un. B deux fin.')
    expect(conflicts).toEqual(['2/2'])
  })

  it('trouve les bornes de la phrase qui contient la sélection', () => {
    const text = 'Première phrase. La vie la plus heureuse est celle-ci ! Dernière.'
    const at = text.indexOf('la plus')
    expect(text.slice(...Object.values(sentenceBounds(text, at, at + 7)) as [number, number])).toBe(
      'La vie la plus heureuse est celle-ci !',
    )
  })

  it('crée une carte-citation trouée sur la sélection, dans sa phrase ou tout le paragraphe', () => {
    const text = 'Cependant, à titre secondaire, la vie la plus heureuse est celle-là. Suite.'
    const start = text.indexOf('la vie')
    const end = start + 'la vie la plus heureuse '.length
    expect(citationCardFromSelection(text, start, end, 'sentence')).toEqual({
      sentence: '« Cependant, à titre secondaire, ___ est celle-là. »',
      answer: 'la vie la plus heureuse',
    })
    expect(citationCardFromSelection(text, start, end, 'paragraph')?.sentence).toBe(
      '« Cependant, à titre secondaire, ___ est celle-là. Suite. »',
    )
    expect(citationCardFromSelection(text, 3, 3, 'sentence')).toBeNull()
  })

  it('décline une carte à plusieurs trous pour une leçon classique', () => {
    expect(splitMultiGap('a ___ b ___ c', 'x ; y')).toEqual([
      { sentence: 'a ___ b y c', answer: 'x' },
      { sentence: 'a x b ___ c', answer: 'y' },
    ])
    expect(splitMultiGap('a ___ b', 'x')).toEqual([{ sentence: 'a ___ b', answer: 'x' }])
  })

  it('propose le repère du paragraphe suivant', () => {
    expect(nextParagraphLabel([null, 'Introduction'])).toBe('§1')
    expect(nextParagraphLabel(['§1', '§2', '§4', 'Ouverture'])).toBe('§5')
  })
})
