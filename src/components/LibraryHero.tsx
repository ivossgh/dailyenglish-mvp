import Lory from './Lory';
import styles from './LibraryHero.module.css';

// Top of the story list: the "home" feeling of the app.
export default function LibraryHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.text}>
        <p className={styles.eyebrow}>LEIA. OUÇA. EVOLUA.</p>
        <h1 className={styles.title}>Histórias para o seu nível</h1>
        <p className={styles.description}>
          Histórias curtas e leves para ganhar confiança no inglês.
        </p>
      </div>
      <Lory mood="cheer" />
    </section>
  );
}