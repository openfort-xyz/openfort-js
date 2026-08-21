#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const backendPath = process.env.BACKEND_OPENAPI_PATH
if (!backendPath) {
  console.error('BACKEND_OPENAPI_PATH is required')
  process.exit(1)
}

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const generated = read(path.join(__dirname, '..', 'src', 'backend-openapi.json'))
const backend = read(path.resolve(backendPath))

const fundingContract = (spec) => {
  const paths = Object.fromEntries(Object.entries(spec.paths ?? {}).filter(([key]) => key.startsWith('/v2/funding')))
  const schemas = {}
  const pending = [...JSON.stringify(paths).matchAll(/#\/components\/schemas\/([^"\\]+)/g)].map((match) => match[1])
  while (pending.length) {
    const name = pending.pop()
    if (!name || schemas[name]) continue
    const schema = spec.components?.schemas?.[name]
    if (!schema) throw new Error(`Missing referenced schema: ${name}`)
    schemas[name] = schema
    pending.push(...[...JSON.stringify(schema).matchAll(/#\/components\/schemas\/([^"\\]+)/g)].map((match) => match[1]))
  }
  return { paths, schemas }
}

const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
      : value

const expected = JSON.stringify(canonical(fundingContract(backend)))
const actual = JSON.stringify(canonical(fundingContract(generated)))
if (actual !== expected) {
  console.error('Generated /v2/funding OpenAPI contract has drifted; regenerate the backend client')
  process.exit(1)
}

console.log('Funding OpenAPI contract matches the backend Swagger')
