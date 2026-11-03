import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  exportBackup,
  getAllSavedWords,
  importBackup,
  removeWord,
  setReviewState,
} from '../db/savedWords';
import type { SavedWord } from '../db/schema';
import styles from './WordsPage.module.css';

type View = 'list' | 'review';

export default function WordsPage() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const loadWords = useCallback(async () => {
    try {
      const all = await getAllSavedWords();
      // Most recent first in list; unreviewed first in review.
      setWords(all.slice().reverse());
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWords();
    function handleChange() {
      void loadWords();
    }
    window.addEventListener('dailyinglish:wordchange', handleChange);
    return () => window.removeEventListener('dailyinglish:wordchange', handleChange);
  }, [loadWords]);

  // Review queue: only words not yet marked as "I know it".
  const reviewQueue = words.filter((word) => word.reviewState !== true);

  async function handleRemove(id: string) {
    try {
      await removeWord(id);
      window.dispatchEvent(new CustomEvent('dailyinglish:wordchange'));
    } catch {
      // Leave the UI unchanged if the DB operation fails.
    }
  }

  async function handleReview(knows: boolean) {
    const current = reviewQueue[reviewIndex];
    if (current === undefined) return;
    try {
      await setReviewState(current.id, knows);
    } catch {
      // Swallow the error and advance anyway; state is best-effort.
    }
    if (reviewIndex < reviewQueue.length - 1) {
      setReviewIndex((i) => i + 1);
    } else {
      setReviewIndex(0);
      setView('list');
      void loadWords();
    }
  }

  async function handleExport() {
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dailyinglish-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`${words.length} palavra(s) exportada(s).`);
    } catch {
      setExportStatus('Erro ao exportar. Tente novamente.');
    }
  }

  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const text = loadEvent.target?.result;
      if (typeof text !== 'string') return;
      try {
        const imported = await importBackup(text);
        window.dispatchEvent(new CustomEvent('dailyinglish:wordchange'));
        setImportStatus(
          imported > 0
            ? `${imported} palavra(s) nova(s) importada(s).`
            : 'Nenhuma palavra nova (todas já estavam salvas).',
        );
      } catch (error) {
        setImportStatus(error instanceof Error ? error.message : 'Erro ao importar.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be picked again.
    event.target.value = '';
  }

  if (loading) {
    return <p className={styles.empty}>Carregando…</p>;
  }

  // ---- Review mode ----
  if (view === 'review') {
    const card = reviewQueue[reviewIndex];
    if (card === undefined) {
      return (
        <div className={styles.reviewDone}>
          <p>Você revisou todas as palavras da fila!</p>
          <button type="button" className={styles.btnPrimary} onClick={() => setView('list')}>
            Voltar à lista
          </button>
        </div>
      );
    }
    return (
      <div className={styles.reviewWrap}>
        <p className={styles.reviewProgress}>
          {reviewIndex + 1} / {reviewQueue.length}
        </p>
        <div className={styles.flashcard}>
          <span className={styles.flashTerm}>{card.term}</span>
          <span className={styles.flashPt}>{card.pt}</span>
          <Link to={`/story/${card.storyId}`} className={styles.flashSource}>
            Ver na história
          </Link>
        </div>
        <div className={styles.reviewActions}>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => void handleReview(false)}
          >
            Ainda não
          </button>
          <button
            type="button"
            className={styles.btnSuccess}
            onClick={() => void handleReview(true)}
          >
            Já sei ✓
          </button>
        </div>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => {
            setReviewIndex(0);
            setView('list');
          }}
        >
          Parar revisão
        </button>
      </div>
    );
  }

  // ---- List mode ----
  return (
    <>
      <div className={styles.titleRow}>
        <h1 className={styles.heading}>Palavras salvas</h1>
        {reviewQueue.length > 0 && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setReviewIndex(0);
              setView('review');
            }}
          >
            Revisar ({reviewQueue.length})
          </button>
        )}
      </div>

      <p className={styles.localNotice}>
        ℹ️ Suas palavras ficam salvas só neste aparelho e neste navegador. Use o backup para não perder seus dados.
      </p>

      {words.length === 0 ? (
        <p className={styles.empty}>
          Ainda não há palavras salvas. Abra uma história, toque em uma frase e salve as palavras
          que quiser.
        </p>
      ) : (
        <ul className={styles.wordList}>
          {words.map((word) => (
            <li key={word.id} className={styles.wordItem}>
              <span className={styles.wordTerm}>{word.term}</span>
              <span className={styles.wordPt}>{word.pt}</span>
              {word.reviewState === true && (
                <span className={styles.wordKnown} aria-label="Marcada como já sei">✓</span>
              )}
              <Link to={`/story/${word.storyId}`} className={styles.wordLink}>
                Ver
              </Link>
              <button
                type="button"
                className={styles.wordRemove}
                aria-label={`Remover "${word.term}"`}
                onClick={() => void handleRemove(word.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className={styles.backup}>
        <h2 className={styles.backupTitle}>Backup</h2>
        <div className={styles.backupActions}>
          <button type="button" className={styles.btnSecondary} onClick={() => void handleExport()}>
            Exportar JSON
          </button>
          <label className={styles.btnSecondary}>
            Importar JSON
            <input
              type="file"
              accept=".json,application/json"
              className={styles.fileInput}
              onChange={handleImport}
            />
          </label>
        </div>
        {exportStatus && <p className={styles.statusMsg}>{exportStatus}</p>}
        {importStatus && <p className={styles.statusMsg}>{importStatus}</p>}
      </section>
    </>
  );
}