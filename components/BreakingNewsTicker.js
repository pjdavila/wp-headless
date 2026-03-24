import { gql, useQuery } from "@apollo/client";
import Link from "next/link";
import styles from "../styles/breaking-news-ticker.module.css";

const LATEST_POSTS_QUERY = gql`
  query GetLatestPostsForTicker {
    posts(first: 5, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        uri
      }
    }
  }
`;

export default function BreakingNewsTicker() {
  const { data } = useQuery(LATEST_POSTS_QUERY);
  const posts = data?.posts?.nodes || [];

  if (posts.length === 0) return null;

  const doubled = [...posts, ...posts];

  return (
    <div className={styles.wrapper}>
      <div className={styles.badge}>ÚLTIMA HORA</div>
      <div className={styles.trackContainer}>
        <div className={styles.track}>
          {doubled.map((post, i) => (
            <Link key={`${post.id}-${i}`} href={post.uri} className={styles.item}>
              <span className={styles.dot}>●</span>
              <span className={styles.title}>{post.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
