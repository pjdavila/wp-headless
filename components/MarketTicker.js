import styles from "../styles/market-ticker.module.css";

const SPARKLINE_UP = "M0,16 L6,12 L12,14 L18,8 L24,10 L30,4 L36,6 L42,2 L48,0";
const SPARKLINE_DOWN = "M0,2 L6,6 L12,4 L18,10 L24,8 L30,14 L36,12 L42,16 L48,18";

const MARKET_DATA = [
  { symbol: "S&P 500", value: "5,218.42", change: "+0.73%", up: true },
  { symbol: "DJIA", value: "39,142.23", change: "+0.58%", up: true },
  { symbol: "NASDAQ", value: "16,389.74", change: "-0.12%", up: false },
  { symbol: "BTC/USD", value: "68,432.10", change: "+2.14%", up: true },
  { symbol: "EUR/USD", value: "1.0842", change: "-0.05%", up: false },
  { symbol: "Crude Oil", value: "78.42", change: "+1.23%", up: true },
  { symbol: "Gold", value: "2,178.30", change: "+0.34%", up: true },
  { symbol: "10Y Yield", value: "4.312%", change: "+0.02%", up: true },
];

function Sparkline({ up }) {
  return (
    <svg className={styles.sparkline} width="48" height="20" viewBox="0 0 48 20" fill="none">
      <path
        d={up ? SPARKLINE_UP : SPARKLINE_DOWN}
        stroke={up ? "hsl(var(--positive))" : "hsl(var(--destructive))"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MarketTicker() {
  const items = [...MARKET_DATA, ...MARKET_DATA];

  return (
    <div className={styles.wrapper} aria-label="Market Data">
      <div className={styles.track}>
        {items.map((item, i) => (
          <div className={styles.item} key={`${item.symbol}-${i}`}>
            <span className={styles.symbol}>{item.symbol}</span>
            <Sparkline up={item.up} />
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
