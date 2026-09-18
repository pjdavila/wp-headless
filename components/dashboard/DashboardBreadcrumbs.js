import Link from "next/link";
import styles from "../../styles/dashboard.module.css";

/**
 * Breadcrumb trail for dashboard pages. `items` is ordered root → leaf; the
 * last item is the current page (plain text, aria-current="page").
 */
export default function DashboardBreadcrumbs({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <nav className={styles.breadcrumbs} aria-label="Ruta de navegación">
      <ol className={styles.breadcrumbsList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={styles.breadcrumbsItem}>
              {isLast || !item.href ? (
                <span aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className={styles.breadcrumbsLink}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
