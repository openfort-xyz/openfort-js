/**
 * Map common (and otherwise opaque) JSON-RPC node error messages to short,
 * human-readable ones. Unknown messages are returned unchanged, so no detail is
 * lost for cases we don't recognize.
 *
 * Example: node responses like
 * `processing response error (body="{...}", error={"code":3}, ...
 *  "message":"insufficient funds for gas * price + value"}`
 * become `Insufficient funds: ...`.
 */
export function normalizeRpcErrorMessage(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('insufficient funds')) {
    return "Insufficient funds: the wallet doesn't have enough native token to cover gas (plus any value). Top up the wallet and try again."
  }

  if (lower.includes('execution reverted') || lower.includes('reverted')) {
    return 'Transaction reverted: the contract rejected this call.'
  }

  if (lower.includes('nonce too low') || lower.includes('replacement transaction underpriced')) {
    return 'Nonce conflict: another transaction from this wallet is still pending. Wait for it to confirm, then retry.'
  }

  if (
    lower.includes('intrinsic gas too low') ||
    lower.includes('gas required exceeds') ||
    lower.includes('out of gas')
  ) {
    return 'Gas error: the transaction needs more gas than is available or allowed.'
  }

  return message
}
