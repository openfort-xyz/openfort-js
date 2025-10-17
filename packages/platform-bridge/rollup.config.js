import commonJs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

const unityHtmlTemplate = () => {
  return {
    name: 'html-template',
    generateBundle(_options, bundle) {
      // Get the generated JS code
      const jsFileName = Object.keys(bundle).find((name) => name.endsWith('.js'))
      const jsCode = bundle[jsFileName].code

      // Delete the separate JS file since we're inlining it
      delete bundle[jsFileName]

      // Create HTML with inlined JS
      const html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Platform Bridge</title>
    <script>
${jsCode}
    </script>
</head>
<body>
    <h1>Bridge Running</h1>
</body>
</html>`

      // Emit the HTML file
      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: html,
      })
    },
  }
}

const unity = {
  input: 'src/bridge.ts',
  output: {
    dir: 'dist/unity',
    format: 'iife',
    name: 'OpenfortBridge',
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    json(),
    commonJs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      compilerOptions: {
        outDir: 'dist/unity',
      },
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    terser(),
    unityHtmlTemplate(),
  ],
}

const bundle = {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle/index.js',
    format: 'iife',
    name: 'Openfort',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    json(),
    commonJs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    terser(),
  ],
}

export default [unity, bundle]
