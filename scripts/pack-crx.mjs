import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const packageJson = await import(resolve(root, 'package.json'), {
  with: { type: 'json' },
});

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'google-chrome',
  'chromium',
  'chromium-browser',
].filter(Boolean);

const chromeBin = chromeCandidates.find((candidate) => {
  if (candidate.includes('/')) return existsSync(candidate);
  const result = spawnSync('which', [candidate], { encoding: 'utf8' });
  return result.status === 0;
});

if (!chromeBin) {
  console.error('Could not find Chrome/Chromium. Set CHROME_BIN to the browser executable path.');
  process.exit(1);
}

const outDir = resolve(root, '.output');
const extensionDir = join(outDir, 'chrome-mv3');
const keyPath = resolve(root, process.env.CRX_KEY_PATH ?? join('.output', 'crx-key.pem'));

if (!existsSync(join(extensionDir, 'manifest.json'))) {
  console.error('Missing .output/chrome-mv3/manifest.json. Run `pnpm build` before packing CRX.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const args = [`--pack-extension=${extensionDir}`];
if (existsSync(keyPath)) {
  args.push(`--pack-extension-key=${keyPath}`);
}

const result = spawnSync(chromeBin, args, {
  encoding: 'utf8',
  stdio: 'pipe',
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.stderr.write(result.stdout);
  process.exit(result.status ?? 1);
}

const generatedCrx = `${extensionDir}.crx`;
const generatedPem = `${extensionDir}.pem`;
const artifactName = `${packageJson.default.name}-${packageJson.default.version}-chrome.crx`;
const artifactPath = join(outDir, artifactName);

if (existsSync(artifactPath)) rmSync(artifactPath);
renameSync(generatedCrx, artifactPath);

if (!existsSync(keyPath) && existsSync(generatedPem)) {
  renameSync(generatedPem, keyPath);
}

console.log(`Packed ${basename(artifactPath)}`);
console.log(`CRX key: ${keyPath}`);
