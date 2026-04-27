import { useEffect, useRef, useState } from "react";
import styles from "../styles/coming-soon.module.css";

const TARGET = new Date("2026-05-07T00:00:00-04:00").getTime();

function getRemaining() {
  const diff = TARGET - Date.now();
  if (diff <= 0) {
    return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { done: false, days, hours, minutes, seconds };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function DigitCell({ digit }) {
  const tickRef = useRef(0);
  const prevRef = useRef(digit);
  if (prevRef.current !== digit) {
    prevRef.current = digit;
    tickRef.current += 1;
  }
  return (
    <div className={styles.digitCell}>
      <span key={tickRef.current} className={styles.digitInner}>
        {digit}
      </span>
    </div>
  );
}

function DigitGroup({ value }) {
  const digits = pad(value).split("");
  return (
    <div className={styles.digitGroup}>
      {digits.map((d, i) => (
        <DigitCell key={i} digit={d} />
      ))}
    </div>
  );
}

export default function Countdown() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(getRemaining());
    const id = setInterval(() => {
      setTime(getRemaining());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) {
    return <div className={styles.countdown} aria-hidden="true" />;
  }

  if (time.done) {
    return (
      <div className={styles.countdownDone} role="status">
        The summit is here!
      </div>
    );
  }

  const units = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Minutes", value: time.minutes },
    { label: "Seconds", value: time.seconds },
  ];

  return (
    <div
      className={styles.countdown}
      role="timer"
      aria-label={`${time.days} days, ${time.hours} hours, ${time.minutes} minutes, ${time.seconds} seconds until the Caribbean Business Summit`}
    >
      {units.map((u) => (
        <div key={u.label} className={styles.unit}>
          <DigitGroup value={u.value} />
          <span className={styles.unitLabel}>{u.label}</span>
        </div>
      ))}
    </div>
  );
}
