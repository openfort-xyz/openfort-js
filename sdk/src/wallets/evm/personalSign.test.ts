import { hashMessage } from '@ethersproject/hash'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '../../core/configuration/account'
import { AccountTypeEnum } from '../../types/types'
import { personalSign } from './personalSign'

// Capture the EIP-191 hash personal_sign feeds into signMessage, so we can assert the
// message is hashed correctly regardless of how it was encoded.
vi.mock('./walletHelpers', () => ({
  signMessage: vi.fn(async ({ hash }: { hash: string }) => hash),
}))

const account = {
  address: '0xAbC0000000000000000000000000000000000001',
  type: AccountTypeEnum.EOA,
  chainId: 100,
} as unknown as Account
const signer = {} as never

const hexOf = (text: string) => `0x${Buffer.from(text, 'utf8').toString('hex')}`

describe('personalSign', () => {
  it('hashes a plain UTF-8 string and its hex encoding identically', async () => {
    const text = 'gnosispay.com wants you to sign in with your Ethereum account:'
    const fromPlain = await personalSign({ params: [text, account.address], signer, account })
    const fromHex = await personalSign({ params: [hexOf(text), account.address], signer, account })

    expect(fromPlain).toBe(hashMessage(text))
    expect(fromHex).toBe(hashMessage(text))
  })

  it('matches the from address case-insensitively', async () => {
    const result = await personalSign({ params: ['hello', account.address.toLowerCase()], signer, account })
    expect(result).toBe(hashMessage('hello'))
  })

  it('rejects when the from address is not the account', async () => {
    await expect(
      personalSign({ params: ['hello', '0x0000000000000000000000000000000000000009'], signer, account })
    ).rejects.toThrow(/from address/)
  })

  it('rejects when the message or address is missing', async () => {
    await expect(personalSign({ params: [undefined, account.address], signer, account })).rejects.toThrow(
      /address and a message/
    )
  })
})
