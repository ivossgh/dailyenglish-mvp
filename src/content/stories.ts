import { LEVELS } from '../domain/story';
import type { Story } from '../domain/story';
import { parseStory } from './parseStory';

// Vite feature: collects every JSON file in ./stories at build time ("classpath scanning").
// `eager: true` bundles them into the app, so no network request is needed to read them.
const rawStories = import.meta.glob<unknown>('./stories/*.json', {
  eager: true,
  import: 'default',
});

function loadStories(): Story[] {
  const stories: Story[] = [];
  const seenIds = new Set<string>();

  for (const [path, raw] of Object.entries(rawStories)) {
    const story = parseStory(raw, path);

    // The file name must match the id, so a story is always easy to find.
    if (!path.endsWith(`/${story.id}.json`)) {
      throw new Error(`Story file "${path}" must be named "${story.id}.json"`);
    }
    if (seenIds.has(story.id)) {
      throw new Error(`Duplicate story id "${story.id}"`);
    }
    seenIds.add(story.id);
    stories.push(story);
  }

  // Order: by level (A1, A2, B1), then by id.
  return stories.sort(
    (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id.localeCompare(b.id),
  );
}

export const allStories: readonly Story[] = loadStories();

export function getStoryById(id: string): Story | undefined {
  return allStories.find((story) => story.id === id);
}