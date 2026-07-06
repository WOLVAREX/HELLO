/**
 * ============================================================
 *  FOXY BOT  →  FOXY BOT  —  Rename Script
 * ============================================================
 *  Run from the ROOT of your project:
 *      node rename_foxybot_to_foxybot.js
 *
 *  What it does:
 *   1. Scans every .js / .json / .md / .txt / .html file
 *      (skips node_modules, .git, bin/)
 *   2. Applies 6 replacement passes (in order, largest → smallest)
 *      to handle every casing variant found in the codebase
 *   3. Prints a detailed summary of every file changed
 *   4. DRY-RUN safe: set DRY_RUN = true below to preview without
 *      touching any file
 * ============================================================
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// ── Config ──────────────────────────────────────────────────────────────────
const DRY_RUN = false;           // Set true to preview without writing files

const ROOT = process.cwd();      // Must be run from project root

const EXTENSIONS = new Set(['.js', '.json', '.md', '.txt', '.html']);

const SKIP_DIRS = new Set(['node_modules', '.git', 'bin', '.nyc_output', 'coverage']);

// ── Replacement map (order matters — longest patterns first) ─────────────────
//
//  Source pattern           →   Replacement
//
//  FOXY BOT           →   FOXY BOT          (title in replit.md / index.js)
//  Foxy Bot           →   Foxy Bot
//  foxy bot           →   foxy bot
//
//  FOXY BOT                  →   FOXY BOT           (all-caps display name)
//  Foxy Bot                  →   Foxy Bot           (PascalCase)
//  foxybot                  →   foxybot            (lowercase identifier — used in file paths, keys, URLs)
//
//  NOTE: "foxybot" (lowercase) is deliberately kept as ONE word ("foxybot")
//  because it appears in:
//    • tmp file paths  (/tmp/foxybot_tiktok_…)
//    • local storage keys (foxybot_github_username)
//    • internal variable names
//  This avoids broken identifiers like "foxy bot_tiktok_…".
//
const REPLACEMENTS = [
  // ── Multi-word variants first ─────────────────────────────────────────────
  { from: /FOXY BOT/g,    to: 'FOXY BOT'  },
  { from: /Foxy Bot/g,    to: 'Foxy Bot'  },
  { from: /foxy bot/g,    to: 'foxy bot'  },

  // ── Single-word variants ──────────────────────────────────────────────────
  { from: /FOXY BOT/g,           to: 'FOXY BOT'  },
  { from: /Foxy Bot/g,           to: 'Foxy Bot'  },
  { from: /foxybot/g,           to: 'foxybot'   },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (stat.isFile() && EXTENSIONS.has(extname(entry).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function applyReplacements(content) {
  let result = content;
  for (const { from, to } of REPLACEMENTS) {
    result = result.replace(from, to);
  }
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🦊  FOXY BOT → FOXY BOT  rename script');
console.log('━'.repeat(52));
if (DRY_RUN) console.log('⚠️  DRY-RUN mode — no files will be modified\n');

const allFiles  = walk(ROOT);
const changed   = [];
const unchanged = [];

for (const filePath of allFiles) {
  let original;
  try {
    original = readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`  ⚠️  Could not read: ${relative(ROOT, filePath)}`);
    continue;
  }

  const updated = applyReplacements(original);

  if (updated === original) {
    unchanged.push(filePath);
    continue;
  }

  // Count how many replacements were made
  let hits = 0;
  for (const { from } of REPLACEMENTS) {
    // Reset lastIndex for global regexes
    from.lastIndex = 0;
    const matches = original.match(from);
    if (matches) hits += matches.length;
  }

  changed.push({ path: filePath, hits });

  if (!DRY_RUN) {
    writeFileSync(filePath, updated, 'utf8');
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

const totalHits = changed.reduce((sum, f) => sum + f.hits, 0);

console.log(`\n✅  Files modified : ${changed.length}`);
console.log(`   Total replacements : ${totalHits}`);
console.log(`   Files unchanged    : ${unchanged.length}\n`);

if (changed.length > 0) {
  console.log('📄  Changed files:');
  console.log('─'.repeat(52));
  for (const { path, hits } of changed) {
    console.log(`  [${String(hits).padStart(3)}x]  ${relative(ROOT, path)}`);
  }
}

console.log('\n🦊  Done!');
if (DRY_RUN) {
  console.log('    Run with DRY_RUN = false to apply changes.');
}
console.log('');