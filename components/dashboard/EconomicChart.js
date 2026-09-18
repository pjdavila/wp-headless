import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer,
]);

/**
 * The interactive historical chart. Loaded exclusively via next/dynamic
 * (ssr: false) from ChartPanel, so the ECharts bundle never blocks first
 * paint. Colors follow the site's CSS variables and update live when the
 * theme toggles; the ARIA component plus ChartPanel's text summary keep it
 * accessible without relying on color.
 */
export default function EconomicChart({ title, points, formatY }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;

    const css = getComputedStyle(document.documentElement);
    const token = (name, fallback) => {
      const raw = css.getPropertyValue(name).trim();
      return raw ? `hsl(${raw})` : fallback;
    };

    const render = () => {
      chart.setOption(
        {
          animation: false,
          aria: {
            enabled: true,
            decal: { show: true },
            label: { description: title },
          },
          grid: {
            left: 8,
            right: 12,
            top: 16,
            bottom: 24,
            outerBoundsMode: "same",
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: token("--card", "#fff"),
            borderColor: token("--border", "#ddd"),
            textStyle: { color: token("--foreground", "#111") },
            valueFormatter: (value) => formatY(value),
          },
          xAxis: {
            type: "time",
            axisLine: { lineStyle: { color: token("--border", "#ddd") } },
            axisLabel: { color: token("--muted-foreground", "#777") },
            splitLine: { show: false },
          },
          yAxis: {
            type: "value",
            scale: true,
            axisLabel: {
              color: token("--muted-foreground", "#777"),
              formatter: (value) => formatY(value),
            },
            splitLine: { lineStyle: { color: token("--border", "#eee") } },
          },
          series: [
            {
              name: title,
              type: "line",
              showSymbol: true,
              symbolSize: 4,
              data: points.map((point) => [point.date, point.value]),
              lineStyle: { width: 2, color: token("--primary", "#2e9e6b") },
              itemStyle: { color: token("--primary", "#2e9e6b") },
              areaStyle: {
                color: token("--primary", "#2e9e6b"),
                opacity: 0.08,
              },
            },
          ],
        },
        { notMerge: true },
      );
    };

    render();

    // Repaint colors when the dark/light class flips on <html>.
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [points, title, formatY]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={title}
      style={{ width: "100%", height: 360 }}
    />
  );
}
