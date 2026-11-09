import { Provenance } from "./Stamp";
import styles from "../../../styles/dashboard-board.module.css";

const DELTA_CLASS = {
  up: styles.deltaUp,
  down: styles.deltaDown,
  flat: styles.deltaFlat,
};

const DELTA_ICON = {
  up: "M3 10 8 5l5 5",
  down: "M3 6l5 5 5-5",
};

function Sparkline({ values }) {
  const W = 120;
  const H = 30;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const X = (i) => 2 + ((W - 8) * i) / (values.length - 1);
  const Y = (v) => 4 + (H - 8) * (1 - (v - lo) / (hi - lo || 1));
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)
    .join("");
  const last = values.length - 1;
  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={`${d}L${X(last).toFixed(1)} ${H}L${X(0).toFixed(1)} ${H}Z`}
        style={{ fill: "var(--spark-fill)" }}
      />
      <path
        d={d}
        fill="none"
        style={{ stroke: "var(--spark)" }}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={X(last)}
        cy={Y(values[last])}
        r="3"
        style={{ fill: "var(--accent)", stroke: "var(--surface)" }}
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** KPI tile: label, value, change with arrow, sparkline and one provenance line. */
export default function Tile({ tile, lang, collectedOn, onOpen }) {
  const delta = tile.delta;
  const dir = !delta
    ? null
    : delta.sym === "▲"
      ? "up"
      : delta.sym === "▼"
        ? "down"
        : null;
  const body = (
    <>
      <span className={styles.tileLabel}>{tile.label}</span>
      <span className={styles.tileValue}>{tile.value}</span>
      {delta ? (
        <span className={`${styles.delta} ${DELTA_CLASS[delta.cls]}`}>
          {dir ? (
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d={DELTA_ICON[dir]}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className={styles.deltaDot} aria-hidden="true" />
          )}
          <span>{delta.text}</span>
        </span>
      ) : (
        <span className={styles.deltaEmpty} aria-hidden="true" />
      )}
      {tile.spark ? (
        <Sparkline values={tile.spark} />
      ) : (
        <span className={styles.sparkEmpty} aria-hidden="true" />
      )}
      <Provenance
        origin={tile.origin}
        stampKey={tile.stamp?.key}
        freq={tile.stamp?.freq}
        force={tile.stamp?.force}
        src={tile.stamp?.src}
        lives={tile.live ? [tile.live] : []}
        collectedOn={collectedOn}
        lang={lang}
        className={styles.tileProv}
      />
    </>
  );

  if (tile.open) {
    return (
      <button
        type="button"
        className={`${styles.tile} ${styles.tileButton}`}
        aria-haspopup="dialog"
        onClick={() => onOpen(tile.open)}
      >
        {body}
      </button>
    );
  }
  return <div className={styles.tile}>{body}</div>;
}
