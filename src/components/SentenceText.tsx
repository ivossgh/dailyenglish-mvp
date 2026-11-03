import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { getSavedWord, removeWord, saveWord } from '../db/savedWords';
import type { Sentence } from '../domain/story';
import styles from './SentenceText.module.css';

interface SentenceTextProps {
  sentence: Sentence;
}

interface GlossaryChipProps {
  id: string;
  term: string;
  pt: string;
  storyId: string;
  sentenceId: string;
}

// A chip for one glossary word. It shows whether the word is already saved and lets the user
// toggle it. Saving dispatches a custom event so the tab bar counter updates.
function GlossaryChip({ id, term, pt, storyId, sentenceId }: GlossaryChipProps) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSavedWord(id)
      .then((word) => {
        if (!cancelled) setSaved(word !== undefined);
      })
      .catch(() => {}); // IndexedDB unavailable; chip stays unsaved
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        await removeWord(id);
        setSaved(false);
      } else {
        await saveWord({ id, term, pt, storyId, sentenceId });
        setSaved(true);
      }
      // Notify the tab bar (and any other listener) that the count may have changed.
      window.dispatchEvent(new CustomEvent('dailyinglish:wordchange'));
    } catch {
      // If the DB write fails, leave the state unchanged.
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void handleToggle();
    }
  }

  return (
    <button
      type="button"
      className={`${styles.chip} ${saved ? styles.chipSaved : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Remover "${term}"` : `Salvar "${term}" (${pt})`}
      disabled={busy}
      onClick={() => void handleToggle()}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.chipTerm}>{term}</span>
      <span className={styles.chipPt}>{pt}</span>
      <span className={styles.chipAction} aria-hidden="true">
        {saved ? '✓' : '+'}
      </span>
    </button>
  );
}

// One English sentence. Tap to show the Portuguese translation and, if there are glossary words,
// chips to save them. Tap again to hide.
export default function SentenceText({ sentence }: SentenceTextProps) {
  const [open, setOpen] = useState(false);
  const translationId = `${sentence.id}-pt`;

  function handleClick() {
    const selectedText = window.getSelection()?.toString() ?? '';
    if (selectedText !== '') return;
    setOpen((current) => !current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => !current);
    }
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className={`${styles.sentence} ${open ? styles.open : ''}`}
        aria-expanded={open}
        aria-controls={open ? translationId : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {sentence.en}
      </span>
      {open && (
        <span id={translationId} className={styles.translationBlock}>
          <span lang="pt-BR" className={styles.translation}>
            {sentence.pt}
          </span>
          {sentence.glossary.length > 0 && (
            <span className={styles.chips} aria-label="Palavras para salvar">
              {sentence.glossary.map((entry) => (
                <GlossaryChip
                  key={entry.id}
                  id={entry.id}
                  term={entry.term}
                  pt={entry.pt}
                  storyId={sentence.id.split('-s')[0]}
                  sentenceId={sentence.id}
                />
              ))}
            </span>
          )}
        </span>
      )}{' '}
    </>
  );
}