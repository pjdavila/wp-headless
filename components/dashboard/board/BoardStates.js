import { L } from "../../../lib/economy/board/format";
import { UI } from "../../../lib/economy/board/i18n";
import styles from "../../../styles/dashboard-board.module.css";

/** Placeholder shapes of a tab (brief, KPI row, two chart rows) while loading. */
export function BoardSkeleton({ lang }) {
  return (
    <div className={styles.skeleton} role="status" aria-live="polite">
      <span className={styles.srOnly}>{L(UI.states.loading, lang)}</span>
      <div className={styles.lede} aria-hidden="true">
        <div className={styles.skelBrief}>
          <span className={styles.skel} style={{ width: 90, height: 14 }} />
          <span className={styles.skel} style={{ width: "88%", height: 30 }} />
          <span className={styles.skel} style={{ width: "62%", height: 30 }} />
          <span className={styles.skel} style={{ width: "100%", height: 14 }} />
          <span className={styles.skel} style={{ width: "96%", height: 14 }} />
          <span className={styles.skel} style={{ width: "80%", height: 14 }} />
        </div>
        <div className={`${styles.panel} ${styles.skelPanel}`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={styles.skel}
              style={{ width: `${92 - i * 9}%`, height: 14 }}
            />
          ))}
        </div>
      </div>
      <div className={`${styles.tiles} ${styles.n10}`} aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <div className={styles.tile} key={i}>
            <span
              className={styles.skel}
              style={{ width: "70%", height: 12 }}
            />
            <span
              className={styles.skel}
              style={{ width: "50%", height: 26 }}
            />
            <span
              className={styles.skel}
              style={{ width: "80%", height: 12 }}
            />
            <span
              className={styles.skel}
              style={{ width: "100%", height: 28 }}
            />
          </div>
        ))}
      </div>
      <div className={styles.cgrid} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className={`${styles.panel} ${styles.skelCard}`} key={i}>
            <span
              className={styles.skel}
              style={{ width: "55%", height: 18 }}
            />
            <span
              className={styles.skel}
              style={{ width: "35%", height: 12 }}
            />
            <span className={`${styles.skel} ${styles.skelPlot}`} />
            <span
              className={styles.skel}
              style={{ width: "45%", height: 12 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StateIcon({ kind }) {
  const path =
    kind === "lock"
      ? "M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-7A1.5 1.5 0 0 1 5.5 11Z"
      : "M12 8v5m0 3.2v.1M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z";
  return (
    <span className={styles.stateIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" focusable="false">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Login gate (no session, or the session expired). No figures. */
export function GateState({ lang, sessionExpired, onLogin }) {
  return (
    <section className={styles.stateBlock} aria-labelledby="board-gate-title">
      <StateIcon kind="lock" />
      <p className={styles.eyebrow}>{L(UI.states.gateEyebrow, lang)}</p>
      <h2 className={styles.stateTitle} id="board-gate-title">
        {L(UI.states.gateTitle, lang)}
      </h2>
      <p className={styles.stateText}>
        {sessionExpired
          ? L(UI.states.expiredText, lang)
          : L(UI.states.gateText, lang)}
      </p>
      <button type="button" className={styles.btnPrimary} onClick={onLogin}>
        {L(UI.states.login, lang)}
      </button>
    </section>
  );
}

/** Network / server failure, with a retry. */
export function ErrorState({ lang, onRetry }) {
  return (
    <section
      className={`${styles.stateBlock} ${styles.stateError}`}
      role="alert"
      aria-labelledby="board-error-title"
    >
      <StateIcon kind="alert" />
      <h2 className={styles.stateTitle} id="board-error-title">
        {L(UI.states.errorTitle, lang)}
      </h2>
      <p className={styles.stateText}>{L(UI.states.errorText, lang)}</p>
      <button type="button" className={styles.btnPrimary} onClick={onRetry}>
        {L(UI.states.retry, lang)}
      </button>
    </section>
  );
}
