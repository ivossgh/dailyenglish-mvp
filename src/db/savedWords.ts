import { openDatabase } from './schema';
import type { SavedWord } from './schema';

// All reads and writes to the savedWords store go through these functions.
// They are thin wrappers that open the database and call the idb methods.
// If the database is unavailable (e.g. private browsing with storage blocked),
// the function throws, and the caller should handle the error gracefully.

export async function getSavedWord(id: string): Promise<SavedWord | undefined> {
  const db = await openDatabase();
  return db.get('savedWords', id);
}

export async function getAllSavedWords(): Promise<SavedWord[]> {
  const db = await openDatabase();
  return db.getAllFromIndex('savedWords', 'bySavedAt');
}

export async function saveWord(word: Omit<SavedWord, 'savedAt' | 'reviewState' | 'reviewedAt'>): Promise<void> {
  const db = await openDatabase();
  const existing = await db.get('savedWords', word.id);
  if (existing !== undefined) {
    return; // already saved; do not overwrite the review state
  }
  await db.put('savedWords', { ...word, savedAt: Date.now() });
}

export async function removeWord(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('savedWords', id);
}

export async function setReviewState(id: string, knows: boolean): Promise<void> {
  const db = await openDatabase();
  const word = await db.get('savedWords', id);
  if (word === undefined) return;
  await db.put('savedWords', { ...word, reviewState: knows, reviewedAt: Date.now() });
}

export async function countSavedWords(): Promise<number> {
  const db = await openDatabase();
  return db.count('savedWords');
}

// ---- backup ----

export interface WordsBackup {
  version: 1;
  exportedAt: string; // ISO 8601
  words: SavedWord[];
}

export async function exportBackup(): Promise<string> {
  const words = await getAllSavedWords();
  const backup: WordsBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    words,
  };
  return JSON.stringify(backup, null, 2);
}

// Returns the number of words imported (skips duplicates).
export async function importBackup(json: string): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { version?: unknown }).version !== 1 ||
    !Array.isArray((parsed as { words?: unknown }).words)
  ) {
    throw new Error('O arquivo não é um backup válido do DailyInglish (versão 1).');
  }

  const backup = parsed as WordsBackup;
  const db = await openDatabase();
  let imported = 0;

  for (const word of backup.words) {
    // Basic validation: skip malformed entries rather than breaking the whole import.
    if (
      typeof word.id !== 'string' ||
      typeof word.term !== 'string' ||
      typeof word.pt !== 'string' ||
      typeof word.storyId !== 'string' ||
      typeof word.sentenceId !== 'string' ||
      typeof word.savedAt !== 'number'
    ) {
      continue;
    }
    const existing = await db.get('savedWords', word.id);
    if (existing === undefined) {
      await db.put('savedWords', word);
      imported += 1;
    }
  }

  return imported;
}