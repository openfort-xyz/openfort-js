/**
 * Generates a short, human-readable identifier such as "Calm Silver Otter".
 *
 * Used only for passkey device labels, which users read in an account UI. It
 * is a label, not an identifier: uniqueness is not required and it is never
 * used for authentication or key derivation.
 */

const ADJECTIVES = [
  'Amber',
  'Ancient',
  'Autumn',
  'Bold',
  'Brave',
  'Bright',
  'Calm',
  'Clever',
  'Cosmic',
  'Crimson',
  'Curious',
  'Daring',
  'Eager',
  'Electric',
  'Emerald',
  'Fearless',
  'Gentle',
  'Gilded',
  'Golden',
  'Happy',
  'Hidden',
  'Humble',
  'Icy',
  'Jolly',
  'Keen',
  'Lively',
  'Lucky',
  'Merry',
  'Mighty',
  'Noble',
  'Polished',
  'Proud',
  'Quick',
  'Quiet',
  'Rapid',
  'Royal',
  'Rustic',
  'Silent',
  'Silver',
  'Smooth',
  'Solar',
  'Spry',
  'Steady',
  'Stellar',
  'Sunny',
  'Swift',
  'Tidy',
  'Vivid',
  'Warm',
  'Wise',
] as const

const NOUNS = [
  'Anchor',
  'Arrow',
  'Badger',
  'Beacon',
  'Bison',
  'Canyon',
  'Cedar',
  'Comet',
  'Compass',
  'Coral',
  'Crane',
  'Dolphin',
  'Ember',
  'Falcon',
  'Fern',
  'Forest',
  'Fox',
  'Glacier',
  'Harbor',
  'Hawk',
  'Heron',
  'Island',
  'Lantern',
  'Lark',
  'Lynx',
  'Meadow',
  'Mesa',
  'Meteor',
  'Orbit',
  'Otter',
  'Owl',
  'Panther',
  'Prairie',
  'Quartz',
  'Raven',
  'Reef',
  'River',
  'Sparrow',
  'Spruce',
  'Stag',
  'Summit',
  'Thunder',
  'Tiger',
  'Trail',
  'Valley',
  'Vine',
  'Willow',
  'Wolf',
  'Wren',
  'Zephyr',
] as const

/** Uniform random index using the CSPRNG, with rejection sampling to avoid modulo bias. */
function randomIndex(bound: number): number {
  const limit = Math.floor(0xffffffff / bound) * bound
  const buffer = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0] as number
  } while (value >= limit)
  return value % bound
}

export function humanId(): string {
  const first = ADJECTIVES[randomIndex(ADJECTIVES.length)]
  const second = ADJECTIVES[randomIndex(ADJECTIVES.length)]
  const noun = NOUNS[randomIndex(NOUNS.length)]
  return first === second ? `${first} ${noun}` : `${first} ${second} ${noun}`
}
