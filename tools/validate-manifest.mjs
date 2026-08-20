#!/usr/bin/env node
// validate-manifest.mjs — check a campaign manifest against the kit's schema.
//
// This is a deliberately small structural validator with no dependencies. It
// implements the subset of JSON Schema the manifest schema actually uses:
// type, required, properties, additionalProperties:false, items, minItems,
// uniqueItems, enum, minimum, maximum, minLength, pattern, and integer checks.
// It is not a conformant JSON Schema implementation and does not try to be. If
// you want full validation, run the same schema through a real validator; this
// exists so the repo can self-check with nothing installed.
//
// Usage:
//   node tools/validate-manifest.mjs <manifest.json> [schema.json]
//
// Exit codes: 0 valid, 1 usage/read error, 2 invalid.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA = path.join(HERE, '..', 'schema', 'campaign-manifest.schema.json');

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function typeMatches(value, expected) {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  if (expected === 'integer') return actual === 'integer';
  return actual === expected;
}

function validate(value, schema, pointer, errors) {
  if (!schema || typeof schema !== 'object') return;

  if (schema.type !== undefined) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((t) => typeMatches(value, t))) {
      errors.push(`${pointer}: expected type ${expected.join(' or ')}, got ${typeOf(value)}`);
      return;
    }
  }

  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(`${pointer}: value ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${pointer}: string shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${pointer}: string ${JSON.stringify(value)} does not match pattern ${schema.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${pointer}: ${value} is below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${pointer}: ${value} is above maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${pointer}: array has ${value.length} items, minItems is ${schema.minItems}`);
    }
    if (schema.uniqueItems === true) {
      const seen = new Set(value.map((v) => JSON.stringify(v)));
      if (seen.size !== value.length) errors.push(`${pointer}: array items are not unique`);
    }
    if (schema.items) {
      value.forEach((item, i) => validate(item, schema.items, `${pointer}/${i}`, errors));
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${pointer}: missing required property "${key}"`);
    }
    const props = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props) && !key.startsWith('$')) {
          errors.push(`${pointer}: unexpected property "${key}"`);
        }
      }
    }
    for (const [key, sub] of Object.entries(props)) {
      if (key in value) validate(value[key], sub, `${pointer}/${key}`, errors);
    }
  }
}

// Consistency checks the schema itself cannot express.
function crossChecks(manifest, errors) {
  const pub = manifest.publication;
  if (pub && pub.publicLaunchAuthorized === true) {
    if (Array.isArray(pub.blockers) && pub.blockers.length > 0) {
      errors.push('/publication: publicLaunchAuthorized is true while blockers is non-empty');
    }
    if (pub.mode !== 'live' && pub.mode !== 'staged') {
      errors.push(`/publication: publicLaunchAuthorized is true but mode is "${pub.mode}"`);
    }
  }
  if (pub && pub.postingAuthorized === true && pub.mode === 'draft') {
    errors.push('/publication: postingAuthorized is true while mode is "draft"');
  }
  const alloc = manifest.budget?.allocations;
  if (Array.isArray(alloc) && alloc.length > 0) {
    const sum = alloc.reduce((acc, a) => acc + (a.sharePct ?? 0), 0);
    if (Math.abs(sum - 1) > 0.005) {
      errors.push(`/budget/allocations: shares sum to ${sum.toFixed(3)}, expected 1.000`);
    }
  }
  const ids = (manifest.tiers ?? []).map((t) => t.id);
  if (new Set(ids).size !== ids.length) errors.push('/tiers: duplicate tier ids');
}

async function main() {
  const [manifestPath, schemaPath = DEFAULT_SCHEMA] = process.argv.slice(2);
  if (!manifestPath) {
    process.stderr.write('Usage: node tools/validate-manifest.mjs <manifest.json> [schema.json]\n');
    process.exit(1);
  }

  let manifest, schema;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`Could not read input: ${err.message}\n`);
    process.exit(1);
  }

  const errors = [];
  validate(manifest, schema, '', errors);
  crossChecks(manifest, errors);

  if (errors.length === 0) {
    process.stdout.write(`VALID: ${path.basename(manifestPath)} checks out against ${path.basename(schemaPath)}\n`);
    process.exit(0);
  }
  process.stdout.write(`INVALID: ${errors.length} problem(s) in ${path.basename(manifestPath)}\n`);
  for (const e of errors) process.stdout.write(`  - ${e}\n`);
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
