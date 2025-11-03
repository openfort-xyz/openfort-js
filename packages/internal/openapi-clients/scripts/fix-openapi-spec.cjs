#!/usr/bin/env node

/**
 * Post-process the merged OpenAPI spec to fix incomplete array definitions
 */

const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, '..', 'src', 'backend-openapi.json');

console.log('Fixing OpenAPI spec...');

// Read the spec
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

// Recursive function to fix array types without items and null types
function fixArrayTypes(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  for (const key in obj) {
    const value = obj[key];

    // Fix scopes array to have string items
    if (key === 'scopes' && value?.type === 'array' && !value.items) {
      console.log(`  Fixing 'scopes' array type`);
      value.items = { type: 'string' };
    }

    // Fix properties with type: "null" - remove them or convert to string with nullable
    if (value?.type === 'null') {
      console.log(`  Fixing '${key}' with type "null"`);
      // If it's nullable, just remove the type and keep nullable
      // Or if it should be a string, set it to string
      if (key === 'url') {
        delete value.type;
        value.nullable = true;
      }
    }

    // Recursively process nested objects
    fixArrayTypes(value);
  }
}

fixArrayTypes(spec);

// Write back the fixed spec
fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

console.log('✓ OpenAPI spec fixed successfully');
