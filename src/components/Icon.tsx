import type { ReactNode } from 'react';
import styles from './Icon.module.css';

// Only the icons used so far. Add a name here when a step needs a new icon.
export type IconName = 'arrow' | 'back' | 'stories' | 'play' | 'pause';

const PATHS: Record<IconName, ReactNode> = {
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  back: (
    <>
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h11" />
    </>
  ),
  stories: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7Z" />,
  pause: <path d="M9 5v14M15 5v14" />,
};

interface IconProps {
  name: IconName;
  size?: number;
}

// Decorative outline icon. It takes the text color of its parent (currentColor).
export default function Icon({ name, size = 22 }: IconProps) {
  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}