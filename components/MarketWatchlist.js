import { useEffect, useState } from "react";
import styles from "../styles/market-watchlist.module.css";

export default function MarketWatchlist() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/markets");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items)) {
          setItems(data.items);
        }
      } catch {
        // Non-fatal: widget stays hidden if data can't be fetched.
      }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>Mercados</h3>
      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.symbol} className={styles.row}>
            <span className={styles.symbol}>{item.symbol}</span>
            <span className={styles.value}>{item.value}</span>
            <span className={`${styles.change} ${item.up ? styles.up : styles.down}`}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
