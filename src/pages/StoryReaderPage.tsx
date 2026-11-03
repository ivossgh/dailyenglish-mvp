import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { trackEvent } from '../analytics';
import AudioPlayer from '../components/AudioPlayer';
import Icon from '../components/Icon';
import LevelBadge from '../components/LevelBadge';
import Lory from '../components/Lory';
import SentenceText from '../components/SentenceText';
import { getStoryById } from '../content/stories';
import { groupIntoParagraphs } from '../domain/story';
import styles from './StoryReaderPage.module.css';

// Replace with your real feedback form URL (Google Forms, Tally, Typeform…).
const FEEDBACK_URL = 'https://forms.gle/SUBSTITUA-PELO-SEU-LINK';

export default function StoryReaderPage() {
  const { storyId } = useParams();
  const story = storyId === undefined ? undefined : getStoryById(storyId);
  const [completed, setCompleted] = useState(false);
  const openedTracked = useRef(false);

  useEffect(() => {
    // Fire story_opened once per mount. The ref prevents double-firing in StrictMode.
    if (!openedTracked.current && story !== undefined) {
      openedTracked.current = true;
      trackEvent('story_opened', { level: story.level });
    }
  }, [story]);

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

  function handleComplete() {
    if (completed) return;
    setCompleted(true);
    trackEvent('story_completed', { level: story!.level });
  }

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
      {story.audioUrl !== null && <AudioPlayer key={story.id} url={story.audioUrl} />}
      <p className={styles.hint}>
        Toque em uma frase para ver a tradução. Toque de novo para esconder.
      </p>
      <div lang="en" className={styles.copy}>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>
            {paragraph.map((sentence) => (
              <SentenceText key={sentence.id} sentence={sentence} />
            ))}
          </p>
        ))}
      </div>
      {completed ? (
        <div className={styles.endCard}>
          <Lory mood="cheer" size={80} />
          <div className={styles.endText}>
            <p className={styles.endTitle}>Você terminou!</p>
            <p className={styles.endSub}>Mais uma história, mais um passo.</p>
          </div>
          <Link to="/" className={styles.endBtn}>
            Próxima história
          </Link>
        </div>
      ) : (
        <div className={styles.completeRow}>
          <button type="button" className={styles.completeBtn} onClick={handleComplete}>
            Marcar como lida ✓
          </button>
        </div>
      )}
      <p className={styles.feedback}>
        <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
          Deixe seu feedback sobre o app →
        </a>
      </p>
    </article>
  );
}