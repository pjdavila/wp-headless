import Image from "next/image";
import Link from "next/link";
import { normalizeImageUrl } from "../lib/normalizeImageUrl";
import { isOptimizableImageUrl, safeImageUrl } from "../lib/imageHosts";
import styles from "../styles/author.module.css";

function initialsFrom(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function MailIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.65h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21H9z" />
    </svg>
  );
}

/**
 * End-of-article author box. Renders photo (or initials avatar), name linked
 * to the author profile page, job title, bio, contact links and an
 * "All articles by X" link.
 *
 * The extra fields (photo, job title, email, LinkedIn) come from the
 * `cb-author-profiles` WordPress plugin via the `profile` prop and may all be
 * null when the plugin is not installed. If there is neither a bio nor a
 * photo nor any contact link, nothing is rendered at all — a name-only box
 * would just duplicate the byline.
 */
export default function AuthorCard({ author, profile }) {
  const name = author?.node?.name;
  const uri = author?.node?.uri;
  if (!name) return null;

  const bio = author?.node?.description?.trim() || "";

  // External photo URLs outside the next/image allowlist fall back to a plain
  // <img> instead of crashing the article page (same rule as the author page).
  const photoUrl = safeImageUrl(normalizeImageUrl(profile?.photoUrl));
  const photoIsOptimizable = isOptimizableImageUrl(photoUrl);
  const jobTitle = profile?.jobTitle || null;
  const publicEmail = profile?.publicEmail || null;
  const linkedinUrl = profile?.linkedinUrl || null;

  if (!bio && !photoUrl && !jobTitle && !publicEmail && !linkedinUrl)
    return null;

  return (
    <aside
      id="author-card"
      className={styles.card}
      aria-label={`About the author, ${name}`}
    >
      <div className={styles.cardAvatarWrap}>
        {photoUrl && photoIsOptimizable ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            sizes="88px"
            className={styles.avatarImg}
          />
        ) : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className={styles.avatarImgRaw}
            loading="lazy"
          />
        ) : (
          <span className={styles.cardInitials} aria-hidden="true">
            {initialsFrom(name)}
          </span>
        )}
      </div>

      <div className={styles.profileBody}>
        <span className={styles.eyebrow}>About the author</span>
        <h2 className={styles.cardName}>
          {uri ? (
            <Link href={uri} className={styles.cardNameLink}>
              {name}
            </Link>
          ) : (
            name
          )}
        </h2>
        {jobTitle && <p className={styles.jobTitle}>{jobTitle}</p>}
        {bio && <p className={styles.cardBio}>{bio}</p>}

        {(publicEmail || linkedinUrl) && (
          <div className={styles.contact}>
            {publicEmail && (
              <a className={styles.contactLink} href={`mailto:${publicEmail}`}>
                <MailIcon />
                {publicEmail}
              </a>
            )}
            {linkedinUrl && (
              <a
                className={styles.contactLink}
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer me"
              >
                <LinkedInIcon />
                LinkedIn
              </a>
            )}
          </div>
        )}

        {uri && (
          <Link href={uri} className={styles.cardMoreLink}>
            All articles by {name} →
          </Link>
        )}
      </div>
    </aside>
  );
}
