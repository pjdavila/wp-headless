import Link from "next/link";
import SeoHead from "../components/SeoHead";

const SECTIONS = [
  { name: "Portada", href: "/" },
  { name: "Business", href: "/category/news/cbusiness-category/" },
  { name: "Economy", href: "/category/news/cbusiness-economy/" },
  { name: "Tech & AI", href: "/category/news/cbusiness-tech-ai/" },
  { name: "Videos", href: "/videos" },
  { name: "Revista", href: "/magazine" },
];

export default function NotFoundPage() {
  return (
    <>
      <SeoHead title="Página no encontrada" description="La página que buscas no existe o fue movida." noIndex />
      <main className="container" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ fontSize: "5rem", fontWeight: 800, margin: 0, lineHeight: 1 }}>404</p>
          <h1 style={{ fontSize: "1.5rem", margin: "1rem 0 0.5rem" }}>Página no encontrada</h1>
          <p style={{ opacity: 0.7, marginBottom: "2rem" }}>
            La página que buscas no existe o fue movida.
          </p>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid currentColor",
                  borderRadius: "999px",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                }}
              >
                {s.name}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </>
  );
}
