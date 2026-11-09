import { FixedTextMark, Provenance } from "./Stamp";
import { L, per, formatDay } from "../../../lib/economy/board/format";
import { UI, fill } from "../../../lib/economy/board/i18n";
import styles from "../../../styles/dashboard-board.module.css";

/**
 * The tab's brief: fixed AI-drafted text, flagged with the same "Texto fijo"
 * mark as chart notes. When a live KPI on the tab is for a later period than
 * the figures the brief was written from, a note under it names them, so the
 * headline never silently contradicts the live number below.
 */
export function Brief({ brief, lang, collectedOn, newer = [] }) {
  if (!brief) return <div />;
  return (
    <div className={styles.brief}>
      <div className={styles.briefTag}>
        <span className={styles.eyebrow}>{L(UI.briefTag, lang)}</span>
        <FixedTextMark collectedOn={collectedOn} lang={lang} />
      </div>
      <h2>{L(brief.h, lang)}</h2>
      {(brief.p[lang] || brief.p.es).map((text) => (
        <p key={text.slice(0, 40)}>{text}</p>
      ))}
      {newer.length > 0 && (
        <p className={styles.newer}>
          <span className={styles.newerDot} aria-hidden="true" />
          <span>
            {L(UI.newerLive, lang)}{" "}
            {newer.map((item, index) => (
              <span key={item.id}>
                {index > 0 ? "; " : ""}
                <b>{item.label}</b> {item.value} ({item.period})
              </span>
            ))}
            .
          </span>
        </p>
      )}
    </div>
  );
}

function FactRows({ rows, lang }) {
  return rows.map((row) => (
    <li key={`${row[0]}-${L(row[1], "en").slice(0, 20)}`}>
      <span className={styles.feedDate}>{row[0]}</span>
      <div>
        <div>{L(row[1], lang)}</div>
        <div className={styles.feedSrc}>{row[2]}</div>
      </div>
    </li>
  ));
}

function NewsRows({ items, lang, withLocation }) {
  return items.map((item) => (
    <li key={`${item.date}-${item.company}`}>
      <span className={styles.feedDate}>
        {per(item.date.slice(0, 7), lang, true)}
      </span>
      <div>
        <div>
          <b>
            {[item.company, item.amount, withLocation ? item.location : null]
              .filter(Boolean)
              .join(" · ")}
          </b>
        </div>
        {item.source_url ? (
          <a
            className={styles.feedSrc}
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.source_name} ↗
          </a>
        ) : (
          <div className={styles.feedSrc}>{item.source_name}</div>
        )}
      </div>
    </li>
  ));
}

/** Side panel next to the brief: releases feed, news, or key facts. */
export function SidePanel({ panel, board, lang }) {
  if (!panel) return <div />;
  const { fixed } = board;
  let title;
  let rows;
  if (panel.type === "feed") {
    title = L(UI.latestReleases, lang);
    rows = (
      <FactRows
        rows={fixed.feed.map((item) => [L(item.d, lang), item.t, item.s])}
        lang={lang}
      />
    );
  } else if (panel.type === "news") {
    title = L(panel.title, lang);
    rows = (
      <NewsRows
        items={fixed.data.news.filter(
          (item) => item.industry === panel.industry,
        )}
        lang={lang}
      />
    );
  } else if (panel.type === "projects") {
    const pattern = new RegExp(panel.match);
    title = L(panel.title, lang);
    rows = (
      <>
        <NewsRows
          items={fixed.data.news.filter(
            (item) => item.location && pattern.test(item.headline_en),
          )}
          lang={lang}
          withLocation
        />
        <FactRows rows={panel.rows} lang={lang} />
      </>
    );
  } else {
    title = L(panel.title, lang);
    rows = <FactRows rows={panel.rows} lang={lang} />;
  }

  return (
    <aside className={styles.feed}>
      <h3>{title}</h3>
      <ol>{rows}</ol>
      <Provenance
        origin="fixed"
        period={fill(L(UI.collectedOn, lang), {
          date: formatDay(board.collectedOn, lang),
        })}
        collectedOn={board.collectedOn}
        lang={lang}
        className={styles.panelMarker}
      />
    </aside>
  );
}

/** "In the pipeline" grid: planned modules, no numbers. */
export function Pipeline({ items, lang }) {
  return (
    <div className={styles.pipe}>
      {items.map((item) => (
        <div key={L(item.h, "en")}>
          <h3>{L(item.h, lang)}</h3>
          <p>{L(item.p, lang)}</p>
          <span className={styles.pipeSrc}>{L(item.s, lang)}</span>
        </div>
      ))}
    </div>
  );
}
