import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import Icon from './Icon';
import styles from './AudioPlayer.module.css';

const SPEEDS = [0.75, 1, 1.25] as const;
type Speed = (typeof SPEEDS)[number];

interface AudioPlayerProps {
  url: string;
}

// 125.4 -> "2:05"
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

// Audio player for one story: play/pause, seek bar and speed (0.75x, 1x, 1.25x).
// The <audio> element is the source of truth: the buttons only ask it to do things, and the
// React state is updated from its events. That keeps the screen correct even when the browser
// pauses the audio by itself (phone call, headphones unplugged, another tab playing).
// Use key={url} where this component is rendered, so a different story starts from a clean state.
export default function AudioPlayer({ url }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [failed, setFailed] = useState(false);

  const canSeek = duration > 0 && !failed;

  function handleTogglePlay() {
    const audio = audioRef.current;
    if (audio === null) {
      return;
    }
    if (audio.paused) {
      // play() returns a promise that is rejected when, for example, the file cannot be loaded.
      audio.play().catch((error: unknown) => {
        // AbortError just means a pause() came right after; it is not a failure.
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setFailed(true);
        }
      });
    } else {
      audio.pause();
    }
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (audio === null || !canSeek) {
      return;
    }
    const seconds = Number(event.target.value);
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }

  function handleSpeed(next: Speed) {
    const audio = audioRef.current;
    if (audio !== null) {
      audio.playbackRate = next;
    }
    setSpeed(next);
  }

  return (
    <section className={styles.player} aria-label="Áudio da história">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const total = event.currentTarget.duration;
          setDuration(Number.isFinite(total) ? total : 0);
        }}
        onDurationChange={(event) => {
          const total = event.currentTarget.duration;
          setDuration(Number.isFinite(total) ? total : 0);
        }}
        onError={() => setFailed(true)}
      />

      <div className={styles.row}>
        <button
          type="button"
          className={styles.playButton}
          onClick={handleTogglePlay}
          disabled={failed}
          aria-label={playing ? 'Pausar' : 'Tocar'}
        >
          <Icon name={playing ? 'pause' : 'play'} size={22} />
        </button>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={canSeek ? duration : 0}
          step="any"
          value={canSeek ? Math.min(currentTime, duration) : 0}
          onChange={handleSeek}
          disabled={!canSeek}
          aria-label="Progresso do áudio"
          aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
        />
        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {failed ? (
        <p className={styles.error} role="alert">
          Não foi possível carregar o áudio. Você ainda pode ler a história.
        </p>
      ) : (
        <div className={styles.footer}>
          <div className={styles.speeds} role="group" aria-label="Velocidade do áudio">
            {SPEEDS.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.speed}
                aria-pressed={speed === option}
                onClick={() => handleSpeed(option)}
              >
                {option.toString().replace('.', ',')}x
              </button>
            ))}
          </div>
          <p className={styles.notice}>Narração gerada por IA</p>
        </div>
      )}
    </section>
  );
}