import { describe, expect, it } from 'vitest'
import { isNumberingCorrect, isTitleCorrect, parseNumbering } from './treatiseAnswers'

describe('numérotation tapée', () => {
  it('lit le rang, l’Ennéade et la place', () => {
    expect(parseNumbering('53 [I, 1]')).toEqual({ chrono: 53, ennead: 1, place: 1 })
    expect(parseNumbering('9 [VI, 9]')).toEqual({ chrono: 9, ennead: 6, place: 9 })
    expect(parseNumbering('rien')).toBeNull()
    expect(parseNumbering('53')).toBeNull()
  })

  it('accepte les écritures voisines', () => {
    for (const typed of ['53 [I, 1]', '53 I 1', '53, I, 1', 'I, 1 (53)', '53 [i,1]', '[I,1] 53']) {
      expect(isNumberingCorrect('53 [I, 1]', typed)).toBe(true)
    }
  })

  it('distingue le rang chronologique de la place chez Porphyre', () => {
    expect(isNumberingCorrect('1 [I, 6]', '6 [I, 1]')).toBe(false)
    expect(isNumberingCorrect('1 [I, 6]', '1 [I, 6]')).toBe(true)
    expect(isNumberingCorrect('27 [IV, 3]', '27 [III, 4]')).toBe(false)
    expect(isNumberingCorrect('27 [IV, 3]', '27 [IV, 4]')).toBe(false)
  })
})

describe('titre tapé', () => {
  const title = 'Sur la raison pour laquelle l’être, un et identique, est partout tout entier I'

  it('ignore la casse, les accents et la ponctuation', () => {
    expect(isTitleCorrect('Sur l’immortalité de l’âme', 'sur l\'immortalite de l\'ame')).toBe(true)
    expect(isTitleCorrect(title, title.toLowerCase())).toBe(true)
  })

  it('pardonne une faute de frappe', () => {
    expect(isTitleCorrect('Sur la providence I', 'Sur la providance I')).toBe(true)
    expect(isTitleCorrect('Sur la providence I', 'Sur le destin')).toBe(false)
  })

  it('ne confond pas deux traités qui ne diffèrent que par leur numéro', () => {
    expect(isTitleCorrect('Sur la providence I', 'Sur la providence II')).toBe(false)
    expect(isTitleCorrect('Sur la providence II', 'Sur la providence II')).toBe(true)
    expect(isTitleCorrect('Sur la providence I', 'Sur la providence')).toBe(false)
    expect(isTitleCorrect('Sur les genres de l’être III', 'sur les genres de l’être ii')).toBe(false)
  })

  it('accepte un titre sans ce qui est entre parenthèses, ou sans son second titre', () => {
    const long =
      'Comment l’on dit que l’âme est intermédiaire entre la réalité indivisible et la réalité divisible (Sur la réalité de l’âme II)'
    expect(isTitleCorrect(long, long)).toBe(true)
    expect(
      isTitleCorrect(long, 'Comment l’on dit que l’âme est intermédiaire entre la réalité indivisible et la réalité divisible'),
    ).toBe(true)
    const double = 'Sur les difficultés relatives à l’âme III, ou Sur la vue'
    expect(isTitleCorrect(double, 'Sur les difficultés relatives à l’âme III')).toBe(true)
    expect(isTitleCorrect(double, 'Sur les difficultés relatives à l’âme II')).toBe(false)
  })

  it('refuse une réponse vide', () => {
    expect(isTitleCorrect('Sur le beau', '')).toBe(false)
    expect(isTitleCorrect('Sur le beau', '   ')).toBe(false)
  })
})
