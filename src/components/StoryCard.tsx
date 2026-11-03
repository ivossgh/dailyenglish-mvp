import { Link } from 'react-router';
import type { Story } from '../domain/story';
import Icon from './Icon';
import LevelBadge from './LevelBadge';
import styles from './StoryCard.module.css';

interface StoryCardProps {
  story: Story;
}

// One entry of the story list. The whole card is a link, so one tap opens the story.
export default function StoryCard({ story }: StoryCardProps) {
  return (
    <Link to={`/story/${story.id}`} className={styles.card}>
      <span className={styles.thumb} data-level={story.level} aria-hidden="true">
        <Icon name="stories" size={30} />
      </span>
      <span className={styles.info}>
        <span className={styles.metaRow}>
          <LevelBadge level={story.level} />
          <span>{story.sentences.length} frases</span>
        </span>
        <span className={styles.title}>{story.title}</span>
        <span className={styles.subtitle}>{story.titlePt}</span>
      </span>
      <span className={styles.chevron} aria-hidden="true">
        <Icon name="arrow" size={20} />
      </span>
    </Link>
  );
}