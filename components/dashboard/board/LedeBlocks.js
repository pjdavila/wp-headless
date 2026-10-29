import { OriginMarker } from "./Stamp";
import { L, per } from "../../../lib/economy/board/format";
import { UI } from "../../../lib/economy/board/i18n";
import styles from "../../../styles/dashboard-board.module.css";

/** The tab's brief: fixed AI-drafted text, flagged as such. */
export function Brief({ brief, lang }) {
  if (!brief) return <div />;
  return (
    <div className={styles.brief}>
      <div className={`${styles.tag} ${styles.mono}`}>
        <b>{L(UI.briefTag, lang)}</b>
        <span>{L(UI.briefNote, lang)}</span>
      </div>
      <h2>{L(brief.h, lang)}</h2>
      {(brief.p[lang] || brief.p.es).map((text) => (
        <p key={text.slice(0, 40)}>{text}</p>
      ))}
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
      <div className={styles.panelMarker}>
        <OriginMarker
          origin="fixed"
          collectedOn={board.collectedOn}
          lang={lang}
          compact
        />
      </div>
    </aside>
  );
}

/** "In the pipeline" grid: planned modules, no numbers. */
export function Pipeline({ items, lang }) {
  return (
    <div className={styles.pipe}>
      {items.map((item) => (
        <div key={L(item.h, "en")}>
          <h4>{L(item.h, lang)}</h4>
          <p>{L(item.p, lang)}</p>
          <span className={styles.pipeSrc}>{L(item.s, lang)}</span>
        </div>
      ))}
    </div>
  );
}
