#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "README.md",
  "README.zh-CN.md",
  "GETTING_STARTED.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "COMPATIBILITY.md",
  "SECURITY_TESTING.md",
  "E4_EVIDENCE_INDEX.md",
  "USER_TEST_PLAN.md",
  "RELEASE_NOTES_DRAFT.md",
  "UPGRADING.md",
  "THIRD_PARTY_NOTICES.md",
  ".github/pull_request_template.md",
];
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const errors = [];
let checkedLinks = 0;
let checkedExamples = 0;

function headings(markdown) {
  const ids = new Set();
  const counts = new Map();
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = match[1].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    ids.add(count === 0 ? base : base + "-" + count);
  }
  return ids;
}

function insideRoot(target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

for (const relativeFile of files) {
  const absoluteFile = path.join(root, relativeFile);
  if (!fs.existsSync(absoluteFile)) {
    errors.push(relativeFile + ": required documentation file is missing");
    continue;
  }

  const markdown = fs.readFileSync(absoluteFile, "utf8");
  const localHeadings = headings(markdown);

  for (const match of markdown.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\)/g)) {
    let target = (match[1] ?? match[2] ?? "").trim();
    if (/^(https?:|mailto:|tel:|data:|\/\/)/i.test(target)) continue;
    checkedLinks += 1;

    const hashIndex = target.indexOf("#");
    const fragment = hashIndex >= 0 ? decodeURIComponent(target.slice(hashIndex + 1)) : "";
    let linkPath = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
    const queryIndex = linkPath.indexOf("?");
    if (queryIndex >= 0) linkPath = linkPath.slice(0, queryIndex);
    try {
      linkPath = decodeURIComponent(linkPath);
    } catch {
      errors.push(relativeFile + ": invalid URL encoding in link " + target);
      continue;
    }

    const resolved = path.resolve(path.dirname(absoluteFile), linkPath || ".");
    if (!insideRoot(resolved)) {
      errors.push(relativeFile + ": link escapes repository: " + target);
      continue;
    }
    let linkedFile = resolved;
    if (fs.existsSync(linkedFile) && fs.statSync(linkedFile).isDirectory()) {
      const candidates = ["README.md", "index.md", "index.html"].map((name) => path.join(linkedFile, name));
      linkedFile = candidates.find((candidate) => fs.existsSync(candidate)) ?? linkedFile;
    }
    if (!fs.existsSync(linkedFile) || !fs.statSync(linkedFile).isFile()) {
      errors.push(relativeFile + ": missing local link target " + target);
      continue;
    }

    if (fragment) {
      const linkedText = path.extname(linkedFile).toLowerCase() === ".md" ? fs.readFileSync(linkedFile, "utf8") : "";
      const ids = linkedFile === absoluteFile ? localHeadings : headings(linkedText);
      if (linkedText && !ids.has(fragment.toLowerCase())) {
        errors.push(relativeFile + ": missing heading anchor " + target);
      } else if (!linkedText && linkedFile !== absoluteFile) {
        errors.push(relativeFile + ": cannot verify anchor on non-Markdown target " + target);
      }
    }
  }

  for (const block of markdown.matchAll(/~~~([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)\n~~~/g)) {
    const language = block[1].toLowerCase();
    const code = block[2];
    if (language === "toml") {
      try {
        parseToml(code);
        checkedExamples += 1;
      } catch (error) {
        errors.push(relativeFile + ": invalid TOML example: " + error.message);
      }
    }
    if (language === "json") {
      try {
        JSON.parse(code);
        checkedExamples += 1;
      } catch (error) {
        errors.push(relativeFile + ": invalid JSON example: " + error.message);
      }
    }
    if (["sh", "bash", "shell"].includes(language)) {
      for (const command of code.matchAll(/\bnpm\s+run\s+([a-zA-Z0-9:_-]+)/g)) {
        if (!Object.hasOwn(packageJson.scripts ?? {}, command[1])) {
          errors.push(relativeFile + ": npm run script does not exist: " + command[1]);
        } else {
          checkedExamples += 1;
        }
      }
      for (const line of code.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("node ")) continue;
        const tokens = trimmed.split(/\s+/).slice(1);
        const script = tokens.find((token) => /\.(?:mjs|cjs|js|ts)$/.test(token) && !token.startsWith("--"));
        if (!script || script.startsWith("/absolute/")) continue;
        const target = path.resolve(root, script);
        if (script.startsWith("dist/")) {
          if (!fs.existsSync(target)) errors.push(relativeFile + ": build output referenced by example is missing: " + script);
          else checkedExamples += 1;
        } else if (!fs.existsSync(target)) {
          errors.push(relativeFile + ": script referenced by example is missing: " + script);
        } else {
          checkedExamples += 1;
        }
      }
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error("FAIL " + error);
  console.error("Documentation check failed with " + errors.length + " problem(s).");
  process.exitCode = 1;
} else {
  console.log("Documentation check passed: " + files.length + " files, " + checkedLinks + " local links, " + checkedExamples + " code examples.");
}
