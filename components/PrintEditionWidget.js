import Link from "next/link";
import styles from "../styles/print-edition-widget.module.css";

export default function PrintEditionWidget() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconWrap} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
            <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="16" y2="11" />
            <line x1="8" y1="15" x2="13" y2="15" />
          </svg>
        </div>
        <h3 className={styles.heading}>Edición Impresa</h3>
        <p className={styles.subheading}>Próximamente en tu casa</p>
      </div>
      <div className={styles.body}>
        <p className={styles.copy}>
          Anótate ahora en la lista de espera y recibe Caribbean Business impreso cuando arranque
          el programa de envíos en Puerto Rico.
        </p>
        <Link href="/edicion-impresa/" className={styles.button}>
          Anotarme en la lista
        </Link>
      </div>
    </div>
  );
}
