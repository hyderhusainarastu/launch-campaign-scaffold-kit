// Runs the validator on the worked example (must pass) and on a deliberately
// broken manifest (must fail with exit code 2). Offline, no dependencies.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tool = path.join(root, 'tools', 'validate-manifest.mjs');
let failed = 0;

function run(name, file, wantStatus, wantText) {
  const r = spawnSync(process.execPath, [tool, path.join(root, file)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === wantStatus && (!wantText || out.includes(wantText));
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (exit ${r.status})`);
  if (!ok) { failed++; console.log(out); }
}

run('example manifest is valid', 'examples/lumen-deck/campaign-manifest.json', 0, 'VALID');
run('broken manifest is rejected', 'tests/fixtures/broken-manifest.json', 2, 'INVALID');
process.exit(failed ? 1 : 0);
