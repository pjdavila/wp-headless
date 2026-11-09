import { useEffect, useRef, useState } from "react";
import BoardTab from "./BoardTab";
import MethodologyTab from "./MethodologyTab";
import DetailDialog from "./DetailDialog";
import { BoardSkeleton, ErrorState, GateState } from "./BoardStates";
import { TABS } from "../../../lib/economy/board/tabs";
import { UI, fill } from "../../../lib/economy/board/i18n";
import { L, formatDay } from "../../../lib/economy/board/format";
import styles from "../../../styles/dashboard-board.module.css";

/** Height of the site's sticky header, so the tab bar can stick below it. */
function useHeaderOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return undefined;
    const update = () => {
      const sticky = window.getComputedStyle(header).position === "sticky";
      setOffset(sticky ? header.getBoundingClientRect().height : 0);
    };
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return offset;
}

/**
 * "Gráficas mensuales: 2 años · 5 años · Todo" — the span of every monthly
 * chart. Lives in the sticky tab bar (and above the content on phones).
 */
function RangeControl({ range, onRange, lang, id, className }) {
  return (
    <div className={`${styles.range} ${className || ""}`}>
      <span
        className={styles.rangeLabel}
        id={id}
        title={L(UI.rangeGroup, lang)}
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
          focusable="false"
        >
          <rect
            x="2"
            y="3"
            width="12"
            height="11"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        {L(UI.rangeLabel, lang)}
        <span className={styles.srOnly}> · {L(UI.rangeGroup, lang)}</span>
      </span>
      <div className={styles.chips} role="group" aria-labelledby={id}>
        {["2y", "5y", "max"].map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={range === key}
            onClick={() => onRange(key)}
          >
            {L(UI.ranges[key], lang)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Body of /dashboard/ between the site Header and Footer: masthead with the
 * ES/EN toggle, sticky tabs, the loading / login-gate / error states and,
 * once `board` is ready, the active tab plus the indicator detail dialog.
 */
export default function BoardView({
  status,
  board,
  sessionExpired,
  onRetry,
  onLogin,
  tab,
  onTab,
  lang,
  onLang,
}) {
  const [range, setRange] = useState("5y");
  const [detail, setDetail] = useState(null);
  const headerOffset = useHeaderOffset();
  const navRef = useRef(null);

  // On narrow screens the tab bar scrolls sideways: keep the active tab visible.
  useEffect(() => {
    const strip = navRef.current;
    const active = strip && strip.querySelector('[aria-current="page"]');
    if (!active) return;
    const left = active.offsetLeft - strip.offsetLeft;
    if (
      left < strip.scrollLeft ||
      left + active.offsetWidth > strip.scrollLeft + strip.clientWidth
    ) {
      strip.scrollLeft = Math.max(0, left - 16);
    }
  }, [tab]);
  const showRange = Boolean(board) && tab !== "method";
  const page = board
    ? board.fixed.pages.find((item) => item.key === tab)
    : null;

  return (
    <div className={styles.board} lang={lang}>
      <div className={styles.mast}>
        <div className={`${styles.wrap} ${styles.mastInner}`}>
          <div className={styles.mastId}>
            <p className={styles.mastEyebrow}>
              Caribbean Business
              <span className={styles.beta} title={L(UI.betaTitle, lang)}>
                {L(UI.beta, lang)}
              </span>
            </p>
            <h1 className={styles.mastTitle}>
              The Great Puerto Rico Dashboard
            </h1>
            <p className={styles.mastTag}>{L(UI.tagline, lang)}</p>
          </div>
          <div className={styles.mastTools}>
            <div
              className={styles.seg}
              role="group"
              aria-label={L(UI.langGroup, lang)}
            >
              <button
                type="button"
                lang="es"
                aria-pressed={lang === "es"}
                onClick={() => onLang("es")}
              >
                ES
              </button>
              <button
                type="button"
                lang="en"
                aria-pressed={lang === "en"}
                onClick={() => onLang("en")}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav
        className={styles.nav}
        style={{ top: headerOffset }}
        aria-label={L(UI.tabsLabel, lang)}
      >
        <div className={`${styles.wrap} ${styles.navBar}`}>
          <div className={styles.navInner} ref={navRef}>
            {TABS.map(({ key }) => (
              <button
                key={key}
                type="button"
                aria-current={tab === key ? "page" : undefined}
                onClick={() => onTab(key)}
              >
                {L(UI.tabs[key], lang)}
              </button>
            ))}
          </div>
          {showRange && (
            <RangeControl
              range={range}
              onRange={setRange}
              lang={lang}
              id="board-range-nav"
              className={styles.rangeNav}
            />
          )}
        </div>
      </nav>

      <main className={`${styles.wrap} ${styles.main}`}>
        {status === "loading" && <BoardSkeleton lang={lang} />}

        {status === "unauthenticated" && (
          <GateState
            lang={lang}
            sessionExpired={sessionExpired}
            onLogin={onLogin}
          />
        )}

        {status === "error" && <ErrorState lang={lang} onRetry={onRetry} />}

        {board && (
          <>
            <div className={styles.legendBar}>
              <p className={styles.legendTitle}>
                <strong>{L(UI.legendTitle, lang)}</strong>
                <span>{L(UI.legendLine, lang)}</span>
              </p>
              <p className={`${styles.prov} ${styles.provLive}`}>
                <span className={styles.provDot} aria-hidden="true" />
                <span className={styles.provText}>
                  <b>{L(UI.origin.live, lang)}</b>{" "}
                  <span className={styles.legendText}>
                    {L(UI.legendLive, lang)}
                  </span>
                </span>
              </p>
              <p className={`${styles.prov} ${styles.provFixed}`}>
                <span className={styles.provDot} aria-hidden="true" />
                <span className={styles.provText}>
                  <b>{L(UI.origin.fixed, lang)}</b>{" "}
                  <span className={styles.legendText}>
                    {fill(L(UI.legendFixed, lang), {
                      date: formatDay(board.collectedOn, lang),
                    })}
                  </span>
                </span>
              </p>
            </div>

            {showRange && (
              <RangeControl
                range={range}
                onRange={setRange}
                lang={lang}
                id="board-range-inline"
                className={styles.rangeInline}
              />
            )}

            {tab === "method" ? (
              <MethodologyTab board={board} lang={lang} />
            ) : (
              page && (
                <BoardTab
                  board={board}
                  page={page}
                  lang={lang}
                  range={range}
                  onOpen={setDetail}
                />
              )
            )}
          </>
        )}
      </main>

      {board && (
        <div className={styles.wrap}>
          <footer className={styles.pageFoot}>
            <p>
              {fill(L(UI.footer, lang), {
                date: formatDay(board.collectedOn, lang),
              })}
            </p>
          </footer>
        </div>
      )}

      {board && detail && (
        <DetailDialog
          board={board}
          chartId={detail}
          lang={lang}
          range={range}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
