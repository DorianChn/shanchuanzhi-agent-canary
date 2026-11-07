import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corePackagePath = path.join(packageRoot, 'node_modules', '@cline', 'core', 'package.json');
const coreBundlePath = path.join(packageRoot, 'node_modules', '@cline', 'core', 'dist', 'index.js');

if (!fs.existsSync(corePackagePath) || !fs.existsSync(coreBundlePath)) {
  throw new Error('Cline Core 0.2.0 is required before applying the simple-git compatibility patch.');
}

const corePackage = JSON.parse(fs.readFileSync(corePackagePath, 'utf8'));
if (corePackage.version !== '0.2.0') {
  throw new Error(`Unsupported @cline/core version ${corePackage.version}; review its simple-git import before updating this patch.`);
}

const source = fs.readFileSync(coreBundlePath, 'utf8');
const legacyImport = /import\s+([\w$]+)\s+from\s*["']simple-git["'];/g;
const currentImport = /import\s*\{\s*simpleGit\s+as\s+([\w$]+)\s*\}\s*from\s*["']simple-git["'];/;

if (currentImport.test(source)) process.exit(0);

const matches = [...source.matchAll(legacyImport)];
if (matches.length !== 1) {
  throw new Error(`Expected one legacy simple-git default import in @cline/core, found ${matches.length}.`);
}

const [, localName] = matches[0];
const replacement = source.replace(legacyImport, `import { simpleGit as ${localName} } from"simple-git";`);
if (replacement === source) {
  throw new Error('The @cline/core simple-git import could not be patched safely.');
}

fs.writeFileSync(coreBundlePath, replacement, 'utf8');
