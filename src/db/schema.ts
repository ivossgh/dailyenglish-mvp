import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

// Bump DB_VERSION when the schema changes. Add a migration case below.
const DB_NAME = 'dailyinglish';
const DB_VERSION = 1;

// A word or phrase saved by the user from a story's glossary.
export interface SavedWord {
  id: string; // = GlossaryEntry.id (stable across versions)
  term: string;
  pt: string;
  storyId: string;
  sentenceId: string;
  savedAt: number; // Unix ms
  // Review state: undefined = not yet reviewed; true = "I know it"; false = "not yet"
  reviewState?: boolean;
  reviewedAt?: number; // Unix ms
}

// Story progress — created now so version 2 does not need a schema migration.
export interface StoryProgress {
  storyId: string;
  openedAt: number; // Unix ms of the first open
  completedAt?: number; // Unix ms when "mark as read" was tapped
}

interface DailyInglishDB extends DBSchema {
  savedWords: {
    key: string; // SavedWord.id
    value: SavedWord;
    indexes: { byStory: string; bySavedAt: number };
  };
  storyProgress: {
    key: string; // StoryProgress.storyId
    value: StoryProgress;
  };
}

// A single promise that resolves to the open database. Calling openDatabase() many times
// is safe; the underlying openDB only runs once because the module is cached by the bundler.
let dbPromise: Promise<IDBPDatabase<DailyInglishDB>> | null = null;

export function openDatabase(): Promise<IDBPDatabase<DailyInglishDB>> {
  if (dbPromise === null) {
    dbPromise = openDB<DailyInglishDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Each case falls through intentionally: a v0→v1 upgrade runs all cases.
        switch (oldVersion) {
          case 0: {
            const words = db.createObjectStore('savedWords', { keyPath: 'id' });
            words.createIndex('byStory', 'storyId');
            words.createIndex('bySavedAt', 'savedAt');
            db.createObjectStore('storyProgress', { keyPath: 'storyId' });
            break;
          }
          // case 1: add new store or index here when DB_VERSION becomes 2
        }
      },
    });
  }
  return dbPromise;
}