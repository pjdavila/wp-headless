import Link from "next/link";
import { SECTIONS, sectionPath } from "../../lib/economy/sections";
import styles from "../../styles/dashboard.module.css";

/**
 * Economic-section navigation shared across every dashboard page (overview,
 * category and indicator). Horizontally scrollable on small screens; the
 * active section is exposed via aria-current, never color alone.
 */
export default function SectionNav({ active }) {
  return (
    <nav className={styles.sectionNav} aria-label="Secciones del tablero económico">
      <ul className={styles.sectionNavList}>
        {SECTIONS.map((section) => {
          const isActive = section.slug === active;
          return (
            <li key={section.slug}>
              <Link
                href={sectionPath(section.slug)}
                className={`${styles.sectionNavLink} ${
                  isActive ? styles.sectionNavLinkActive : ""
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {section.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
