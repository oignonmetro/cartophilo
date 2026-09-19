import { describe, expect, it } from 'vitest'
import { sentenceTextSize } from './textDensity'

describe('sentenceTextSize', () => {
  it('keeps the base size for a short sentence', () => {
    expect(sentenceTextSize('text-xl', 40)).toBe('text-xl')
  })

  it('shrinks step by step as the sentence lengthens', () => {
    expect(sentenceTextSize('text-xl', 200)).toBe('text-lg')
    expect(sentenceTextSize('text-xl', 350)).toBe('text-base')
    expect(sentenceTextSize('text-xl', 600)).toBe('text-sm')
  })

  it('never shrinks past the smallest size on the ladder', () => {
    expect(sentenceTextSize('text-base', 999)).toBe('text-sm')
  })

  it('scales from any base size, not just text-xl', () => {
    expect(sentenceTextSize('text-2xl', 200)).toBe('text-xl')
    expect(sentenceTextSize('text-2xl', 600)).toBe('text-base')
  })
})
