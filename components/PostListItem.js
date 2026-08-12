import Link from "next/link";
import { FeaturedImage } from "./FeaturedImage";
import AuthorByline from "./AuthorByline";
import styles from "../styles/post-list-item.module.css";

export default function PostListItem({ post }) {
  const { title, excerpt, uri, date } = post;

  return (
    <article className={styles.article}>
      <time className={styles.time} dateTime={post.date}>
        {new Date(date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>

      <h2 className={styles.title}>
        <Link href={uri} title={title} className={styles.link}>
          {title}
        </Link>
      </h2>

      {post.author?.node?.name && (
        <div className={styles.authorRow}>
          <AuthorByline author={post.author} prefix="by " />
        </div>
      )}

      <FeaturedImage
        post={post}
        uri={uri}
        title={title}
      />

      <div
        className={styles.excerpt}
        dangerouslySetInnerHTML={{ __html: excerpt || "" }}
      />

      <Link href={uri} title="Read more" className={styles.readMore}>
        Read more
      </Link>
    </article>
  );
}
