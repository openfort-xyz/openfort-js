import { readFileSync } from 'node:fs'
import commonJs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

import { visualizer } from 'rollup-plugin-visualizer'

const packages = JSON.parse(readFileSync('./workspace-packages.json', { encoding: 'utf8' }))

const getPackages = () => packages.map((pkg) => pkg.name)

// Output is not minified: consumer bundlers minify with full cross-module
// context. Sourcemaps ship so stack traces into the SDK stay readable.

// Published entry points, one per `exports` key in package.json. The root
// entry evaluates `Openfort.getEventEmitter()` at module scope, so it can
// never be tree-shaken; the others are reachable without side effects and
// exist so consumers can import errors or types without paying for the
// client graph. `size-limit` budgets each one to keep that true.
const entryPoints = ['./src/index.ts', './src/errors.ts', './src/types/types.ts']

// `dist/types/<name>.d.ts` is where the TypeScript plugin emits declarations
// for each entry; `dist/<file>` is the bundle rollup-plugin-dts rolls them up
// into, which is what the `exports` map points at.
const typeEntryPoints = [
  { input: './dist/types/index.d.ts', file: './dist/index.d.ts' },
  { input: './dist/types/errors.d.ts', file: './dist/errors.d.ts' },
  { input: './dist/types/types/types.d.ts', file: './dist/types.d.ts' },
]

const modules = {
  input: entryPoints,
  output: {
    dir: 'dist',
    format: 'es',
    preserveModules: true,
    sourcemap: true,
  },
  plugins: [
    nodeResolve({
      resolveOnly: [...getPackages()],
    }),
    json(),
    commonJs(),
    typescript({
      noEmitOnError: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      tsconfig: 'tsconfig.build.json',
      declarationDir: './dist/types',
    }),
    replace({
      exclude: 'node_modules/**',
      preventAssignment: true,
      __SDK_VERSION__: pkg.version,
    }),
  ],
}

const types = typeEntryPoints.map(({ input, file }) => ({
  input,
  output: {
    file,
    format: 'es',
  },
  plugins: [
    dts({
      respectExternal: true,
    }),
  ],
  external: ['pg'],
}))

const cjs = {
  input: entryPoints,
  output: {
    dir: 'dist/cjs',
    format: 'cjs',
    preserveModules: true,
    entryFileNames: '[name].cjs',
    chunkFileNames: '[name].cjs',
    sourcemap: true,
    // Decides how `import x from 'dep'` is lowered for dependencies left
    // external. A transpiled dependency marks itself with `__esModule` and puts
    // its default export on `.default`, while a hand-written CJS dependency IS
    // its own default export. `'auto'` emits a helper that tests `__esModule`
    // and unwraps accordingly, so both shapes work; the narrower `'default'`
    // assumes the latter and calls the module namespace object for the former,
    // which throws only at runtime. environments/node exercises this path.
    interop: 'auto',
  },
  plugins: [
    nodeResolve({
      resolveOnly: [...getPackages()],
    }),
    json(),
    commonJs(),
    typescript({
      noEmitOnError: true,
      sourceMap: true,
      tsconfig: 'tsconfig.build.json',
    }),
    replace({
      exclude: 'node_modules/**',
      preventAssignment: true,
      __SDK_VERSION__: pkg.version,
    }),
    visualizer(),
  ],
}

export default [cjs, modules, ...types]
