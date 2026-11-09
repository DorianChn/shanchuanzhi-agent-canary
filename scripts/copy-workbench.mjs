import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'docs');
const outputRoot = path.join(root, 'dist', 'ai', 'workbench');
const files = [
  'index.html',
  'workbench.css',
  'verification.css',
  'evidence-snapshot.js',
  'evidence-verifier.js',
  'workbench.js',
  'verification.js',
];

fs.mkdirSync(outputRoot, { recursive: true });
for (const name of files) {
  const source = path.join(sourceRoot, name);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`WORKBENCH_SOURCE_INVALID:${name}`);
  fs.copyFileSync(source, path.join(outputRoot, name), fs.constants.COPYFILE_FICLONE);
}
console.log(`Copied ${files.length} static workbench assets into dist/ai/workbench.`);
