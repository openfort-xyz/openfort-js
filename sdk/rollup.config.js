import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';

import commonJs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import replace from '@rollup/plugin-replace';
import pkg from './package.json' assert {type: 'json'};
// import moduleReleases from './module-release.json' assert {type: 'json'};

// RELEASE_TYPE environment variable is set by the CI/CD pipeline
const releaseType = process.env.RELEASE_TYPE || 'alpha';

const getPackages = () =>
  [
    {location: 'packages/platform-bridge', name: '@openfort/platform-bridge'},
    {location: 'sdk', name: '@openfort/openfort-js'},
  ].map((pkg) => pkg.name);

// Get relevant files to bundle
const getFilesToBuild = () => {
  // Always build the index file
  const files = ['index'];

  const moduleFiles = []; //Object.keys(moduleReleases.modules);
  if (releaseType === 'alpha') {
    return [...files, ...moduleFiles];
  }

  // const returnModules = moduleFiles.filter(
  //   (file) => moduleReleases.modules[file] === 'prod'
  // );
  return [...files];
};

const getFileBuild = (inputFilename) => [
  {
    input: `./src/${inputFilename}.ts`,
    output: {
      dir: 'dist',
      format: 'es',
    },
    plugins: [
      nodeResolve({
        resolveOnly: getPackages(),
      }),
      json(),
      commonJs(),
      typescript({
        declaration: true,
        declarationDir: './dist/types',
      }),
      replace({
        exclude: 'node_modules/**',
        preventAssignment: true,
        __SDK_VERSION__: pkg.version,
      }),
    ],
  },
  {
    input: `./dist/types/${inputFilename}.d.ts`,
    output: {
      file: `./dist/${inputFilename}.d.ts`,
      format: 'es',
    },
    plugins: [
      dts({
        respectExternal: true,
      }),
    ],
    external: ['pg'],
  },
];

const buildBundles = () => {
  const modules = [];
  const filesToBuild = getFilesToBuild();
  for (const file of filesToBuild) {
    modules.push(...getFileBuild(file));
  }
  return modules;
};

export default [
  // Main build entry
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
    },
    plugins: [
      nodeResolve({
        resolveOnly: getPackages(),
      }),
      json(),
      commonJs(),
      typescript(),
      replace({
        exclude: 'node_modules/**',
        preventAssignment: true,
        __SDK_VERSION__: pkg.version,
      }),
    ],
  },
  // Export ES Modules
  ...buildBundles(),
];
