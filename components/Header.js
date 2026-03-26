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

function getSpanishDate() {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
}

export default function Header({ siteTitle, siteDescription, menuItems }) {
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

  const items = Array.isArray(menuItems) ? menuItems : [];

  return (
    <>
      <header className={style.header}>
        <MarketTicker />
        <div className={style.topBar}>
          <div className={`container ${style.topBarInner}`}>
            <span className={style.date} suppressHydrationWarning>{getSpanishDate()}</span>
            <div className={style.topActions}>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className={style.logoBar}>
          <div className={`container ${style.logoBarInner}`}>
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
          </div>
        </div>

        <nav className={style.navBar}>
          <div className={`container ${style.navBarInner}`}>
            <button
              className={style.hamburger}
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>

            <ul className={style.navList}>
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={item.uri} className={style.navLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

          </div>
        </nav>
      </header>


      {drawerOpen && (
        <>
          <div className={style.overlay} onClick={() => setDrawerOpen(false)} />
          <div className={style.drawer}>
            <div className={style.drawerHeader}>
              <span className={style.drawerTitle}>Menú</span>
              <button
                className={style.drawerClose}
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className={style.drawerNav}>
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.uri}
                  className={style.drawerLink}
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
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
    }
  `,
};
