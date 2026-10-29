import { useEffect, useRef, useState } from "react";
import BoardTab from "./BoardTab";
import MethodologyTab from "./MethodologyTab";
import DetailDialog from "./DetailDialog";
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
  const page = board
    ? board.fixed.pages.find((item) => item.key === tab)
    : null;

  return (
    <div className={styles.board} lang={lang}>
      <div className={styles.mast}>
        <div className={`${styles.wrap} ${styles.mastInner}`}>
          <div className={styles.mastId}>
            <h1 className={styles.mastTitle}>
              The Great Puerto Rico Dashboard
            </h1>
            <p className={styles.mastTag}>{L(UI.tagline, lang)}</p>
          </div>
          <div className={styles.mastTools}>
            <span className={styles.pill}>
              <small>{L(UI.prototype, lang)}</small>
              <span>
                v{board ? board.fixed.version : "0.1"}
                {board ? ` · ${formatDay(board.collectedOn, lang)}` : ""}
              </span>
            </span>
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
        <div className={`${styles.wrap} ${styles.navInner}`} ref={navRef}>
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
      </nav>

      <main className={`${styles.wrap} ${styles.main}`}>
        {status === "loading" && (
          <div className={styles.stateBlock} role="status" aria-live="polite">
            <p className={styles.stateTitle}>{L(UI.states.loading, lang)}</p>
          </div>
        )}

        {status === "unauthenticated" && (
          <div className={styles.stateBlock}>
            <h2 className={styles.stateTitle}>
              {L(UI.states.gateTitle, lang)}
            </h2>
            <p className={styles.stateText}>
              {sessionExpired
                ? L(UI.states.expiredText, lang)
                : L(UI.states.gateText, lang)}
            </p>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onLogin}
            >
              {L(UI.states.login, lang)}
            </button>
          </div>
        )}

        {status === "error" && (
          <div className={styles.stateBlock} role="alert">
            <h2 className={styles.stateTitle}>
              {L(UI.states.errorTitle, lang)}
            </h2>
            <p className={styles.stateText}>{L(UI.states.errorText, lang)}</p>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onRetry}
            >
              {L(UI.states.retry, lang)}
            </button>
          </div>
        )}

        {board && (
          <>
            <div className={styles.legendBar}>
              <strong>{L(UI.legendTitle, lang)}</strong>
              <span>
                <span className={`${styles.origin} ${styles.originLive}`}>
                  {L(UI.origin.live, lang)}
                </span>
                {L(UI.legendLive, lang)}
              </span>
              <span>
                <span className={`${styles.origin} ${styles.originFixed}`}>
                  {L(UI.origin.fixed, lang)}
                </span>
                {fill(L(UI.legendFixed, lang), {
                  date: formatDay(board.collectedOn, lang),
                })}
              </span>
            </div>

            {tab === "method" ? (
              <MethodologyTab board={board} lang={lang} />
            ) : (
              page && (
                <BoardTab
                  board={board}
                  page={page}
                  lang={lang}
                  range={range}
                  onRange={setRange}
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
