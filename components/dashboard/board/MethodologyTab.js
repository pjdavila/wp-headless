import { useMemo } from "react";
import Link from "next/link";
import {
  liveEntryPeriod,
  methodologyRows,
} from "../../../lib/economy/board/model";
import { L, formatDay, shortSrc } from "../../../lib/economy/board/format";
import { UI } from "../../../lib/economy/board/i18n";
import {
  LIVE_NAMES_ES,
  LIVE_SOURCES,
} from "../../../lib/economy/board/liveMap";
import { indicatorPath } from "../../../lib/economy/dashboardConfig";
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

/** Example provenance lines for the legend (labels only, no figures). */
const EXAMPLES = [
  { origin: "live", period: { es: "jul 2026", en: "Jul 2026" }, src: "BLS" },
  {
    origin: "fixed",
    period: { es: "jun 2026", en: "Jun 2026" },
    src: "DDEC",
    fresh: "aging",
  },
  {
    origin: "fixed",
    period: "2023",
    src: "BEA",
    fresh: "discontinued",
  },
];

function Section({ title, read, children }) {
  return (
    <section className={styles.sec}>
      <header className={styles.secHead}>
        <h2>{title}</h2>
        {read && <p>{read}</p>}
      </header>
      {children}
    </section>
  );
}

const USED_LIVE = new Set(
  Object.values(LIVE_SOURCES).map((source) => source.indicator),
);

/** "Metodología" tab: caveats, freshness legend, every series and its origin. */
export default function MethodologyTab({ board, lang }) {
  const M = UI.method;
  const rows = useMemo(() => methodologyRows(board, lang), [board, lang]);
  const caveats = board.fixed.caveats || [];
  const liveEntries = board.liveEntries;

  return (
    <>
      <Section title={L(M.whatTitle, lang)} read={L(M.whatRead, lang)}>
        {caveats[8] && (
          <div className={styles.callout}>
            <span className={styles.calloutSym} aria-hidden="true">
              !
            </span>
            <p>{L(caveats[8], lang)}</p>
          </div>
        )}
        <div className={styles.caveats}>
          <ol>
            {caveats.slice(0, 8).map((caveat) => (
              <li key={L(caveat, "en").slice(0, 40)}>{L(caveat, lang)}</li>
            ))}
          </ol>
        </div>
      </Section>

      <Section title={L(M.freshTitle, lang)} read={L(M.freshRead, lang)}>
        <ul className={styles.freshRow}>
          {EXAMPLES.map((ex) => (
            <li key={`${ex.origin}-${ex.src}`}>
              <span className={`${styles.prov} ${ORIGIN_CLASS[ex.origin]}`}>
                <span className={styles.provDot} aria-hidden="true" />
                <span className={styles.provText}>
                  <b>{L(UI.origin[ex.origin], lang)}</b> · {L(ex.period, lang)}{" "}
                  · {ex.src}
                  {ex.fresh && (
                    <>
                      {" · "}
                      <span className={FRESH_CLASS[ex.fresh]}>
                        {L(UI.fresh[ex.fresh], lang)}
                      </span>
                    </>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={L(M.seriesTitle, lang)} read={L(M.seriesRead, lang)}>
        <div
          className={styles.tablePanel}
          role="region"
          aria-label={L(M.seriesTitle, lang)}
          tabIndex={0}
        >
          <table className={styles.wide}>
            <thead>
              <tr>
                <th scope="col">{L(M.colIndicator, lang)}</th>
                <th scope="col">{L(M.colOrigin, lang)}</th>
                <th scope="col">{L(M.colSource, lang)}</th>
                <th scope="col">{L(M.colLatest, lang)}</th>
                <th scope="col">{L(M.colStatus, lang)}</th>
                <th scope="col">
                  <span className={styles.srOnly}>{L(UI.source, lang)}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td className={styles.nowrap}>
                    <span
                      className={`${styles.prov} ${ORIGIN_CLASS[row.origin] || ""}`}
                    >
                      <span className={styles.provDot} aria-hidden="true" />
                      <b>{L(UI.origin[row.origin], lang)}</b>
                    </span>
                  </td>
                  <td>{row.source}</td>
                  <td>{row.latest}</td>
                  <td className={FRESH_CLASS[row.fresh] || ""}>
                    {row.fresh ? L(UI.fresh[row.fresh], lang) : "—"}
                  </td>
                  <td className={styles.nowrap}>
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {L(M.open, lang)}
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={L(M.liveTitle, lang)} read={L(M.liveRead, lang)}>
        <div
          className={styles.tablePanel}
          role="region"
          aria-label={L(M.liveTitle, lang)}
          tabIndex={0}
        >
          <table className={styles.wide}>
            <thead>
              <tr>
                <th scope="col">{L(M.colIndicator, lang)}</th>
                <th scope="col">{L(M.colStatus, lang)}</th>
                <th scope="col">{L(M.colLatest, lang)}</th>
                <th scope="col">{L(M.colUpdated, lang)}</th>
                <th scope="col">{L(M.colSource, lang)}</th>
                <th scope="col">{L(M.usedIn, lang)}</th>
                <th scope="col">
                  <span className={styles.srOnly}>
                    {L(UI.openIndicator, lang)}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {liveEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {lang === "es"
                      ? LIVE_NAMES_ES[entry.id] || entry.name
                      : entry.name}
                  </td>
                  <td>
                    {L(
                      M.liveStatus[entry.status] || M.liveStatus.pending,
                      lang,
                    )}
                    {entry.stale && entry.status === "ok"
                      ? ` · ${L(UI.fresh.stale, lang)}`
                      : ""}
                  </td>
                  <td>{liveEntryPeriod(entry, lang)}</td>
                  <td>
                    {entry.retrievedAt
                      ? formatDay(entry.retrievedAt, lang)
                      : "—"}
                  </td>
                  <td>{shortSrc(entry.source) || "—"}</td>
                  <td>{L(USED_LIVE.has(entry.id) ? M.yes : M.no, lang)}</td>
                  <td>
                    <Link href={indicatorPath(entry.id)}>
                      {L(M.open, lang)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
