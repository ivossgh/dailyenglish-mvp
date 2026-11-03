import { LEVEL_NAMES } from '../domain/story';
import type { Level } from '../domain/story';
import styles from './LevelBadge.module.css';

interface LevelBadgeProps {
  level: Level;
  showName?: boolean; // true: "A1 · Iniciante"; false: just "A1"
}

// Small colored pill showing the level of a story (A1, A2, B1).
// data-level makes the global rule in tokens.css provide the colors.
export default function LevelBadge({ level, showName = false }: LevelBadgeProps) {
  return (
    <span className={styles.badge} data-level={level}>
      {showName ? `${level} · ${LEVEL_NAMES[level]}` : level}
    </span>
  );
}