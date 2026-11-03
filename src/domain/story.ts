// Domain types for story content.
// Think of these as Java records/DTOs: they describe the shape of the JSON files.

// `as const` makes this list immutable and lets TypeScript derive the Level type from it
// (similar to a Java enum).
export const LEVELS = ['A1', 'A2', 'B1'] as const;
export type Level = (typeof LEVELS)[number];
// Display names shown next to the level code in the UI.
export const LEVEL_NAMES: Record<Level, string> = {
  A1: 'Iniciante',
  A2: 'Básico',
  B1: 'Intermediário',
};

// A word or phrase worth saving, with its Portuguese translation.
// `term` must appear in the English sentence (validated when loading).
export interface GlossaryEntry {
  id: string; // stable, e.g. "story-0001-s002-w01"
  term: string;
  pt: string;
}

export interface Sentence {
  id: string; // stable, e.g. "story-0001-s002"
  paragraph: number; // 1-based paragraph this sentence belongs to
  en: string;
  pt: string;
  glossary: GlossaryEntry[]; // may be empty
}

export interface Story {
  schemaVersion: 1; // bump when the JSON shape changes
  id: string; // stable and opaque, e.g. "story-0001"; never encodes the level
  title: string;
  titlePt: string;
  level: Level;
  audioUrl: string | null; // null until the audio file exists (step 4)
  sentences: Sentence[]; // array order is the reading order
}

// Groups the flat sentence list into paragraphs, using each sentence's `paragraph` number.
// The loader guarantees paragraph numbers start at 1 and never skip.
export function groupIntoParagraphs(sentences: readonly Sentence[]): Sentence[][] {
  const paragraphs: Sentence[][] = [];
  for (const sentence of sentences) {
    const index = sentence.paragraph - 1;
    const current = paragraphs[index];
    if (current === undefined) {
      paragraphs[index] = [sentence];
    } else {
      current.push(sentence);
    }
  }
  return paragraphs;
}