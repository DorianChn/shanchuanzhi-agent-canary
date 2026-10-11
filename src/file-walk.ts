import fs from "node:fs";
import path from "node:path";

const MAX_DEPTH = 4;

/** Enumerate regular files without following symlinks, including dotfiles. */
export function* walkFiles(directory: string, depth = 0): Generator<string> {
  if (depth > MAX_DEPTH) {
    throw new Error(`Could not enumerate ${JSON.stringify(directory)}: maximum scan depth ${MAX_DEPTH} exceeded; the scan is incomplete.`);
  }

  try {
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return;
    throw new Error(`Could not inspect ${JSON.stringify(directory)}; the scan is incomplete.`, { cause: error });
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return;
    throw new Error(`Could not enumerate ${JSON.stringify(directory)}; the scan is incomplete.`, { cause: error });
  }

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.isSymbolicLink()) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walkFiles(filePath, depth + 1);
    else if (entry.isFile()) yield filePath;
  }
}
