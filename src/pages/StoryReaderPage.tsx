import { Link, useParams } from 'react-router';
import AudioPlayer from '../components/AudioPlayer';
import Icon from '../components/Icon';
import LevelBadge from '../components/LevelBadge';
import SentenceText from '../components/SentenceText';
import { getStoryById } from '../content/stories';
import { groupIntoParagraphs } from '../domain/story';
import styles from './StoryReaderPage.module.css';

export default function StoryReaderPage() {
  // ":storyId" in the route "/story/:storyId" arrives here as a string (or undefined).
  const { storyId } = useParams();
  const story = storyId === undefined ? undefined : getStoryById(storyId);

  if (story === undefined) {
    return (
      <div className={styles.page}>
        <h1 className={styles.notFoundTitle}>História não encontrada</h1>
        <Link to="/" className={styles.back}>
          <Icon name="back" size={18} />
          Voltar à lista
        </Link>
      </div>
    );
  }

  const paragraphs = groupIntoParagraphs(story.sentences);

  return (
    <article className={styles.page}>
      <Link to="/" className={styles.back}>
        <Icon name="back" size={18} />
        Histórias
      </Link>
      <header className={styles.head}>
        <div className={styles.badgeRow}>
          <LevelBadge level={story.level} showName />
        </div>
        <h1 className={styles.title}>{story.title}</h1>
        <p className={styles.subtitle}>{story.titlePt}</p>
        <p className={styles.meta}>{story.sentences.length} frases</p>
      </header>
      {/* The key makes the player start from a clean state whenever the story changes. */}
      {story.audioUrl !== null && <AudioPlayer key={story.id} url={story.audioUrl} />}
      <p className={styles.hint}>
        Toque em uma frase para ver a tradução. Toque de novo para esconder.
      </p>
      {/* lang="en" tells screen readers and browsers this text is English. */}
      <div lang="en" className={styles.copy}>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>
            {paragraph.map((sentence) => (
              <SentenceText key={sentence.id} sentence={sentence} />
            ))}
          </p>
        ))}
      </div>
    </article>
  );
}