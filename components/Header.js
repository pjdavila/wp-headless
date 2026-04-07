import { gql } from "@apollo/client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import MarketTicker from "./MarketTicker";
import style from "../styles/header.module.css";

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const SKIP_SLUGS = ["uncategorized", "sin-categoria"];

export default function Header({ siteTitle, siteDescription, menuItems, categories }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const catItems = Array.isArray(categories)
    ? categories.filter((c) => !SKIP_SLUGS.includes(c.slug))
    : [];

  return (
    <>
      <header className={style.header}>
        <MarketTicker />

        <div className={style.logoBar}>
          <div className={`container ${style.logoBarInner}`}>
            <button
              className={style.hamburger}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>

            <Link href="/" className={style.brand}>
              <Image
                src={isDark ? "/logo-dark.webp" : "/logo-light.webp"}
                alt="Caribbean Business"
                width={400}
                height={50}
                className={style.logoImage}
                priority
              />
            </Link>

            <div className={style.rightActions}>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <nav className={style.navBar}>
          <div className={`container ${style.navBarInner}`}>
            <ul className={style.navList}>
              {catItems.map((cat) => (
                <li key={cat.slug}>
                  <Link href={cat.uri} className={style.navLink}>
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className={style.dateBar}>
          <div className={`container ${style.dateBarInner}`}>
            <span className={style.date} suppressHydrationWarning>{getFormattedDate()}</span>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div className={style.overlay} onClick={() => setDrawerOpen(false)} />
          <div className={style.drawer}>
            <div className={style.drawerHeader}>
              <span className={style.drawerTitle}>Menu</span>
              <button
                className={style.drawerClose}
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className={style.drawerNav}>
              {catItems.map((cat) => (
                <Link
                  key={cat.slug}
                  href={cat.uri}
                  className={style.drawerLink}
                  onClick={() => setDrawerOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}

Header.fragments = {
  entry: gql`
    fragment HeaderFragment on RootQuery {
      generalSettings {
        title
        description
      }
      primaryMenuItems: menuItems(where: { location: PRIMARY }) {
        nodes {
          id
          uri
          path
          label
          parentId
          cssClasses
          menu {
            node {
              name
            }
          }
        }
      }
      categories {
        nodes {
          name
          slug
          uri
        }
      }
    }
  `,
};
