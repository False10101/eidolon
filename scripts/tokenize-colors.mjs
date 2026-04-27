#!/usr/bin/env node
/**
 * tokenize-colors.mjs
 *
 * Replaces hardcoded color values across all src/app and src/lib JS files
 * with CSS variable references, enabling the light/dark theme system.
 *
 * Run once: node scripts/tokenize-colors.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT  = path.join(__dirname, '..', 'src');

// ─── Token map ─────────────────────────────────────────────────────────────────
// Maps a hex value to a CSS variable name.
// The script applies these per Tailwind property prefix, so the same color
// can map to different tokens when used as bg- vs text- vs stroke-.
const DEFAULT_TOKEN = {
  '#111116': '--surface',
  '#18181f': '--surface-raised',
  '#1e1e27': '--surface-deep',
  '#2a2a35': '--scrollbar',
  '#3a3a48': '--scrollbar-hover',
  '#e8e8ed': '--fg',
  '#b4b4c2': '--fg-2',
  '#9a9aaa': '--fg-3',
  '#9898a8': '--fg-3',   // old alias, same semantic
  '#7a7a8a': '--fg-4',
  '#6b6b7a': '--fg-4',   // old alias, same semantic
  '#b0b0bc': '--fg-body',
  '#00d4c8': '--accent',
  '#00bfb3': '--accent-hover',
  '#00a89f': '--accent-muted',
};

// #0c0c0e is ambiguous: it is the main background AND the text colour on
// teal buttons. Handle it separately based on the Tailwind prefix used.
const SPECIAL_0C = {
  bg:          '--bg',
  default:     '--on-accent',  // text / stroke / fill on accent buttons
};

// ─── Border/bg white-opacity class patterns ────────────────────────────────────
// border-white/[0.07] etc. must flip to dark equivalents in light mode.
// Map the full Tailwind class string to its variable form.
const WHITE_OPACITY = {
  // borders
  'border-white/[0.04]':  'border-[var(--border-faint)]',
  'border-white/[0.05]':  'border-[var(--border-faint)]',
  'border-white/[0.06]':  'border-[var(--border)]',
  'border-white/[0.07]':  'border-[var(--border)]',
  'border-white/[0.08]':  'border-[var(--border)]',
  'border-white/[0.09]':  'border-[var(--border-strong)]',
  'border-white/[0.1]':   'border-[var(--border-strong)]',
  'border-white/[0.10]':  'border-[var(--border-strong)]',
  'border-white/[0.12]':  'border-[var(--border-strong)]',
  'border-white/[0.14]':  'border-[var(--border-hover)]',
  'border-white/[0.15]':  'border-[var(--border-hover)]',
  // dividers
  'divide-white/[0.05]':  'divide-[var(--border-faint)]',
  'divide-white/[0.07]':  'divide-[var(--border)]',
  // hover / tint backgrounds
  'bg-white/[0.01]':      'bg-[var(--surface-tint-faint)]',
  'bg-white/[0.015]':     'bg-[var(--surface-tint-faint)]',
  'bg-white/[0.02]':      'bg-[var(--surface-tint-faint)]',
  'bg-white/[0.025]':     'bg-[var(--surface-tint-faint)]',
  'bg-white/[0.03]':      'bg-[var(--surface-hover)]',
  'bg-white/[0.04]':      'bg-[var(--surface-tint)]',
  'bg-white/[0.05]':      'bg-[var(--surface-tint)]',
  'bg-white/[0.06]':      'bg-[var(--surface-tint)]',
  'bg-white/[0.07]':      'bg-[var(--surface-tint)]',
};

// Tailwind prefixes that take a colour value and should be tokenized
const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'stroke', 'fill', 'from', 'to', 'via',
  'placeholder', 'ring', 'shadow', 'outline', 'caret', 'decoration',
  'accent',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenForHex(hex, prefix) {
  const h = hex.toLowerCase();
  if (h === '#0c0c0e') {
    return prefix === 'bg' ? SPECIAL_0C.bg : SPECIAL_0C.default;
  }
  return DEFAULT_TOKEN[h] ?? null;
}

function processFile(content) {
  let out = content;

  // 1. Replace white-opacity Tailwind patterns (longest first to avoid partial matches)
  const whiteKeys = Object.keys(WHITE_OPACITY).sort((a, b) => b.length - a.length);
  for (const cls of whiteKeys) {
    const escaped = escapeRegex(cls);
    // Match as a whole class token (preceded by space, quote, backtick, or { )
    out = out.replace(new RegExp(`(?<=[\\s"'\`{:])${escaped}(?=[\\s"'\`}:)])`, 'g'), WHITE_OPACITY[cls]);
    // Also handle it at the very start of a string or after = sign
    out = out.replace(new RegExp(`${escaped}`, 'g'), WHITE_OPACITY[cls]);
  }

  // 2. Replace Tailwind arbitrary hex colour classes: prefix-[#xxxxxx]
  // Handles both 3-char and 6-char hex
  const hexPattern = /([a-z-]+)-\[(#[0-9a-fA-F]{3,6})\]/g;
  out = out.replace(hexPattern, (match, prefix, hex) => {
    if (!COLOR_PREFIXES.includes(prefix)) return match;
    const token = tokenForHex(hex, prefix);
    if (!token) return match;
    return `${prefix}-[var(${token})]`;
  });

  // 3. Replace inline style hex strings  (color: '#e8e8ed' or color: "#e8e8ed")
  const inlineHexPattern = /:\s*['"]?(#[0-9a-fA-F]{6})['"]?/g;
  out = out.replace(inlineHexPattern, (match, hex) => {
    // Preserve the quote style and spacing around the colon
    const token = tokenForHex(hex, 'inline');
    if (!token) return match;
    // Detect quote style
    const hasQuote = match.includes("'") || match.includes('"');
    const quote = match.includes("'") ? "'" : '"';
    const spacing = match.match(/^:\s*/)[0];
    return hasQuote ? `${spacing}${quote}var(${token})${quote}` : `${spacing}var(${token})`;
  });

  return out;
}

// ─── File walker ───────────────────────────────────────────────────────────────
function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) walk(full, results);
    } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
const files = walk(SRC_ROOT);
let changed = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const updated  = processFile(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log(`✓  ${path.relative(SRC_ROOT, file)}`);
    changed++;
  }
}

console.log(`\nDone — ${changed} file(s) updated.`);
