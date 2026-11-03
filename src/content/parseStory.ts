import { LEVELS } from '../domain/story';
import type { GlossaryEntry, Level, Sentence, Story } from '../domain/story';

// Runtime validation of story JSON files.
// TypeScript types disappear at runtime, so JSON read from files is checked by hand.
// Any error is thrown with the file name, so a content typo is easy to find.

type JsonObject = Record<string, unknown>;

function fail(source: string, message: string): never {
  throw new Error(`Invalid story file "${source}": ${message}`);
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(obj: JsonObject, key: string, source: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.trim() === '') {
    fail(source, `"${key}" must be a non-empty string`);
  }
  return value;
}

function readArray(obj: JsonObject, key: string, source: string): unknown[] {
  const value = obj[key];
  if (!Array.isArray(value)) {
    fail(source, `"${key}" must be an array`);
  }
  return value;
}

function readParagraph(obj: JsonObject, source: string): number {
  const value = obj['paragraph'];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    fail(source, '"paragraph" must be an integer >= 1');
  }
  return value;
}

function readLevel(obj: JsonObject, source: string): Level {
  const value = readString(obj, 'level', source);
  const level = LEVELS.find((candidate) => candidate === value);
  if (level === undefined) {
    fail(source, `"level" must be one of ${LEVELS.join(', ')} (got "${value}")`);
  }
  return level;
}

function readAudioUrl(obj: JsonObject, source: string): string | null {
  const value = obj['audioUrl'];
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string' || !value.startsWith('/')) {
    fail(source, '"audioUrl" must be null or a path starting with "/"');
  }
  return value;
}

// Every id inside one story file must be unique.
function claimId(id: string, seenIds: Set<string>, source: string): void {
  if (seenIds.has(id)) {
    fail(source, `duplicate id "${id}"`);
  }
  seenIds.add(id);
}

function parseGlossaryEntry(
  raw: unknown,
  sentence: { id: string; en: string },
  seenIds: Set<string>,
  source: string,
): GlossaryEntry {
  if (!isObject(raw)) {
    fail(source, `a glossary entry of "${sentence.id}" must be an object`);
  }
  const id = readString(raw, 'id', source);
  if (!id.startsWith(`${sentence.id}-w`)) {
    fail(source, `glossary id "${id}" must start with "${sentence.id}-w"`);
  }
  claimId(id, seenIds, source);

  const term = readString(raw, 'term', source);
  if (!sentence.en.toLowerCase().includes(term.toLowerCase())) {
    fail(source, `glossary term "${term}" does not appear in sentence "${sentence.id}"`);
  }

  const pt = readString(raw, 'pt', source);
  return { id, term, pt };
}

function parseSentence(
  raw: unknown,
  storyId: string,
  seenIds: Set<string>,
  source: string,
): Sentence {
  if (!isObject(raw)) {
    fail(source, 'every sentence must be an object');
  }
  const id = readString(raw, 'id', source);
  if (!id.startsWith(`${storyId}-s`)) {
    fail(source, `sentence id "${id}" must start with "${storyId}-s"`);
  }
  claimId(id, seenIds, source);

  const paragraph = readParagraph(raw, source);
  const en = readString(raw, 'en', source);
  const pt = readString(raw, 'pt', source);
  const glossary = readArray(raw, 'glossary', source).map((entry) =>
    parseGlossaryEntry(entry, { id, en }, seenIds, source),
  );
  return { id, paragraph, en, pt, glossary };
}

export function parseStory(raw: unknown, source: string): Story {
  if (!isObject(raw)) {
    fail(source, 'the file must contain a JSON object');
  }
  if (raw['schemaVersion'] !== 1) {
    fail(source, '"schemaVersion" must be 1');
  }

  const id = readString(raw, 'id', source);
  const seenIds = new Set<string>();
  claimId(id, seenIds, source);

  const rawSentences = readArray(raw, 'sentences', source);
  if (rawSentences.length === 0) {
    fail(source, '"sentences" must not be empty');
  }
  const sentences = rawSentences.map((sentence) => parseSentence(sentence, id, seenIds, source));

  // Paragraph numbers must start at 1 and either repeat or grow by exactly 1: 1,1,2,2,2,3...
  let previousParagraph = 0;
  for (const sentence of sentences) {
    if (
      sentence.paragraph !== previousParagraph &&
      sentence.paragraph !== previousParagraph + 1
    ) {
      fail(
        source,
        `paragraph of "${sentence.id}" must repeat the previous one or add 1 (starting at 1)`,
      );
    }
    previousParagraph = sentence.paragraph;
  }

  return {
    schemaVersion: 1,
    id,
    title: readString(raw, 'title', source),
    titlePt: readString(raw, 'titlePt', source),
    level: readLevel(raw, source),
    audioUrl: readAudioUrl(raw, source),
    sentences,
  };
}