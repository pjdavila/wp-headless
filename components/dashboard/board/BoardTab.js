import { useMemo } from "react";
import ChartCard from "./ChartCard";
import Tile from "./Tile";
import { Brief, Pipeline, SidePanel } from "./LedeBlocks";
import { resolveTile } from "../../../lib/economy/board/model";
import { L } from "../../../lib/economy/board/format";
import { UI } from "../../../lib/economy/board/i18n";
import styles from "../../../styles/dashboard-board.module.css";

function Tiles({ board, set, cls, lang, onOpen }) {
  const tiles = useMemo(
    () =>
      (board.fixed.tiles[set] || []).map((def) =>
        resolveTile(def, board, lang),
      ),
    [board, set, lang],
  );
  return (
    <div className={`${styles.tiles} ${styles[cls] || ""}`}>
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          lang={lang}
          collectedOn={board.collectedOn}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function RangeRow({ range, onRange, lang }) {
  return (
    <div className={styles.filters}>
      <span
        className={styles.mono}
        style={{ color: "var(--muted)" }}
        id="board-range-label"
      >
        {L(UI.rangeLabel, lang)}
      </span>
      <div
        className={styles.chips}
        role="group"
        aria-labelledby="board-range-label"
      >
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

/** One content tab (Pulso, Ciencias vivas, …) built from its page config. */
export default function BoardTab({
  board,
  page,
  lang,
  range,
  onRange,
  onOpen,
}) {
  const { fixed } = board;
  return (
    <>
      <div className={styles.lede}>
        <Brief brief={fixed.briefs[page.key]} lang={lang} />
        <SidePanel panel={page.panel} board={board} lang={lang} />
      </div>

      <Tiles
        board={board}
        set={page.tiles.set}
        cls={page.tiles.cls}
        lang={lang}
        onOpen={onOpen}
      />

      <RangeRow range={range} onRange={onRange} lang={lang} />

      {page.sections.map((section) => (
        <section className={styles.sec} key={L(section.t, "en")}>
          <header className={styles.secHead}>
            <h2>{L(section.t, lang)}</h2>
            {section.read && <p>{L(section.read, lang)}</p>}
          </header>
          {section.blocks.map((block, index) => {
            const key = `${block.type}-${index}`;
            if (block.type === "grid") {
              return (
                <div
                  key={key}
                  className={`${styles.cgrid} ${block.cls ? styles[block.cls] : ""}`}
                >
                  {block.ids.map((id) => (
                    <ChartCard
                      key={id}
                      board={board}
                      chartId={id}
                      lang={lang}
                      range={range}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              );
            }
            if (block.type === "label") {
              return (
                <div key={key} className={styles.blockLabel}>
                  {L(block.text, lang)}
                </div>
              );
            }
            if (block.type === "tiles") {
              return (
                <Tiles
                  key={key}
                  board={board}
                  set={block.set}
                  cls={block.cls}
                  lang={lang}
                  onOpen={onOpen}
                />
              );
            }
            if (block.type === "pipeline") {
              return <Pipeline key={key} items={fixed.pipeline} lang={lang} />;
            }
            return null;
          })}
        </section>
      ))}
    </>
  );
}
