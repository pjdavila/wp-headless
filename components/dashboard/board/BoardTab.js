import { useMemo } from "react";
import ChartCard from "./ChartCard";
import Tile from "./Tile";
import { Brief, Pipeline, SidePanel } from "./LedeBlocks";
import { newerLiveTiles, resolveTile } from "../../../lib/economy/board/model";
import { L } from "../../../lib/economy/board/format";
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

/** One content tab (Pulso, Ciencias vivas, …) built from its page config. */
export default function BoardTab({ board, page, lang, range, onOpen }) {
  const { fixed } = board;
  const newer = useMemo(
    () => newerLiveTiles(board, page.tiles.set, lang),
    [board, page.tiles.set, lang],
  );
  return (
    <>
      <div className={styles.lede}>
        <Brief
          brief={fixed.briefs[page.key]}
          lang={lang}
          collectedOn={board.collectedOn}
          newer={newer}
        />
        <SidePanel panel={page.panel} board={board} lang={lang} />
      </div>

      <Tiles
        board={board}
        set={page.tiles.set}
        cls={page.tiles.cls}
        lang={lang}
        onOpen={onOpen}
      />

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
                <p key={key} className={styles.blockLabel}>
                  <span>{L(block.text, lang)}</span>
                </p>
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
