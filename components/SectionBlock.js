import Link from "next/link";
import StoryCard from "./StoryCard";
import MobileBanner from "./ads/MobileBanner";
import styles from "../styles/section-block.module.css";

export default function SectionBlock({ title, categoryUri, posts }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {categoryUri && (
          <Link href={categoryUri} className={styles.viewMore}>
            View more →
          </Link>
        )}
      </div>
      <div className={styles.grid}>
        {posts.map((post) => (
          <StoryCard key={post.id} post={post} />
        ))}
      </div>
      <MobileBanner />
    </section>
  );
}
