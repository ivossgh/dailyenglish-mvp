import { useSearchParams } from 'react-router';
import LevelFilter from '../components/LevelFilter';
import LibraryHero from '../components/LibraryHero';
import Lory from '../components/Lory';
import StoryCard from '../components/StoryCard';
import { allStories } from '../content/stories';
import { LEVELS } from '../domain/story';
import type { Level } from '../domain/story';
import styles from './StoryListPage.module.css';

// Reads the "level" value from the URL; anything invalid means "all levels".
function parseLevel(value: string | null): Level | null {
  return LEVELS.find((level) => level === value) ?? null;
}

export default function StoryListPage() {
  // The selected level lives in the URL (#/?level=A2), so the back button keeps the filter.
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = parseLevel(searchParams.get('level'));

  const visibleStories =
    selected === null ? allStories : allStories.filter((story) => story.level === selected);

  function handleLevelChange(level: Level | null) {
    // `replace` swaps the current history entry instead of adding a new one.
    setSearchParams(level === null ? {} : { level }, { replace: true });
  }

  return (
    <>
      <LibraryHero />
      <LevelFilter selected={selected} onChange={handleLevelChange} />
      {visibleStories.length === 0 ? (
        <div className={styles.empty}>
          <Lory />
          <h2>Nenhuma história por aqui ainda</h2>
          <p>Escolha outro nível ou volte para “Todos”.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {visibleStories.map((story) => (
            <li key={story.id}>
              <StoryCard story={story} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}