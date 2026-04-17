import styles from "../styles/latest-news.module.css";

const VIEWS = [
  {
    key: "grid",
    label: "Grid",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="1" y="1" width="4" height="4" rx="1" />
        <rect x="6" y="1" width="4" height="4" rx="1" />
        <rect x="11" y="1" width="4" height="4" rx="1" />
        <rect x="1" y="6" width="4" height="4" rx="1" />
        <rect x="6" y="6" width="4" height="4" rx="1" />
        <rect x="11" y="6" width="4" height="4" rx="1" />
        <rect x="1" y="11" width="4" height="4" rx="1" />
        <rect x="6" y="11" width="4" height="4" rx="1" />
        <rect x="11" y="11" width="4" height="4" rx="1" />
      </svg>
    ),
  },
  {
    key: "list",
    label: "List",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="1" y="2" width="14" height="3" rx="1" />
        <rect x="1" y="6.5" width="14" height="3" rx="1" />
        <rect x="1" y="11" width="14" height="3" rx="1" />
      </svg>
    ),
  },
  {
    key: "magazine",
    label: "Magazine",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="1" y="1" width="14" height="7" rx="1" />
        <rect x="1" y="9" width="6.5" height="6" rx="1" />
        <rect x="8.5" y="9" width="6.5" height="6" rx="1" />
      </svg>
    ),
  },
];

export default function LatestNewsToolbar({ view, onChange }) {
  return (
    <div className={styles.viewSwitcher} role="tablist" aria-label="Select view">
      {VIEWS.map((v) => {
        const active = view === v.key;
        return (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.viewBtn} ${active ? styles.viewBtnActive : ""}`}
            onClick={() => onChange(v.key)}
          >
            {v.icon}
            <span className={styles.viewBtnLabel}>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
