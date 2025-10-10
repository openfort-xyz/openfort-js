/**
 * Utility type for creating union types where only one property can be set at a time.
 * This is useful for creating mutually exclusive options.
 */
export type OneOf<T> = T extends infer U ? U & Partial<Record<Exclude<keyof T, keyof U>, never>> : never

/**
 * Utility type to make a result more readable by flattening type intersections
 */
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
