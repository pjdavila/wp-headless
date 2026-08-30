import { gql } from "@apollo/client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/useAuth";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./AuthModal";
import TsaBadge from "./TsaBadge";
import HeaderBanner from "./ads/HeaderBanner";
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

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${style.chevron} ${open ? style.chevronOpen : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const SKIP_SLUGS = ["uncategorized", "sin-categoria"];

// Categories that have a dedicated landing page. The WordPress archive stays
// reachable at its own URL; only the nav entry points at the custom page.
const NAV_URI_OVERRIDES = {
  "special-reports": "/special-reports/",
};

function buildNavItems(categories) {
  if (!Array.isArray(categories)) return [];
  const filtered = categories.filter((c) => !SKIP_SLUGS.includes(c.slug));
  const topLevel = filtered.filter((c) => !c.parentId);
  const items = topLevel.map((cat) => {
    const children = (cat.children?.nodes || []).filter(
      (ch) => !SKIP_SLUGS.includes(ch.slug)
    );
    return { ...cat, uri: NAV_URI_OVERRIDES[cat.slug] || cat.uri, children };
  });
  items.sort((a, b) => (b.slug === "news") - (a.slug === "news") || (b.children.length > 0) - (a.children.length > 0));
  return items;
}

export default function Header({ siteTitle, siteDescription, menuItems, categories }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerExpandedSlugs, setDrawerExpandedSlugs] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerSearchTerm, setDrawerSearchTerm] = useState("");
  const { user, loading } = useAuth();
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const inputs = document.querySelectorAll("[data-header-search-input]");
    const visibleInput = Array.from(inputs).find((el) => el.offsetParent !== null);
    if (visibleInput) visibleInput.focus();
    const handleClick = (e) => {
      if (!e.target.closest("[data-search-wrap]")) {
        setSearchOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [searchOpen]);

  const submitSearch = (term) => {
    const q = term.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    submitSearch(searchTerm);
    setSearchOpen(false);
    setSearchTerm("");
  };

  const handleDrawerSearch = (e) => {
    e.preventDefault();
    submitSearch(drawerSearchTerm);
    setDrawerOpen(false);
    setDrawerSearchTerm("");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out failed:", e);
    }
    setDropdownOpen(false);
  };

  const getInitials = (u) => {
    if (u.displayName) return u.displayName.charAt(0).toUpperCase();
    if (u.email) return u.email.charAt(0).toUpperCase();
    return "U";
  };

  const navItems = buildNavItems(categories);

  return (
    <>
      <header className={style.header}>
        <HeaderBanner />
        <div className={style.logoBar}>
          <div className={`container ${style.logoBarInner}`}>
            <div className={style.leftActions}>
              <button
                className={style.hamburger}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon />
              </button>
              <div
                className={`${style.searchWrap} ${style.searchWrapMobile}`}
                data-search-wrap
              >
                {searchOpen && (
                  <form
                    className={`${style.searchForm} ${style.searchFormLeft}`}
                    onSubmit={handleHeaderSearch}
                  >
                    <input
                      type="search"
                      className={style.searchInput}
                      data-header-search-input
                      placeholder="Buscar…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Buscar"
                    />
                  </form>
                )}
                <button
                  className={style.searchBtn}
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-label="Search"
                  aria-expanded={searchOpen}
                >
                  <SearchIcon />
                </button>
              </div>
              <TsaBadge />
            </div>

            <Link href="/" className={style.brand}>
              <Image
                src="https://img.caribbean.business/Logo-CB-White.png"
                alt="Caribbean Business"
                width={400}
                height={50}
                className={style.logoImage}
                priority
              />
            </Link>

            <div className={style.rightActions}>
              <div
                className={`${style.searchWrap} ${style.searchWrapDesktop}`}
                data-search-wrap
              >
                {searchOpen && (
                  <form className={style.searchForm} onSubmit={handleHeaderSearch}>
                    <input
                      type="search"
                      className={style.searchInput}
                      data-header-search-input
                      placeholder="Buscar…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Buscar"
                    />
                  </form>
                )}
                <button
                  className={style.searchBtn}
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-label="Search"
                  aria-expanded={searchOpen}
                >
                  <SearchIcon />
                </button>
              </div>
              <ThemeToggle />
              {!loading && (
                user ? (
                  <div className={style.authWrap} ref={dropdownRef}>
                    <button
                      className={style.avatarBtn}
                      onClick={() => setDropdownOpen((v) => !v)}
                      aria-label="Account menu"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className={style.avatarImg} referrerPolicy="no-referrer" />
                      ) : (
                        <span className={style.avatarInitial}>{getInitials(user)}</span>
                      )}
                    </button>
                    {dropdownOpen && (
                      <div className={style.dropdown}>
                        <div className={style.dropdownEmail}>{user.email}</div>
                        <button className={style.dropdownBtn} onClick={handleSignOut}>
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className={style.loginBtn}
                    onClick={() => setAuthModalOpen(true)}
                    aria-label="Sign in"
                  >
                    <UserIcon />
                    <span className={style.loginLabel}>Sign In</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <nav className={style.navBar}>
          <div className={`container ${style.navBarInner}`}>
            <ul className={style.navList}>
              {navItems.map((cat) =>
                cat.children.length > 0 ? (
                  <li key={cat.slug} className={style.navItem}>
                    <Link href={cat.uri} className={style.navLink}>
                      {cat.name}
                      <ChevronIcon />
                    </Link>
                    <div className={style.navSubmenu}>
                      {cat.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={child.uri}
                          className={style.navSubmenuLink}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </li>
                ) : (
                  <li key={cat.slug} className={style.navItem}>
                    <Link href={cat.uri} className={style.navLink}>
                      {cat.name}
                    </Link>
                  </li>
                )
              )}
              <li className={style.navItem}>
                <Link href="/latest-news" className={style.navLink}>
                  Latest News
                </Link>
              </li>
              <li className={style.navItem}>
                <Link href="/videos" className={style.navLink}>
                  Videos
                </Link>
              </li>
            </ul>
          </div>
        </nav>

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
              <form className={style.drawerSearchForm} onSubmit={handleDrawerSearch}>
                <span className={style.drawerSearchIcon}>
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  className={style.drawerSearchInput}
                  placeholder="Buscar…"
                  value={drawerSearchTerm}
                  onChange={(e) => setDrawerSearchTerm(e.target.value)}
                  aria-label="Buscar"
                />
              </form>
              {navItems.map((cat) =>
                cat.children.length > 0 ? (
                  <div key={cat.slug} className={style.drawerGroup}>
                    <button
                      className={style.drawerGroupToggle}
                      onClick={() => setDrawerExpandedSlugs((prev) => ({
                        ...prev,
                        [cat.slug]: !prev[cat.slug],
                      }))}
                    >
                      <span>{cat.name}</span>
                      <ChevronIcon open={!!drawerExpandedSlugs[cat.slug]} />
                    </button>
                    {drawerExpandedSlugs[cat.slug] && (
                      <div className={style.drawerSublinks}>
                        <Link
                          href={cat.uri}
                          className={style.drawerSublink}
                          onClick={() => setDrawerOpen(false)}
                        >
                          All {cat.name}
                        </Link>
                        {cat.children.map((child) => (
                          <Link
                            key={child.slug}
                            href={child.uri}
                            className={style.drawerSublink}
                            onClick={() => setDrawerOpen(false)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={cat.slug}
                    href={cat.uri}
                    className={style.drawerLink}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {cat.name}
                  </Link>
                )
              )}
              <Link
                href="/latest-news"
                className={style.drawerLink}
                onClick={() => setDrawerOpen(false)}
              >
                Latest News
              </Link>
              <Link
                href="/videos"
                className={style.drawerLink}
                onClick={() => setDrawerOpen(false)}
              >
                Videos
              </Link>
            </nav>
          </div>
        </>
      )}

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
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
      categories(first: 100) {
        nodes {
          name
          slug
          uri
          parentId
          children(first: 50) {
            nodes {
              name
              slug
              uri
            }
          }
        }
      }
    }
  `,
};
