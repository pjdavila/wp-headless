import { L, formatDay, shortSrc } from "../../../lib/economy/board/format";
import { UI, fill } from "../../../lib/economy/board/i18n";
import { stampText } from "../../../lib/economy/board/model";
import styles from "../../../styles/dashboard-board.module.css";

const DOT_CLASS = {
  current: styles.dotCurrent,
  aging: styles.dotAging,
  stale: styles.dotStale,
  discontinued: styles.dotStale,
};

/** Freshness stamp: "Al día · jul 2026 · BLS". */
export function Stamp({ stamp, lang, fallbackText }) {
  const resolved = stampText(stamp, lang);
  const fresh = resolved ? resolved.fresh : "current";
  const text = resolved ? resolved.text : fallbackText;
  if (!text) return null;
  return (
    <div className={styles.stamp}>
      <span
        className={`${styles.dot} ${DOT_CLASS[fresh]}`}
        aria-hidden="true"
      />
      <span>{text}</span>
    </div>
  );
}

/**
 * Where a figure comes from. Live: source and retrieval date. Fixed: the
 * snapshot collection date and "sin validación editorial". Mixed charts list
 * both. `compact` shortens the copy for tiles (full text in the tooltip).
 */
export function OriginMarker({
  origin,
  lives = [],
  collectedOn,
  lang,
  compact = false,
}) {
  if (origin === "none") return null;
  const collected = formatDay(collectedOn, lang);
  const fixedFull = fill(L(UI.fixedMarker, lang), { date: collected });

  if (origin === "live") {
    const live = lives[0];
    const updated = formatDay(live?.retrievedAt, lang);
    const full = fill(L(UI.liveMarker, lang), {
      src: lives
        .map((item) => shortSrc(item.source))
        .filter((s, i, a) => a.indexOf(s) === i)
        .join(", "),
      date: updated,
    });
    const failed = lives.some((item) => item.staleReason === "refresh-failed");
    const text = compact
      ? fill(L(UI.liveMarkerShort, lang), { date: updated })
      : full;
    return (
      <span className={`${styles.origin} ${styles.originLive}`} title={full}>
        {text}
        {failed && !compact ? ` · ${L(UI.refreshFailed, lang)}` : ""}
      </span>
    );
  }

  if (origin === "mixed") {
    const full = fill(L(UI.mixedMarker, lang), {
      live: lives.map((item) => shortSrc(item.source)).join(", "),
      date: collected,
    });
    return (
      <span className={`${styles.origin} ${styles.originMixed}`} title={full}>
        {compact ? L(UI.origin.mixed, lang) : full}
      </span>
    );
  }

  return (
    <span
      className={`${styles.origin} ${styles.originFixed}`}
      title={fixedFull}
    >
      {compact
        ? fill(L(UI.fixedMarkerShort, lang), { date: collected })
        : fixedFull}
    </span>
  );
}
