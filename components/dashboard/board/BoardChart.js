import { useMemo, useRef, useState } from "react";
import useElementWidth from "./useElementWidth";
import { fmt, axisFmt, L } from "../../../lib/economy/board/format";
import { UI } from "../../../lib/economy/board/i18n";
import styles from "../../../styles/dashboard-board.module.css";

/**
 * Plain-SVG chart ported from "The Great Puerto Rico Dashboard" prototype:
 * line, column (signed, grouped or stacked), fiscal/calendar-year overlay and
 * horizontal bars. Hover shows a tooltip; when focused, ←/→ (or ↑/↓ for
 * horizontal bars) step through the points and Esc hides the tooltip.
 */

const v = (name) => `var(${name})`;

function ticks(min, max, n) {
  const span = max - min || Math.abs(max) || 1;
  const s0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(s0));
  const nm = s0 / mag;
  const step = (nm < 1.5 ? 1 : nm < 3 ? 2 : nm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let t = lo; t <= hi + step * 1e-6; t += step)
    out.push(Number(t.toFixed(10)));
  return out;
}

function roundedBar(x, top, bw, h, r, up, rounded) {
  if (!rounded) return `M${x} ${top}H${x + bw}V${top + h}H${x}Z`;
  return up
    ? `M${x} ${top + h}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + bw - r}Q${x + bw} ${top} ${x + bw} ${top + r}V${top + h}Z`
    : `M${x} ${top}V${top + h - r}Q${x} ${top + h} ${x + r} ${top + h}H${x + bw - r}Q${x + bw} ${top + h} ${x + bw} ${top + h - r}V${top}Z`;
}

function useGeometry(model, width, big, lang) {
  return useMemo(() => {
    if (!width || !model || model.empty) return null;
    const { spec } = model;
    const W = Math.max(260, width);
    const isLine = spec.kind === "line" || model.line;
    const stacked = Boolean(spec.stacked);
    const n = model.cats.length;
    const H = big ? 340 : spec.h || 230;

    let lo = Infinity;
    let hi = -Infinity;
    if (stacked) {
      for (let i = 0; i < n; i += 1) {
        let total = 0;
        for (const s of model.series) total += s.vals[i] || 0;
        hi = Math.max(hi, total);
      }
      lo = 0;
    } else {
      for (const s of model.series)
        for (const val of s.vals)
          if (val != null) {
            lo = Math.min(lo, val);
            hi = Math.max(hi, val);
          }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    if (!isLine || spec.signed) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
    } else {
      const pad = (hi - lo) * 0.08 || 1;
      lo -= pad;
      hi += pad;
      const minVal = Math.min(
        ...model.series.flatMap((s) => s.vals.filter((val) => val != null)),
      );
      if (lo < 0 && minVal >= 0) lo = 0;
    }
    const tk = ticks(lo, hi, 4);
    lo = tk[0];
    hi = tk[tk.length - 1];
    const labels = tk.map((t) => axisFmt(t, spec.fmt, lang));
    const ml = Math.max(...labels.map((s) => s.length)) * 6.4 + 12;
    const endLabels = isLine && model.series.length <= 4;
    const mr = endLabels ? 58 : 10;
    const mt = 12;
    const mb = 26;
    const pw = W - ml - mr;
    const ph = H - mt - mb;
    const X = (i) =>
      isLine
        ? ml + (n === 1 ? pw / 2 : (pw * i) / (n - 1))
        : ml + (pw * (i + 0.5)) / n;
    const Y = (val) => mt + ph * (1 - (val - lo) / (hi - lo || 1));

    // x tick labels
    const maxT = Math.max(2, Math.floor(pw / (model.cat ? 46 : 64)));
    const stepT = Math.max(1, Math.ceil(n / maxT));
    let xTicks = [];
    if (!model.cat && /^\d{4}-\d{2}$/.test(String(model.keys[0])) && n > 18) {
      const years = model.keys
        .map((k, i) => [k, i])
        .filter(([k]) => String(k).endsWith("-01"));
      const ys = Math.max(1, Math.ceil(years.length / maxT));
      xTicks = years
        .filter((_, j) => j % ys === 0)
        .map(([k, i]) => [i, String(k).slice(0, 4)]);
    } else {
      for (let i = (n - 1) % stepT; i < n; i += stepT)
        xTicks.push([i, model.cats[i]]);
    }

    return {
      W,
      H,
      isLine,
      stacked,
      n,
      lo,
      hi,
      tk,
      labels,
      ml,
      mr,
      mt,
      mb,
      pw,
      ph,
      X,
      Y,
      xTicks,
      endLabels,
    };
  }, [model, width, big, lang]);
}

function Tooltip({ head, rows, left, right, top }) {
  return (
    <div
      className={styles.tip}
      style={{
        left: left != null ? left : undefined,
        right: right != null ? right : undefined,
        top,
      }}
      role="status"
      aria-live="polite"
    >
      <div className={styles.tipHead}>{head}</div>
      {rows.map((row) => (
        <div className={styles.tipRow} key={row.name || "v"}>
          {row.name ? (
            <span>
              <i style={{ background: v(row.color) }} />
              {row.name}
            </span>
          ) : (
            <span />
          )}
          <b>{row.value}</b>
        </div>
      ))}
    </div>
  );
}

function XYChart({ model, geo, lang, label }) {
  const { spec } = model;
  const {
    W,
    H,
    isLine,
    stacked,
    n,
    tk,
    labels,
    ml,
    mt,
    pw,
    ph,
    X,
    Y,
    xTicks,
    endLabels,
  } = geo;
  const [cur, setCur] = useState(-1);
  const svgRef = useRef(null);

  const show = (i) => setCur(Math.max(0, Math.min(n - 1, i)));
  const hide = () => setCur(-1);

  const onPointerMove = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) * W) / rect.width;
    show(
      Math.round(
        isLine ? ((px - ml) / pw) * (n - 1) : ((px - ml) / pw) * n - 0.5,
      ),
    );
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      show((cur < 0 ? n : cur) - 1);
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      show(cur < 0 ? n - 1 : cur + 1);
      event.preventDefault();
    } else if (event.key === "Escape") {
      hide();
    }
  };
  const onFocus = (event) => {
    let visible = true;
    try {
      visible = event.currentTarget.matches(":focus-visible");
    } catch {
      visible = true;
    }
    if (visible) show(n - 1);
  };

  const marks = [];
  if (isLine) {
    model.series.forEach((s, si) => {
      let d = "";
      let pen = false;
      s.vals.forEach((val, i) => {
        if (val == null) {
          pen = false;
          return;
        }
        d += `${pen ? "L" : "M"}${X(i).toFixed(1)} ${Y(val).toFixed(1)}`;
        pen = true;
      });
      if (model.series.length === 1) {
        let first = -1;
        let last = -1;
        s.vals.forEach((val, i) => {
          if (val != null) {
            if (first < 0) first = i;
            last = i;
          }
        });
        if (last > first && !s.vals.slice(first, last).includes(null)) {
          marks.push(
            <path
              key={`area-${si}`}
              d={`${d}L${X(last)} ${Y(geo.lo)}L${X(first)} ${Y(geo.lo)}Z`}
              style={{ fill: v(s.color), fillOpacity: 0.1 }}
              stroke="none"
            />,
          );
        }
      }
      marks.push(
        <path
          key={`line-${si}`}
          d={d}
          fill="none"
          style={{ stroke: v(s.color) }}
          strokeWidth={model.line && !s.emph ? 1.6 : 2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />,
      );
    });
    const ends = model.series
      .map((s) => {
        let li = -1;
        s.vals.forEach((val, i) => {
          if (val != null) li = i;
        });
        return li < 0 ? null : { s, i: li, y: Y(s.vals[li]), v: s.vals[li] };
      })
      .filter(Boolean);
    let clash = false;
    for (let a = 0; a < ends.length; a += 1)
      for (let b = a + 1; b < ends.length; b += 1)
        if (Math.abs(ends[a].y - ends[b].y) < 13) clash = true;
    ends.forEach((e, ei) => {
      marks.push(
        <circle
          key={`end-${ei}`}
          cx={X(e.i)}
          cy={e.y}
          r="4"
          style={{ fill: v(e.s.color), stroke: v("--surface") }}
          strokeWidth="2"
        />,
      );
      if (endLabels && (!clash || e.s.emph || ends.length === 1)) {
        marks.push(
          <text
            key={`endl-${ei}`}
            x={X(e.i) + 8}
            y={e.y + 4}
            fontSize="11.5"
            fontWeight="600"
            style={{ fill: v("--ink") }}
          >
            {fmt(e.v, spec.fmt, lang)}
          </text>,
        );
      }
    });
  } else {
    const band = pw / n;
    const k = stacked ? 1 : model.series.length;
    const bw = Math.max(
      2,
      Math.min(24, (band - Math.min(8, band * 0.3)) / k - (k > 1 ? 2 : 0)),
    );
    for (let i = 0; i < n; i += 1) {
      let acc = 0;
      const isProj = model.proj && model.proj.includes(model.keys[i]);
      model.series.forEach((s, j) => {
        const val = s.vals[i];
        if (val == null) return;
        const x = stacked
          ? X(i) - bw / 2
          : X(i) - (k * bw + (k - 1) * 2) / 2 + j * (bw + 2);
        let y0;
        let y1;
        if (stacked) {
          y0 = Y(acc);
          acc += val;
          y1 = Y(acc);
        } else {
          y0 = Y(0);
          y1 = Y(val);
        }
        const top = Math.min(y0, y1);
        const h = Math.max(1, Math.abs(y1 - y0) - (stacked ? 2 : 0));
        const r = Math.min(4, bw / 2, h);
        const up = val >= 0;
        const isLast =
          !stacked ||
          j === model.series.length - 1 ||
          model.series.slice(j + 1).every((z) => !z.vals[i]);
        const color = spec.signed && val < 0 ? "--neg" : s.color;
        marks.push(
          <path
            key={`bar-${i}-${j}`}
            d={roundedBar(x, top, bw, h, r, up, isLast)}
            style={{ fill: v(color), fillOpacity: isProj ? 0.38 : 1 }}
          />,
        );
        const text = fmt(val, spec.fmt, lang);
        if (
          !stacked &&
          k === 1 &&
          n <= 12 &&
          bw >= 14 &&
          text.length * 6.6 < band - 2
        ) {
          marks.push(
            <text
              key={`barl-${i}-${j}`}
              x={X(i)}
              y={up ? top - 5 : top + h + 13}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              style={{ fill: v("--ink") }}
            >
              {text}
            </text>,
          );
        }
      });
    }
  }

  let tooltip = null;
  if (cur >= 0) {
    const x = X(cur);
    let head = model.full ? model.full[cur] : model.cats[cur];
    if (model.proj && model.proj.includes(model.keys[cur])) {
      head += ` · ${L(UI.projection, lang)}`;
    }
    const rows = model.series
      .filter((s) => s.vals[cur] != null)
      .map((s) => ({
        name: s.name,
        color: spec.signed && s.vals[cur] < 0 ? "--neg" : s.color,
        value: fmt(s.vals[cur], spec.fmt, lang),
      }));
    const flip = x + 12 + 200 > W;
    tooltip = (
      <Tooltip
        head={head}
        rows={rows}
        left={flip ? null : x + 12}
        right={flip ? W - x + 12 : null}
        top={mt}
      />
    );
  }

  const cx = cur >= 0 ? X(cur) : 0;

  return (
    <div
      className={styles.plotInner}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={hide}
      aria-label={label}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        height={H}
        role="img"
        aria-label={label}
      >
        {tk.map((t, i) => (
          <g key={`tick-${t}`}>
            <line
              x1={ml}
              x2={ml + pw}
              y1={Y(t)}
              y2={Y(t)}
              style={{ stroke: v(t === 0 ? "--axis" : "--grid") }}
              strokeWidth="1"
            />
            <text
              x={ml - 8}
              y={Y(t) + 4}
              textAnchor="end"
              fontSize="11"
              style={{ fill: v("--muted"), fontVariantNumeric: "tabular-nums" }}
            >
              {labels[i]}
            </text>
          </g>
        ))}
        {xTicks.map(([i, text]) => (
          <text
            key={`x-${i}`}
            x={X(i)}
            y={H - 7}
            textAnchor="middle"
            fontSize="11"
            style={{ fill: v("--muted") }}
          >
            {text}
          </text>
        ))}
        {marks}
        {cur >= 0 && (
          <>
            <line
              x1={cx}
              x2={cx}
              y1={mt}
              y2={mt + ph}
              style={{ stroke: v("--ink2") }}
              strokeWidth="1"
            />
            {isLine &&
              model.series.map((s, si) =>
                s.vals[cur] == null ? null : (
                  <circle
                    key={`hd-${si}`}
                    cx={cx}
                    cy={Y(s.vals[cur])}
                    r="4"
                    style={{ fill: v(s.color), stroke: v("--surface") }}
                    strokeWidth="2"
                  />
                ),
              )}
          </>
        )}
        <rect
          x={ml}
          y={mt}
          width={pw}
          height={ph}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={hide}
        />
      </svg>
      {tooltip}
    </div>
  );
}

function HBarChart({ model, width, lang, label }) {
  const { spec } = model;
  const [cur, setCur] = useState(-1);
  const W = Math.max(260, width);
  const n = model.cats.length;
  const rowH = 30;
  const vals = model.series[0].vals;
  const max = Math.max(...vals);
  const labW = Math.min(
    W * 0.46,
    Math.max(...model.cats.map((c) => c.length)) * 6.6 + 10,
  );
  const valW =
    Math.max(...vals.map((val) => fmt(val, spec.fmt, lang).length)) * 7 + 10;
  const pw = W - labW - valW;
  const H = n * rowH + 6;
  const maxCh = Math.floor(labW / 6.4);

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      setCur((c) => Math.min(n - 1, c + 1));
      event.preventDefault();
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      setCur((c) => Math.max(0, (c < 0 ? n : c) - 1));
      event.preventDefault();
    } else if (event.key === "Escape") {
      setCur(-1);
    }
  };

  return (
    <div
      className={styles.plotInner}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => setCur(-1)}
      aria-label={label}
    >
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label={label}>
        <line
          x1={labW}
          x2={labW}
          y1="0"
          y2={H}
          style={{ stroke: v("--axis") }}
          strokeWidth="1"
        />
        {vals.map((val, i) => {
          const y = i * rowH + 8;
          const w = Math.max(2, (pw * val) / (max || 1));
          const h = 14;
          const r = Math.min(4, w);
          let text = model.cats[i];
          if (text.length > maxCh) text = `${text.slice(0, maxCh - 1)}…`;
          return (
            <g key={model.keys[i]}>
              <text
                x={labW - 8}
                y={y + 11}
                textAnchor="end"
                fontSize="12"
                style={{ fill: v("--ink2") }}
              >
                {text}
              </text>
              <path
                d={`M${labW} ${y}H${labW + w - r}Q${labW + w} ${y} ${labW + w} ${y + r}V${y + h - r}Q${labW + w} ${y + h} ${labW + w - r} ${y + h}H${labW}Z`}
                style={{ fill: v(i === cur ? "--accent" : "--s1") }}
              />
              <text
                x={labW + w + 6}
                y={y + 11}
                fontSize="12"
                fontWeight="600"
                style={{ fill: v("--ink"), fontVariantNumeric: "tabular-nums" }}
              >
                {fmt(val, spec.fmt, lang)}
              </text>
              <rect
                x="0"
                y={i * rowH}
                width={W}
                height={rowH}
                fill="transparent"
                onPointerMove={() => setCur(i)}
                onPointerLeave={() => setCur(-1)}
              />
            </g>
          );
        })}
      </svg>
      {cur >= 0 && (
        <Tooltip
          head={model.cats[cur]}
          rows={[
            { name: "", color: "--s1", value: fmt(vals[cur], spec.fmt, lang) },
          ]}
          left={Math.max(0, Math.min(W - 160, labW + 10))}
          top={cur * rowH + rowH - 2}
        />
      )}
    </div>
  );
}

export default function BoardChart({ model, lang, big = false }) {
  const hostRef = useRef(null);
  const width = useElementWidth(hostRef);
  const geo = useGeometry(
    model.spec.kind === "hbar" ? null : model,
    width,
    big,
    lang,
  );
  const label = model.title;
  const minHeight = big ? 340 : model.spec.h || 230;

  return (
    <div
      ref={hostRef}
      className={styles.plot}
      style={{ minHeight: model.spec.kind === "hbar" ? 60 : minHeight }}
    >
      {width > 0 && model.spec.kind === "hbar" && (
        <HBarChart model={model} width={width} lang={lang} label={label} />
      )}
      {width > 0 && geo && (
        <XYChart
          key={`${model.keys.length}-${model.series.length}`}
          model={model}
          geo={geo}
          lang={lang}
          label={label}
        />
      )}
    </div>
  );
}
