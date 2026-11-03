import styles from './Lory.module.css';

type LoryMood = 'happy' | 'cheer';

interface LoryProps {
  size?: number; // width and height in px
  mood?: LoryMood;
  label?: string; // accessible name; leave undefined when the mascot is only decoration
}

// The Lory parrot mascot. Colors come from the palette variables in tokens.css.
export default function Lory({ size = 124, mood = 'happy', label }: LoryProps) {
  return (
    <svg
      className={styles.lory}
      width={size}
      height={size}
      viewBox="0 0 180 180"
      role={label === undefined ? undefined : 'img'}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
    >
      <path
        d="M68 39c-4-15 9-23 15-8 2-16 18-16 15 1 11-10 22 1 11 12"
        fill="var(--yellow)"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M42 98c0-40 22-65 56-65 33 0 54 25 54 64 0 39-21 65-56 65-34 0-54-26-54-64Z"
        fill="var(--coral)"
        stroke="var(--ink)"
        strokeWidth="4"
      />
      <path
        d="M49 94c-15 2-23 19-19 36 5-9 12-10 20-7"
        fill="var(--teal)"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M144 91c17 3 24 20 19 36-4-9-12-10-20-6"
        fill="var(--teal)"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M63 115c10 23 50 31 69 2-3 28-17 45-38 45-21 0-29-19-31-47Z" fill="var(--yellow)" />
      <ellipse cx="76" cy="75" rx="17" ry="20" fill="#fff" />
      <ellipse cx="118" cy="75" rx="17" ry="20" fill="#fff" />
      <circle cx="79" cy="77" r="7" fill="var(--ink)" />
      <circle cx="115" cy="77" r="7" fill="var(--ink)" />
      <circle cx="81" cy="74" r="2.5" fill="#fff" />
      <circle cx="117" cy="74" r="2.5" fill="#fff" />
      <path
        d="M84 93c8-10 20-10 28 0-7 11-21 13-28 0Z"
        fill="var(--yellow)"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      {mood === 'cheer' && (
        <path
          d="M85 113c7 6 15 6 22 0"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      <path
        d="M55 72c-7 2-10 11-10 19M138 72c7 2 10 11 10 19"
        fill="none"
        stroke="var(--teal)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="40" y="85" width="13" height="25" rx="6" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" />
      <rect x="141" y="85" width="13" height="25" rx="6" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" />
      <path d="M78 159v10M112 159v10M70 170h16M104 170h16" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}