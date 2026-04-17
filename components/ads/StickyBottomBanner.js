import { useEffect, useState } from "react";
import AdServerSlot from "../AdServerSlot";
import styles from "../../styles/stickyBottom.module.css";

const STORAGE_KEY = "bj-sticky-bottom-dismissed";

export default function StickyBottomBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true);
      }
    } catch (e) {}
    setMounted(true);
  }, []);

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
    setDismissed(true);
  };

  if (!mounted || dismissed) return null;

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.close}
        onClick={handleClose}
        aria-label="Cerrar anuncio"
      >
        ×
      </button>
      <div className={styles.desktop}>
        <AdServerSlot zone="161517" width={970} height={90} />
      </div>
      <div className={styles.tablet}>
        <AdServerSlot zone="161716" width={728} height={90} />
      </div>
      <div className={styles.mobile}>
        <AdServerSlot zone="161713" width={320} height={100} />
      </div>
    </div>
  );
}
