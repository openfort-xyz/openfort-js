import { describe, expect, it, vi } from 'vitest'
import { humanId } from './humanId'

describe('humanId', () => {
  it('returns space-separated capitalised words', () => {
    expect(humanId()).toMatch(/^[A-Z][a-z]+( [A-Z][a-z]+){1,2}$/)
  })

  it('draws from the CSPRNG, never Math.random', () => {
    const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues')
    const mathRandom = vi.spyOn(Math, 'random')
    humanId()
    expect(getRandomValues).toHaveBeenCalled()
    expect(mathRandom).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('produces varied labels', () => {
    const seen = new Set(Array.from({ length: 200 }, () => humanId()))
    // Labels are for display, not identity, but they should not be constant.
    expect(seen.size).toBeGreaterThan(100)
  })

  it('never repeats the same adjective twice in one label', () => {
    for (let i = 0; i < 500; i++) {
      const words = humanId().split(' ')
      expect(new Set(words).size).toBe(words.length)
    }
  })
})
