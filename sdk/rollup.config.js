import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { readFileSync } from 'fs';
import commonJs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import replace from '@rollup/plugin-replace';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
import { visualizer } from 'rollup-plugin-visualizer';
import terser from '@rollup/plugin-terser';

const packages = JSON.parse(
  readFileSync('./workspace-packages.json', { encoding: 'utf8' })
);

const getPackages = () => packages.map((pkg) => pkg.name);

const modules =
{
  input: `./src/index.ts`,
  output: {
    dir: 'dist',
    format: 'es',
    preserveModules: true,
  },
  plugins: [
    nodeResolve({
      resolveOnly: [...getPackages(), 'penpal'],
    }),
    json(),
    commonJs(),
    typescript({
      declaration: true,
      tsconfig: 'tsconfig.json',
      declarationDir: './dist/types',
    }),
    terser(),
    replace({
      exclude: 'node_modules/**',
      preventAssignment: true,
      __SDK_VERSION__: pkg.version,
    }),
  ],
}

const types =
{
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
  },
  plugins: [
    nodeResolve({
      resolveOnly: [...getPackages(), 'penpal'],
    }),
    json(),
    commonJs(),
    typescript({
      tsconfig: 'tsconfig.json',
    }),
    terser(),
    replace({
      exclude: 'node_modules/**',
      preventAssignment: true,
      __SDK_VERSION__: pkg.version,
    }),
    visualizer(),
  ],
}

export default [
  cjs,
  modules,
  types,
];
