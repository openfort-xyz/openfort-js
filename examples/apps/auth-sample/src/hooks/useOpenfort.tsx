/**
 * Re-exports from OpenfortContext for backward compatibility.
 * New code should import from '../contexts/OpenfortContext' instead.
 */
// biome-ignore lint/performance/noBarrelFile: Backward compatibility re-export
export { OpenfortProvider, useOpenfort } from '../contexts/OpenfortContext'
