import { vi } from 'vitest'
import type { IStorage } from '../../storage/istorage'

/**
 * Minimal IStorage mock shared by API/wallet unit tests. `get` resolves null
 * by default — override per-test (e.g. `vi.mocked(storage.get).mockResolvedValue(...)`)
 * to simulate persisted auth/account state.
 */
export function makeStorage(): IStorage {
  return {
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn(),
    remove: vi.fn(),
    flush: vi.fn(),
  } as unknown as IStorage
}
