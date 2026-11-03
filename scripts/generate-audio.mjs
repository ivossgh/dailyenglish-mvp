// Generates one MP3 per story with ElevenLabs Text-to-Speech.
// Runs on YOUR computer only (never part of the app). No npm dependencies.
//
// Usage:
//   npm run audio                      -> shows the plan, the character count and your ElevenLabs plan.
//   npm run audio -- --yes             -> generates the missing/outdated audio.
//   npm run audio -- --yes --force     -> regenerates everything (needed after changing plans).
//   npm run audio -- --yes story-0001  -> only the listed stories.
//   npm run audio -- --list-voices     -> lists the voices available in your account.
//
// The API key is read from ELEVENLABS_API_KEY (in .env or .env.local). NEVER prefix it with VITE_:
// Vite copies VITE_* variables into the public JavaScript bundle.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STORIES_DIR = join(ROOT, 'src', 'content', 'stories');
const AUDIO_DIR = join(ROOT, 'public', 'audio');
const CONFIG_PATH = join(ROOT, 'scripts', 'tts.config.json');
const API_BASE = 'https://api.elevenlabs.io/v1';

// ElevenLabs documents up to 10,000 characters per request for eleven_multilingual_v2
// (other models have other limits). We stay well below it so that a failed request wastes fewer credits.
const MAX_CHARS_PER_REQUEST = 4500;

function die(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function charCount(text) {
  return [...text].length; // counts characters, not UTF-16 units
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Minimal .env parser so we don't need the 'dotenv' dependency.
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
      const line = rawLine.replace(/\r$/, '');
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '');
      }
    }
  }
}

// Safety net: refuse to run if a file with the API key could be committed by mistake.
function assertEnvFilesAreIgnored() {
  for (const file of ['.env', '.env.local']) {
    if (!existsSync(join(ROOT, file))) continue;
    try {
      execFileSync('git', ['check-ignore', '-q', file], { cwd: ROOT, stdio: 'ignore' });
    } catch (error) {
      if (error.status === 1) {
        die(`${file} holds your API key but is NOT ignored by git. Add a line "${file}" to .gitignore first.`);
      }
      // Any other error (git missing, not a repository): skip this check.
    }
  }
}

function readConfig() {
  if (!existsSync(CONFIG_PATH)) die(`missing ${CONFIG_PATH}`);
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  for (const key of ['modelId', 'voiceId', 'outputFormat']) {
    if (typeof config[key] !== 'string' || config[key] === '') {
      die(`scripts/tts.config.json: "${key}" must be a non-empty string`);
    }
  }
  return config;
}

function getApiKey() {
  loadEnv();
  assertEnvFilesAreIgnored();
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    die('ELEVENLABS_API_KEY is missing. Add it to your .env or .env.local file.');
  }
  return key;
}

// ---------- reading stories ----------
function loadStories(onlyIds) {
  const files = readdirSync(STORIES_DIR).filter((name) => name.endsWith('.json')).sort();
  const stories = [];
  for (const file of files) {
    const path = join(STORIES_DIR, file);
    const raw = readFileSync(path, 'utf8');
    const data = JSON.parse(raw);
    if (typeof data.id !== 'string' || !Array.isArray(data.sentences)) {
      die(`${file}: not a valid story file (missing "id" or "sentences")`);
    }
    if (onlyIds.length > 0 && !onlyIds.includes(data.id)) continue;
    stories.push({ file, path, raw, data });
  }
  for (const id of onlyIds) {
    if (!stories.some((story) => story.data.id === id)) {
      die(`story "${id}" not found in src/content/stories`);
    }
  }
  return stories;
}

function paragraphsOf(data) {
  const paragraphs = [];
  for (const sentence of data.sentences) {
    const index = sentence.paragraph - 1;
    if (!Number.isInteger(index) || index < 0 || typeof sentence.en !== 'string') {
      die(`${data.id}: sentence "${sentence.id}" has an invalid "paragraph" or "en"`);
    }
    if (paragraphs[index] === undefined) paragraphs[index] = [];
    paragraphs[index].push(sentence.en.trim());
  }
  return paragraphs;
}

function buildChunks(id, paragraphs) {
  const chunks = [];
  let current = '';

  function flush() {
    if (current !== '') {
      chunks.push(current);
      current = '';
    }
  }

  function append(piece, separator) {
    const candidate = current === '' ? piece : current + separator + piece;
    if (charCount(candidate) <= MAX_CHARS_PER_REQUEST) {
      current = candidate;
      return true;
    }
    return false;
  }

  for (const sentences of paragraphs) {
    const paragraphText = sentences.join(' ');
    if (append(paragraphText, '\n\n')) continue;

    flush();
    if (charCount(paragraphText) <= MAX_CHARS_PER_REQUEST) {
      current = paragraphText;
      continue;
    }

    for (const sentence of sentences) {
      if (charCount(sentence) > MAX_CHARS_PER_REQUEST) {
        die(`${id}: one sentence is > ${MAX_CHARS_PER_REQUEST} chars; split it in the JSON`);
      }
      if (!append(sentence, ' ')) {
        flush();
        current = sentence;
      }
    }
  }
  flush();
  return chunks;
}

// The hash covers the text AND every voice setting, so changing either regenerates the audio.
function contentHash(chunks, config) {
  const payload = JSON.stringify({ chunks, config });
  return createHash('sha256').update(payload).digest('hex').slice(0, 8);
}

// ---------- ElevenLabs API ----------
async function listVoices(apiKey) {
  const response = await fetch(`${API_BASE}/voices`, { headers: { 'xi-api-key': apiKey } });
  if (!response.ok) die(`Failed to list voices: ${response.status} ${await response.text()}`);

  const data = await response.json();
  const voices = data.voices.sort((a, b) => a.name.localeCompare(b.name));

  console.log('Available voices (voice_id | name | category):\n');
  for (const v of voices) {
    console.log(`${v.voice_id.padEnd(25)} | ${v.name} | ${v.category ?? ''}`);
  }
}

// Reads the plan and the credit counter. Returns null if the key cannot read it (not fatal).
async function getSubscription(apiKey) {
  try {
    const response = await fetch(`${API_BASE}/user/subscription`, { headers: { 'xi-api-key': apiKey } });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.character_count !== 'number' || typeof data.character_limit !== 'number') return null;
    return { used: data.character_count, limit: data.character_limit, tier: String(data.tier ?? 'unknown') };
  } catch {
    return null;
  }
}

function printPlan(subscription) {
  if (subscription === null) {
    console.log('Account: could not read plan/credits (the API key may lack permission). Check the dashboard.\n');
    return;
  }
  const left = subscription.limit - subscription.used;
  console.log(`Account: plan "${subscription.tier}", credits used ${subscription.used} of ${subscription.limit} (${left} left)`);
  if (subscription.tier.toLowerCase() === 'free') {
    console.log(
      '\n  WARNING: the Free plan has NO commercial license, and published audio needs an ElevenLabs credit.\n' +
        '  Use it only for private tests. Audio that testers/users will hear must be generated on a paid plan\n' +
        '  (the license depends on when the audio was generated): upgrade, then run with --yes --force.',
    );
  }
  console.log('');
}

async function synthesize(text, config, apiKey, attempt = 1) {
  const url = `${API_BASE}/text-to-speech/${config.voiceId}?output_format=${config.outputFormat}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: config.modelId,
      voice_settings: config.voiceSettings,
    }),
  });

  if (response.ok) {
    return Buffer.from(await response.arrayBuffer());
  }

  const errorText = await response.text();
  const retryable = response.status === 429 || response.status >= 500;

  if (retryable && attempt < 3) {
    const wait = attempt * 3000;
    console.log(`  API returned ${response.status}; retrying in ${wait / 1000}s...`);
    await sleep(wait);
    return synthesize(text, config, apiKey, attempt + 1);
  }

  const hint =
    response.status === 401
      ? '\nHint: check ELEVENLABS_API_KEY and its permissions; a "quota_exceeded" message means no credits left.'
      : '';
  die(`ElevenLabs API error ${response.status}:\n${errorText}${hint}`);
}

// ---------- main ----------
async function main() {
  const args = process.argv.slice(2);
  const config = readConfig();
  const apiKey = getApiKey();

  if (args.includes('--list-voices')) {
    await listVoices(apiKey);
    return;
  }

  const confirmed = args.includes('--yes');
  const force = args.includes('--force');
  const onlyIds = args.filter((arg) => arg.startsWith('story-'));
  const stories = loadStories(onlyIds);

  if (!existsSync(AUDIO_DIR)) die(`Folder not found: ${AUDIO_DIR} (run: mkdir -p public/audio)`);

  console.log(`ElevenLabs voice: ${config.voiceId}, model: ${config.modelId}, format: ${config.outputFormat}`);
  const subscription = await getSubscription(apiKey);
  printPlan(subscription);

  const jobs = [];
  let totalChars = 0;

  for (const story of stories) {
    const { id } = story.data;
    const paragraphs = paragraphsOf(story.data);
    const chunks = buildChunks(id, paragraphs);
    const hash = contentHash(chunks, config);
    const fileName = `${id}.${hash}.mp3`;
    const audioUrl = `/audio/${fileName}`;
    const upToDate = story.data.audioUrl === audioUrl && existsSync(join(AUDIO_DIR, fileName));

    const chars = chunks.reduce((sum, chunk) => sum + charCount(chunk), 0);

    if (upToDate && !force) {
      console.log(`  skip      ${id}  (up to date: ${fileName})`);
      continue;
    }

    console.log(`  generate  ${id}  ${chars} chars, ${chunks.length} request(s) -> ${fileName}`);
    totalChars += chars;
    jobs.push({ story, id, chunks, fileName, audioUrl });
  }

  console.log(`\nTo generate: ${jobs.length} story(ies), ${totalChars} characters total.`);
  console.log('The credit cost per character depends on the model; the real cost is printed after each story.');
  if (subscription !== null && totalChars > subscription.limit - subscription.used) {
    console.log(
      `WARNING: ${totalChars} characters is more than the ${subscription.limit - subscription.used} credits left. ` +
        'The run may stop with a quota error.',
    );
  }

  if (jobs.length === 0) return;
  if (!confirmed) {
    console.log('\nNothing was sent. Run again with --yes to spend credits and generate.');
    return;
  }

  let before = subscription;
  for (const job of jobs) {
    console.log(`\n${job.id}: generating...`);
    const buffers = [];

    for (let i = 0; i < job.chunks.length; i++) {
      console.log(`  request ${i + 1}/${job.chunks.length}`);
      buffers.push(await synthesize(job.chunks[i], config, apiKey));
      await sleep(1000); // polite delay between ElevenLabs requests
    }

    writeFileSync(join(AUDIO_DIR, job.fileName), Buffer.concat(buffers));

    const pattern = /("audioUrl"\s*:\s*)(null|"[^"]*")/;
    if (!pattern.test(job.story.raw)) {
      die(`${job.story.file}: could not find "audioUrl" field to update`);
    }
    const updated = job.story.raw.replace(pattern, `$1"${job.audioUrl}"`);
    writeFileSync(job.story.path, updated);

    for (const name of readdirSync(AUDIO_DIR)) {
      if (name.startsWith(`${job.id}.`) && name.endsWith('.mp3') && name !== job.fileName) {
        unlinkSync(join(AUDIO_DIR, name));
        console.log(`  removed old file ${name}`);
      }
    }
    console.log(`  done: ${job.audioUrl}`);

    const after = await getSubscription(apiKey);
    if (before !== null && after !== null) {
      console.log(`  credits used by this story: ${after.used - before.used} (counter: ${after.used}/${after.limit})`);
    }
    before = after;
  }
  console.log('\nFinished. Listen to the files in public/audio before committing.');
}

main().catch((error) => die(error instanceof Error ? error.message : String(error)));