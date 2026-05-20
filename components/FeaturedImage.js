import Link from "next/link";
import Image from "next/image";
import { normalizeImageUrl } from "../lib/normalizeImageUrl";
import styles from "../styles/featured-image.module.css";

export function FeaturedImage({
  post,
  uri = false,
  title = "",
}) {
  const src = normalizeImageUrl(post.featuredImage?.node?.sourceUrl);
  if (!src) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      {typeof uri === "string" && uri.trim() !== "" ? (
        <Link href={uri} title={title} className={styles.link}>
          <Image
            src={src}
            alt={post.featuredImage.node.altText || post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.image}
          />
        </Link>
      ) : (
        <Image
          src={src}
          alt={post.featuredImage.node.altText || post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={styles.image}
        />
      )}
    </div>
  );
}
