import { OriginMarker, Stamp } from "./Stamp";
import styles from "../../../styles/dashboard-board.module.css";

const DELTA_CLASS = {
  up: styles.deltaUp,
  down: styles.deltaDown,
  flat: styles.deltaFlat,
};

function Sparkline({ values }) {
  const W = 120;
  const H = 28;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const X = (i) => 2 + ((W - 8) * i) / (values.length - 1);
  const Y = (v) => 3 + (H - 6) * (1 - (v - lo) / (hi - lo || 1));
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)
    .join("");
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <path
        d={d}
        fill="none"
        style={{ stroke: "var(--g2)" }}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle
        cx={X(last)}
        cy={Y(values[last])}
        r="3.2"
        style={{ fill: "var(--accent)" }}
      />
    </svg>
  );
}

/** KPI tile: label, value, change, sparkline, freshness stamp and origin. */
export default function Tile({ tile, lang, collectedOn, onOpen }) {
  const body = (
    <>
      <div className={styles.tileLabel}>{tile.label}</div>
      <div className={styles.tileValue}>{tile.value}</div>
      {tile.delta && (
        <div className={`${styles.delta} ${DELTA_CLASS[tile.delta.cls]}`}>
          <span aria-hidden="true">{tile.delta.sym}</span>
          <span>{tile.delta.text}</span>
        </div>
      )}
      {tile.spark && <Sparkline values={tile.spark} />}
      <Stamp stamp={tile.stamp} lang={lang} />
      <OriginMarker
        origin={tile.origin}
        lives={tile.live ? [tile.live] : []}
        collectedOn={collectedOn}
        lang={lang}
        compact
      />
    </>
  );

  if (tile.open) {
    return (
      <button
        type="button"
        className={styles.tile}
        onClick={() => onOpen(tile.open)}
      >
        {body}
      </button>
    );
  }
  return <div className={styles.tile}>{body}</div>;
}
