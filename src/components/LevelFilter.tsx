import { LEVELS, LEVEL_NAMES } from '../domain/story';
import type { Level } from '../domain/story';
import styles from './LevelFilter.module.css';

interface LevelFilterProps {
  selected: Level | null; // null means "all levels"
  onChange: (level: Level | null) => void;
}

// Row of buttons: All, A1, A2, B1. The selected one is highlighted.
// On wide screens each level also shows its name (e.g. "A1 Iniciante").
export default function LevelFilter({ selected, onChange }: LevelFilterProps) {
  const options: (Level | null)[] = [null, ...LEVELS];

  return (
    <div className={styles.group} role="group" aria-label="Filtrar por nível">
      {options.map((level) => (
        <button
          key={level ?? 'all'}
          type="button"
          className={styles.button}
          aria-pressed={selected === level}
          onClick={() => onChange(level)}
        >
          {level ?? 'Todos'}
          {level !== null && <small className={styles.levelName}>{LEVEL_NAMES[level]}</small>}
        </button>
      ))}
    </div>
  );
}