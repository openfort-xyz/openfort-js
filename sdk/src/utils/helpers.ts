/**
 * Utility type for creating union types where only one property can be set at a time.
 * This is useful for creating mutually exclusive options.
 */
export type OneOf<T> = T extends infer U ? U & Partial<Record<Exclude<keyof T, keyof U>, never>> : never

/**
 * Utility type to make a union by removing specific keys from each type
 */
export type UnionOmit<T, K extends keyof T> = T extends any ? Omit<T, K> : never

/**
 * Utility type to make a result more readable by flattening type intersections
 */
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

/**
 * Utility type for making certain properties optional in a type.
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Utility type for making certain properties required in a type.
 */
export type RequiredProperties<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Utility function to check if a value is defined (not null or undefined).
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Utility function to safely access nested object properties.
 */
export function get<T, K extends keyof T>(obj: T, key: K): T[K] | undefined {
  return obj?.[key]
}

/**
 * Utility function to create a deep copy of an object.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T
  }

  if (typeof obj === 'object') {
    const cloned = {} as T
    Object.keys(obj).forEach((key) => {
      cloned[key as keyof T] = deepClone(obj[key as keyof T])
    })
    return cloned
  }

  return obj
}

/**
 * Utility function to merge objects deeply.
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key as keyof T]
    const targetValue = result[key as keyof T]

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key as keyof T] = deepMerge(targetValue, sourceValue)
    } else {
      result[key as keyof T] = sourceValue as T[Extract<keyof T, string>]
    }
  })

  return result
}

/**
 * Utility function to create a promise that resolves after a specified delay.
 */
export function delay(ms: number): Promise<void> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Utility function to retry an async operation with exponential backoff.
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await operation()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw lastError
      }

      const delayMs = baseDelay * 2 ** attempt
      // eslint-disable-next-line no-await-in-loop
      await delay(delayMs)
    }
  }

  throw lastError!
}
