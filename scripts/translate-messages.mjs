#!/usr/bin/env node
/**
 * translate-messages.mjs
 *
 * Translates messages/en.json into all target languages using Claude Haiku.
 * Uses prompt caching so the English JSON is only sent at full cost once —
 * every subsequent language call reads from cache at ~10% cost.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/translate-messages.mjs
 *
 * Outputs: messages/th.json, messages/zh.json, messages/es.json,
 *          messages/hi.json, messages/id.json, messages/pt.json, messages/fr.json
 */

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANGUAGES = [
  { locale: 'th', name: 'Thai',               native: 'ภาษาไทย' },
  { locale: 'zh', name: 'Simplified Chinese', native: '简体中文' },
  { locale: 'es', name: 'Spanish',            native: 'Español' },
  { locale: 'hi', name: 'Hindi',              native: 'हिंदी' },
  { locale: 'id', name: 'Indonesian',         native: 'Bahasa Indonesia' },
  { locale: 'pt', name: 'Portuguese',         native: 'Português' },
  { locale: 'fr', name: 'French',             native: 'Français' },
];

// Terms that must stay in English regardless of target language
const KEEP_IN_ENGLISH = [
  'credits', 'tokens', 'transcript', 'Whisper', 'Stripe', 'Eidolon',
  'Google', 'Auth0', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4',
  'T1', 'T2', 'T3', 'T4', 'VAD', 'API', 'MP3', 'WAV', 'M4A',
  'Turbo', 'Premium', 'MCQ', 'T/F',
];

async function translateLanguage(enJson, targetLang, isFirst) {
  const enString = JSON.stringify(enJson, null, 2);

  const systemContent = [
    {
      type: 'text',
      text: `You are a professional UI translator for Eidolon — an AI-powered academic lecture notes app for university students.

TASK: Translate ALL string values in the provided JSON object to ${targetLang.name} (${targetLang.native}).

RULES:
1. Keep ALL JSON keys unchanged (keys are in English, values get translated)
2. Keep these terms in English: ${KEEP_IN_ENGLISH.join(', ')}
3. Keep UI patterns like "~13 notes", "$1.50", "50%", numbers, currencies unchanged
4. Keep ellipsis "…", em dash "—", and punctuation style natural for ${targetLang.name}
5. Make translations feel native and natural — NOT word-for-word literal
6. For academic/student context: use the most natural register for university students in ${targetLang.name}-speaking countries
7. Preserve nested JSON structure exactly
8. Return ONLY valid JSON — no markdown, no explanation, no code fences

English source JSON to translate:
${enString}`,
      cache_control: { type: 'ephemeral' }, // cached after first call
    },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 16000,
    system: systemContent,
    messages: [
      {
        role: 'user',
        content: `Translate all values to ${targetLang.name} (locale: ${targetLang.locale}). Return only the translated JSON object.`,
      },
    ],
  });

  if (response.stop_reason === 'max_tokens') {
    throw new Error('Output was truncated (hit max_tokens). Increase max_tokens further.');
  }

  const text = response.content.find(b => b.type === 'text')?.text ?? '';

  // Report cache usage
  const u = response.usage;
  console.log(
    `  cache_write=${u.cache_creation_input_tokens ?? 0}  ` +
    `cache_read=${u.cache_read_input_tokens ?? 0}  ` +
    `uncached=${u.input_tokens}  output=${u.output_tokens}`
  );

  // Extract JSON object, then let jsonrepair fix any malformed output
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  const extracted = text.slice(start, end + 1);
  const repaired  = jsonrepair(extracted);

  return JSON.parse(repaired);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const enPath = path.join(MESSAGES_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error(`Error: ${enPath} not found. Create messages/en.json first.`);
    process.exit(1);
  }

  const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  console.log(`Loaded ${Object.keys(enJson).length} sections from en.json\n`);

  // Allow --locale zh to retry a single language
  const localeIdx = process.argv.indexOf('--locale');
  const localeArg = process.argv.find(a => a.startsWith('--locale='))?.split('=')[1]
                 ?? (localeIdx !== -1 ? process.argv[localeIdx + 1] : undefined);

  const targets = localeArg
    ? LANGUAGES.filter(l => l.locale === localeArg)
    : LANGUAGES;

  if (localeArg && targets.length === 0) {
    console.error(`Unknown locale: ${localeArg}. Valid: ${LANGUAGES.map(l => l.locale).join(', ')}`);
    process.exit(1);
  }

  for (let i = 0; i < targets.length; i++) {
    const lang = targets[i];
    const outPath = path.join(MESSAGES_DIR, `${lang.locale}.json`);

    console.log(`[${i + 1}/${targets.length}] Translating to ${lang.name} (${lang.locale})…`);

    let translated = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        translated = await translateLanguage(enJson, lang, i === 0 && attempt === 1);
        break;
      } catch (err) {
        if (attempt === 1) {
          console.warn(`  ⚠ Attempt 1 failed (${err.message}) — retrying…`);
        } else {
          console.error(`  ✗ Failed for ${lang.name}:`, err.message);
        }
      }
    }
    if (translated) {
      fs.writeFileSync(outPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');
      console.log(`  ✓ Saved to messages/${lang.locale}.json\n`);
    }

    if (i < targets.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  console.log('Done.');
}

main();
