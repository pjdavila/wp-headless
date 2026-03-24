import styles from "../styles/market-watchlist.module.css";

const WATCHLIST = [
  { symbol: "S&P 500", value: "5,218.42", change: "+0.73%", up: true },
  { symbol: "DJIA", value: "39,142.23", change: "+0.58%", up: true },
  { symbol: "NASDAQ", value: "16,389.74", change: "-0.12%", up: false },
  { symbol: "BTC/USD", value: "68,432.10", change: "+2.14%", up: true },
  { symbol: "Gold", value: "2,178.30", change: "+0.34%", up: true },
];

export default function MarketWatchlist() {
  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>Mercados</h3>
      <div className={styles.list}>
        {WATCHLIST.map((item) => (
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
