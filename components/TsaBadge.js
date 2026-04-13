import style from "../styles/tsa-badge.module.css";

function BankIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={style.icon}
    >
      <polygon points="12 2 2 7 22 7" />
      <rect x="4" y="10" width="3" height="8" rx="0.5" />
      <rect x="10.5" y="10" width="3" height="8" rx="0.5" />
      <rect x="17" y="10" width="3" height="8" rx="0.5" />
      <line x1="1" y1="22" x2="23" y2="22" />
      <line x1="1" y1="7" x2="23" y2="7" />
    </svg>
  );
}

export default function TsaBadge() {
  return (
    <div className={style.badge}>
      <BankIcon />
      <div className={style.info}>
        <span className={style.label}>TSA</span>
        <span className={style.value}>$10.0B</span>
      </div>
    </div>
  );
}
