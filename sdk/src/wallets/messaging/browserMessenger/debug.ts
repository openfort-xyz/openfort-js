import type { Log } from './types'

const debug =
  (prefix?: string): Log =>
  (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.log(`✍️ %c${prefix}%c`, 'font-weight: bold;', '', ...args)
  }

export default debug
