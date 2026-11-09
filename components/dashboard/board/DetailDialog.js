import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ChartCard from "./ChartCard";
import { FixedTextMark } from "./Stamp";
import { chartModel } from "../../../lib/economy/board/model";
import { L, formatDay } from "../../../lib/economy/board/format";
import { UI } from "../../../lib/economy/board/i18n";
import { indicatorPath } from "../../../lib/economy/dashboardConfig";
import styles from "../../../styles/dashboard-board.module.css";

function citation(model, board, lang) {
  const via = `${L(UI.via, lang)} The Great Puerto Rico Dashboard, Caribbean Business.`;
  const parts = [`${model.title}.`];
  if (model.origin === "live" || model.origin === "mixed") {
    const sources = [...new Set(model.lives.map((live) => live.source))].join(
      "; ",
    );
    const retrieved = model.lives
      .map((live) => live.retrievedAt)
      .filter(Boolean)
      .sort()
      .pop();
    parts.push(`${sources}.`, via);
    if (retrieved)
      parts.push(`${L(UI.dataRetrieved, lang)} ${formatDay(retrieved, lang)}.`);
    if (model.origin === "mixed") {
      parts.push(
        `${L(UI.fixedCiteNote, lang)}: ${model.src}, ${L(UI.dataCollected, lang).toLowerCase()} ${formatDay(board.collectedOn, lang)}.`,
      );
    }
    const url = model.lives[0]?.sourceUrl || model.url;
    if (url) parts.push(url);
  } else {
    parts.push(
      `${model.src}.`,
      via,
      `${L(UI.dataCollected, lang)} ${formatDay(board.collectedOn, lang)}.`,
      `${L(UI.fixedCiteNote, lang)}.`,
    );
    if (model.url) parts.push(model.url);
  }
  return parts.join(" ");
}

/** Indicator detail: big chart, "Qué significa", citation and copy button. */
export default function DetailDialog({ board, chartId, lang, range, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const model = useMemo(
    () => chartModel(board, chartId, lang, range),
    [board, chartId, lang, range],
  );

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    // Start on the close button (not on "Ver datos") and at the top.
    closeRef.current?.focus();
    if (dialog) dialog.scrollTop = 0;
    setCopied(false);
  }, [chartId]);

  // Keep the page behind the modal from scrolling (phones especially).
  useEffect(() => {
    const { style } = document.documentElement;
    const previous = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = previous;
    };
  }, []);

  if (!model) return null;
  const live = model.origin === "live" || model.origin === "mixed";
  const cite = citation(model, board, lang);
  const liveIndicatorId = model.lives[0]?.indicatorId || model.liveIndicator;

  const close = () => {
    if (ref.current?.open) ref.current.close();
    else onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cite);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="board-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <div className={styles.dlg}>
        <ChartCard
          board={board}
          chartId={chartId}
          lang={lang}
          range={range}
          big
          onClose={close}
          closeRef={closeRef}
        />
        {model.spec.note && (
          <section className={styles.dlgSection}>
            <h3 className={styles.dlgLabel}>{L(UI.whatItMeans, lang)}</h3>
            <FixedTextMark
              collectedOn={board.collectedOn}
              live={live}
              lang={lang}
            />
            <p className={styles.dlgNote}>{L(model.spec.note, lang)}</p>
          </section>
        )}
        <section className={styles.dlgSection}>
          <h3 className={styles.dlgLabel}>{L(UI.cite, lang)}</h3>
          <p className={styles.cite}>{cite}</p>
        </section>
        <div className={styles.acts}>
          <button type="button" className={styles.btn} onClick={copy}>
            {copied ? L(UI.copied, lang) : L(UI.copyCite, lang)}
          </button>
          <span className={styles.srOnly} role="status">
            {copied ? L(UI.copied, lang) : ""}
          </span>
          {liveIndicatorId && (
            <Link
              href={indicatorPath(liveIndicatorId)}
              className={styles.textLink}
            >
              {L(UI.fullIndicator, lang)}
            </Link>
          )}
        </div>
      </div>
    </dialog>
  );
}
