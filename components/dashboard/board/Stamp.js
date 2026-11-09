import { L, formatDay } from "../../../lib/economy/board/format";
import { UI, fill } from "../../../lib/economy/board/i18n";
import { provenance } from "../../../lib/economy/board/model";
import styles from "../../../styles/dashboard-board.module.css";

const ORIGIN_CLASS = {
  live: styles.provLive,
  fixed: styles.provFixed,
  mixed: styles.provMixed,
};

const FRESH_CLASS = {
  aging: styles.freshAging,
  stale: styles.freshStale,
  discontinued: styles.freshStale,
};

/**
 * One-line provenance for a figure: "● En vivo · jul 2026 · BLS" or
 * "● Dato fijo · jun 2026 · DDEC · Envejeciendo". The source becomes a link
 * when `url` is given. The full description (retrieval / collection date,
 * editorial status) is in the tooltip and read by screen readers; `full`
 * also prints it under the line (detail dialog).
 */
export function Provenance({
  origin,
  stampKey,
  period,
  freq,
  force,
  src,
  url,
  lives,
  collectedOn,
  lang,
  full = false,
  className = "",
}) {
  const p = provenance(
    { origin, key: stampKey, period, freq, force, src, lives, collectedOn },
    lang,
  );
  if (!p) return null;
  const source =
    p.src && url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {p.src}
        <span aria-hidden="true"> ↗</span>
        <span className={styles.srOnly}> ({L(UI.newTab, lang)})</span>
      </a>
    ) : (
      p.src
    );
  const parts = [
    <b key="o">{p.originLabel}</b>,
    p.period || null,
    source || null,
    p.freshLabel ? (
      <span key="f" className={FRESH_CLASS[p.fresh]}>
        {p.freshLabel}
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <span className={`${styles.provWrap} ${className}`}>
      <span
        className={`${styles.prov} ${ORIGIN_CLASS[p.origin] || ""}`}
        title={p.full}
      >
        <span className={styles.provDot} aria-hidden="true" />
        <span className={styles.provText}>
          {parts.map((part, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={index}>
              {index > 0 && (
                <span className={styles.provSep} aria-hidden="true">
                  {" · "}
                </span>
              )}
              {index > 0 && <span className={styles.srOnly}>, </span>}
              {part}
            </span>
          ))}
        </span>
        {!full && <span className={styles.srOnly}>. {p.full}</span>}
      </span>
      {full && <span className={styles.provFull}>{p.full}</span>}
    </span>
  );
}

/**
 * Consistent marker for AI-drafted fixed text (briefs and chart notes):
 * "Texto fijo · 18 sept 2026", plus "las cifras en vivo pueden diferir" when
 * the figures next to it are live.
 */
export function FixedTextMark({ collectedOn, live = false, lang }) {
  const date = formatDay(collectedOn, lang);
  const fullText = [
    fill(L(UI.fixedTextFull, lang), { date }),
    live ? L(UI.fixedTextFullLive, lang) : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={styles.textMark} title={fullText}>
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M11.3 2.3a1.5 1.5 0 0 1 2.1 2.1L5.6 12.2 2.5 13l.8-3.1z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        {fill(L(UI.fixedText, lang), { date })}
        {live ? ` · ${L(UI.fixedTextLive, lang)}` : ""}
      </span>
      <span className={styles.srOnly}>. {fullText}</span>
    </span>
  );
}
