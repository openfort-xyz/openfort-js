import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from './crypto'

const RFC4122_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('randomUUID', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an RFC 4122 v4 UUID from the native implementation', () => {
    expect(randomUUID()).toMatch(RFC4122_V4)
  })

  describe('fallback path (crypto.randomUUID unavailable)', () => {
    const withoutNativeRandomUUID = () => {
      // The implementation guards on the property being present, so the
      // fallback is exercised by replacing the whole `crypto` object with one
      // that lacks `randomUUID` — the shape older WebViews actually expose.
      return vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue({
        getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
        subtle: globalThis.crypto.subtle,
      } as unknown as Crypto)
    }

    it('produces a correctly shaped v4 UUID', () => {
      withoutNativeRandomUUID()
      expect(randomUUID()).toMatch(RFC4122_V4)
    })

    it('sets the version nibble to 4 and the variant bits to 10', () => {
      withoutNativeRandomUUID()
      for (let i = 0; i < 500; i++) {
        const uuid = randomUUID()
        expect(uuid[14]).toBe('4')
        expect(['8', '9', 'a', 'b']).toContain(uuid[19])
      }
    })

    it('places hyphens at the 8-4-4-4-12 boundaries and is 36 chars', () => {
      withoutNativeRandomUUID()
      const uuid = randomUUID()
      expect(uuid).toHaveLength(36)
      expect([8, 13, 18, 23].map((i) => uuid[i])).toEqual(['-', '-', '-', '-'])
    })

    it('does not repeat across many draws', () => {
      withoutNativeRandomUUID()
      const seen = new Set(Array.from({ length: 2000 }, () => randomUUID()))
      expect(seen.size).toBe(2000)
    })

    it('draws entropy from a CSPRNG, never Math.random', () => {
      withoutNativeRandomUUID()
      const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues')
      const mathRandom = vi.spyOn(Math, 'random')
      randomUUID()
      expect(getRandomValues).toHaveBeenCalled()
      expect(mathRandom).not.toHaveBeenCalled()
    })
  })
})
