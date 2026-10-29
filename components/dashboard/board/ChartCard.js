import { useMemo, useState } from "react";
import Link from "next/link";
import BoardChart from "./BoardChart";
import { OriginMarker, Stamp } from "./Stamp";
import { chartModel } from "../../../lib/economy/board/model";
import { L, fmt, shortSrc } from "../../../lib/economy/board/format";
import { UI } from "../../../lib/economy/board/i18n";
import { indicatorPath } from "../../../lib/economy/dashboardConfig";
import styles from "../../../styles/dashboard-board.module.css";

function DataTable({ model, lang }) {
  const order = model.cats.map((_, i) => i);
  if (!model.cat) order.reverse();
  return (
    <div className={styles.tblwrap}>
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
              <td>{model.full ? model.full[i] : model.cats[i]}</td>
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

/**
 * One chart card (grid) or the large version used inside the detail dialog
 * (`big`). Title opens the dialog; "Tabla" swaps the chart for its data.
 */
export default function ChartCard({
  board,
  chartId,
  lang,
  range,
  onOpen,
  big = false,
  onClose,
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
        title={L(UI.openIndicator, lang)}
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
        <p style={{ margin: 0 }}>{L(UI.emptyLive, lang)}</p>
        {model.liveIndicator && (
          <Link href={indicatorPath(model.liveIndicator)}>
            {L(UI.fullIndicator, lang)}
          </Link>
        )}
      </div>
    );
  } else if (asTable) {
    body = <DataTable model={model} lang={lang} />;
  } else {
    body = <BoardChart model={model} lang={lang} big={big} />;
  }

  const stampProps = model.lastKey
    ? {
        key: model.lastKey,
        freq: model.freq,
        src: shortSrc(model.src),
        force: spec.force,
      }
    : null;

  return (
    <article className={big ? styles.cardBig : styles.card}>
      <div className={styles.cardHead}>
        <div>
          {title}
          <div className={styles.sub}>{model.sub}</div>
        </div>
        <div className={styles.mini}>
          {!model.empty && (
            <button
              type="button"
              className={styles.icon}
              aria-pressed={asTable}
              onClick={() => setAsTable((value) => !value)}
            >
              {L(UI.table, lang)}
            </button>
          )}
          {big && (
            <button
              type="button"
              className={styles.icon}
              aria-label={L(UI.close, lang)}
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {model.series.length > 1 && (
        <div className={styles.legend}>
          {model.series.map((s) => (
            <span key={s.name}>
              <i
                className={spec.kind === "col" ? styles.box : undefined}
                style={{ background: `var(${s.color})` }}
              />
              {s.name}
              {model.origin === "mixed" && (
                <span className={styles.legendOrigin}>
                  (
                  {L(
                    UI.origin[s.origin] || UI.origin.fixed,
                    lang,
                  ).toLowerCase()}
                  )
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {body}

      {!big && !spec.h && spec.note && (
        <p className={styles.note}>
          {L(spec.note, lang)}
          {live && (
            <span className={styles.noteFlag}> {L(UI.noteFlag, lang)}</span>
          )}
        </p>
      )}

      {!model.empty && (
        <div className={styles.foot}>
          <div className={styles.footLeft}>
            <Stamp
              stamp={stampProps}
              lang={lang}
              fallbackText={[model.periodLabel, shortSrc(model.src)]
                .filter(Boolean)
                .join(" · ")}
            />
            <OriginMarker
              origin={model.origin}
              lives={model.lives}
              collectedOn={board.collectedOn}
              lang={lang}
              compact={!big}
            />
          </div>
          {model.url && (
            <a href={model.url} target="_blank" rel="noopener noreferrer">
              {L(UI.source, lang)}: {shortSrc(model.src)} ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}
