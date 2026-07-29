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

const modules = {
  input: `./src/index.ts`,
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

const types = {
  input: `./dist/types/index.d.ts`,
  output: {
    file: `./dist/index.d.ts`,
    format: 'es',
  },
  plugins: [
    dts({
      respectExternal: true,
    }),
  ],
  external: ['pg'],
}

const cjs = {
  input: 'src/index.ts',
  output: {
    dir: 'dist/cjs',
    format: 'cjs',
    preserveModules: true,
    entryFileNames: '[name].cjs',
    chunkFileNames: '[name].cjs',
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

export default [cjs, modules, types]
