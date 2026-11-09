import { useMemo, useState } from "react";
import Link from "next/link";
import BoardChart from "./BoardChart";
import { FixedTextMark, Provenance } from "./Stamp";
import { chartModel } from "../../../lib/economy/board/model";
import { L, fmt, shortSrc } from "../../../lib/economy/board/format";
import { UI, fill } from "../../../lib/economy/board/i18n";
import { indicatorPath } from "../../../lib/economy/dashboardConfig";
import styles from "../../../styles/dashboard-board.module.css";

function DataTable({ model, lang, big }) {
  const order = model.cats.map((_, i) => i);
  if (!model.cat) order.reverse();
  return (
    <div
      className={`${styles.tblwrap} ${big ? styles.tblwrapBig : ""}`}
      tabIndex={0}
      role="region"
      aria-label={`${model.title} · ${L(UI.viewData, lang)}`}
    >
      <table>
        <thead>
          <tr>
            <th scope="col">{L(UI.period, lang)}</th>
            {model.series.map((s) => (
              <th scope="col" key={s.name}>
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map((i) => (
            <tr key={String(model.keys[i])}>
              <th scope="row">{model.full ? model.full[i] : model.cats[i]}</th>
              {model.series.map((s) => (
                <td key={s.name}>{fmt(s.vals[i], model.spec.fmt, lang)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="2"
        y="2.5"
        width="12"
        height="11"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 6.2h12M2 9.8h12M6.5 6.2v7.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 13.5h12M3 10.5l3.2-3.4 2.6 2.2L13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One chart card (grid) or the large version used inside the detail dialog
 * (`big`). Title opens the dialog; "Ver datos" swaps the chart for its data.
 *
 * Grid cards always render the same five slots (head, legend, body, note,
 * footer) so a row of cards can line them up with CSS subgrid.
 */
export default function ChartCard({
  board,
  chartId,
  lang,
  range,
  onOpen,
  big = false,
  onClose,
  closeRef,
}) {
  const [asTable, setAsTable] = useState(false);
  const model = useMemo(
    () => chartModel(board, chartId, lang, range),
    [board, chartId, lang, range],
  );
  if (!model) return null;
  const { spec } = model;
  const live = model.origin === "live" || model.origin === "mixed";

  const title = big ? (
    <h2 className={styles.dlgTitle} id="board-dialog-title">
      {model.title}
    </h2>
  ) : (
    <h3 className={styles.cardTitle}>
      <button
        type="button"
        title={L(UI.openDetail, lang)}
        aria-haspopup="dialog"
        onClick={() => onOpen(chartId)}
      >
        {model.title}
      </button>
    </h3>
  );

  let body;
  if (model.empty) {
    body = (
      <div className={styles.empty}>
        <p>{L(UI.emptyLive, lang)}</p>
        {model.liveIndicator && (
          <Link href={indicatorPath(model.liveIndicator)}>
            {L(UI.fullIndicator, lang)}
          </Link>
        )}
      </div>
    );
  } else if (asTable) {
    body = <DataTable model={model} lang={lang} big={big} />;
  } else {
    body = <BoardChart model={model} lang={lang} big={big} />;
  }

  const legend =
    model.series.length > 1 ? (
      <ul className={styles.legend}>
        {model.series.map((s) => (
          <li key={s.name}>
            <i
              className={spec.kind === "col" ? styles.box : undefined}
              style={{ background: `var(${s.color})` }}
              aria-hidden="true"
            />
            {s.name}
            {model.origin === "mixed" && (
              <span className={styles.legendOrigin}>
                {L(UI.origin[s.origin] || UI.origin.fixed, lang).toLowerCase()}
              </span>
            )}
          </li>
        ))}
      </ul>
    ) : null;

  const note =
    !big && !spec.h && spec.note ? (
      <div className={styles.note}>
        <FixedTextMark
          collectedOn={board.collectedOn}
          live={live}
          lang={lang}
        />
        <p>{L(spec.note, lang)}</p>
      </div>
    ) : null;

  const provenance = model.empty ? null : (
    <Provenance
      origin={model.origin}
      stampKey={model.lastKey}
      period={model.periodLabel}
      freq={model.freq}
      force={spec.force}
      src={shortSrc(model.src)}
      url={model.url}
      lives={model.lives}
      collectedOn={board.collectedOn}
      lang={lang}
      full={big}
    />
  );

  const toggleLabel = fill(
    L(asTable ? UI.viewChartLabel : UI.viewDataLabel, lang),
    { title: model.title },
  );

  return (
    <article className={big ? styles.cardBig : styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardHeadText}>
          {title}
          {model.sub && <p className={styles.sub}>{model.sub}</p>}
        </div>
        <div className={styles.mini}>
          {!model.empty && (
            <button
              type="button"
              className={styles.viewBtn}
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={() => setAsTable((value) => !value)}
            >
              {asTable ? <ChartIcon /> : <TableIcon />}
              <span>{L(asTable ? UI.viewChart : UI.viewData, lang)}</span>
            </button>
          )}
          {big && (
            <button
              type="button"
              ref={closeRef}
              className={styles.closeBtn}
              aria-label={L(UI.close, lang)}
              title={L(UI.close, lang)}
              onClick={onClose}
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className={styles.cardLegend}>{legend}</div>
      <div className={styles.cardBody}>{body}</div>
      <div className={styles.cardNote}>{note}</div>
      <footer className={styles.foot}>{provenance}</footer>
    </article>
  );
}
