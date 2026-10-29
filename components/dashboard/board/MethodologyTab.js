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
  live: styles.originLive,
  fixed: styles.originFixed,
  mixed: styles.originMixed,
};

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
        <div className={styles.freshRow}>
          {["current", "aging", "stale"].map((fresh) => (
            <div className={styles.stamp} key={fresh}>
              <span
                className={`${styles.dot} ${
                  fresh === "current"
                    ? styles.dotCurrent
                    : fresh === "aging"
                      ? styles.dotAging
                      : styles.dotStale
                }`}
              />
              <span>{L(UI.fresh[fresh], lang)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={L(M.seriesTitle, lang)} read={L(M.seriesRead, lang)}>
        <div className={styles.tablePanel}>
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
                      className={`${styles.origin} ${ORIGIN_CLASS[row.origin] || ""}`}
                    >
                      {L(UI.origin[row.origin], lang)}
                    </span>
                  </td>
                  <td>{row.source}</td>
                  <td>{row.latest}</td>
                  <td>{row.fresh ? L(UI.fresh[row.fresh], lang) : "—"}</td>
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
        <div className={styles.tablePanel}>
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
