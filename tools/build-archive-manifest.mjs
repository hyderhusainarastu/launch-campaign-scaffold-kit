#!/usr/bin/env node
// build-archive-manifest.mjs — inventory an assets directory.
//
// Walks a directory, and for every file emits a manifest row with a sha256
// checksum, byte size, extension, and — where a probe tool is available on the
// machine — media dimensions and duration. Probes are strictly optional: if
// neither `sips` nor `ffprobe` is installed, the manifest still builds and the
// probe fields are simply absent.
//
// Usage:
//   node tools/build-archive-manifest.mjs <assets-dir> [options]
//
// Options:
//   -o, --out <file>   Write JSON here instead of stdout.
//   --no-probe         Skip media probing entirely (fast; checksums only).
//   --include-hidden   Include dotfiles and dot-directories.
//   -h, --help         Show this help.
//
// The output is deliberately boring: a sorted array of plain objects. Diff two
// runs to see exactly what changed in an archive between builds.

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const MANIFEST_VERSION = '1.0';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.tif', '.tiff', '.heic', '.webp', '.bmp']);
const AV_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg']);

function parseArgs(argv) {
  const opts = { dir: null, out: null, probe: true, includeHidden: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--no-probe') opts.probe = false;
    else if (a === '--include-hidden') opts.includeHidden = true;
    else if (a === '-o' || a === '--out') opts.out = argv[++i] ?? null;
    else if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
    else if (opts.dir === null) opts.dir = a;
    else throw new Error(`Unexpected extra argument: ${a}`);
  }
  return opts;
}

function haveTool(name) {
  try {
    const r = spawnSync(name, ['--help'], { stdio: 'ignore', timeout: 5000 });
    if (r.error) return false;
    // Some tools exit non-zero on --help; presence is what matters.
    return r.status !== null || r.signal === null;
  } catch {
    return false;
  }
}

async function walk(root, dir, includeHidden, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    out.errors.push({ path: path.relative(root, dir) || '.', error: `unreadable directory: ${err.code ?? err.message}` });
    return;
  }
  for (const entry of entries) {
    if (!includeHidden && entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(root, full, includeHidden, out);
    } else if (entry.isFile()) {
      out.files.push(full);
    } else if (entry.isSymbolicLink()) {
      out.errors.push({ path: path.relative(root, full), error: 'symlink skipped' });
    }
  }
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function probeImageWithSips(file) {
  const r = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], {
    encoding: 'utf8',
    timeout: 20000,
  });
  if (r.error || r.status !== 0 || !r.stdout) return null;
  const width = /pixelWidth:\s*(\d+)/.exec(r.stdout);
  const height = /pixelHeight:\s*(\d+)/.exec(r.stdout);
  if (!width || !height) return null;
  return { probe: 'sips', width: Number(width[1]), height: Number(height[1]) };
}

function probeWithFfprobe(file) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', file],
    { encoding: 'utf8', timeout: 30000 }
  );
  if (r.error || r.status !== 0 || !r.stdout) return null;
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    return null;
  }
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const video = streams.find((s) => s.codec_type === 'video');
  const durationRaw = parsed.format?.duration;
  const result = { probe: 'ffprobe' };
  if (video?.width && video?.height) {
    result.width = Number(video.width);
    result.height = Number(video.height);
  }
  if (durationRaw !== undefined && durationRaw !== 'N/A') {
    const seconds = Number(durationRaw);
    if (Number.isFinite(seconds)) result.durationSeconds = Math.round(seconds * 1000) / 1000;
  }
  result.streamKinds = [...new Set(streams.map((s) => s.codec_type).filter(Boolean))];
  if (Object.keys(result).length === 1) return null;
  return result;
}

function probe(file, ext, tools) {
  try {
    if (IMAGE_EXTS.has(ext)) {
      if (tools.sips) {
        const r = probeImageWithSips(file);
        if (r) return r;
      }
      if (tools.ffprobe) return probeWithFfprobe(file);
      return null;
    }
    if (AV_EXTS.has(ext) && tools.ffprobe) return probeWithFfprobe(file);
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help || !opts.dir) {
    process.stdout.write(
      [
        'build-archive-manifest.mjs — inventory an assets directory.',
        '',
        'Usage: node tools/build-archive-manifest.mjs <assets-dir> [options]',
        '',
        '  -o, --out <file>   Write JSON here instead of stdout.',
        '  --no-probe         Skip media probing (checksums only).',
        '  --include-hidden   Include dotfiles and dot-directories.',
        '  -h, --help         Show this help.',
        '',
      ].join('\n')
    );
    process.exit(opts.help ? 0 : 2);
  }

  const root = path.resolve(opts.dir);
  const rootStat = await stat(root).catch(() => null);
  if (!rootStat || !rootStat.isDirectory()) {
    process.stderr.write(`Not a directory: ${opts.dir}\n`);
    process.exit(1);
  }

  const tools = opts.probe
    ? { sips: haveTool('sips'), ffprobe: haveTool('ffprobe') }
    : { sips: false, ffprobe: false };

  const collected = { files: [], errors: [] };
  await walk(root, root, opts.includeHidden, collected);
  collected.files.sort();

  const entries = [];
  let totalBytes = 0;

  for (const file of collected.files) {
    const rel = path.relative(root, file);
    const ext = path.extname(file).toLowerCase();
    let info;
    try {
      info = await stat(file);
    } catch (err) {
      collected.errors.push({ path: rel, error: `unreadable file: ${err.code ?? err.message}` });
      continue;
    }
    let checksum;
    try {
      checksum = await sha256(file);
    } catch (err) {
      collected.errors.push({ path: rel, error: `checksum failed: ${err.code ?? err.message}` });
      continue;
    }
    totalBytes += info.size;

    const row = {
      path: rel.split(path.sep).join('/'),
      bytes: info.size,
      extension: ext || null,
      sha256: checksum,
    };

    const media = tools.sips || tools.ffprobe ? probe(file, ext, tools) : null;
    if (media) row.media = media;

    entries.push(row);
  }

  const manifest = {
    manifestVersion: MANIFEST_VERSION,
    root: path.basename(root),
    fileCount: entries.length,
    totalBytes,
    probes: {
      requested: opts.probe,
      available: Object.entries(tools)
        .filter(([, present]) => present)
        .map(([name]) => name),
      probedCount: entries.filter((e) => e.media).length,
    },
    files: entries,
    errors: collected.errors,
  };

  const json = JSON.stringify(manifest, null, 2) + '\n';
  if (opts.out) {
    await writeFile(opts.out, json, 'utf8');
    process.stderr.write(`Wrote ${opts.out} (${manifest.fileCount} files, ${manifest.errors.length} errors)\n`);
  } else {
    process.stdout.write(json);
  }
  process.exit(manifest.errors.length > 0 ? 3 : 0);
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
