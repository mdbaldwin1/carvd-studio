import { useLocation } from "react-router-dom";
import { getPrevNext } from "./docsNavConfig";

export default function DocsPrevNext() {
  const { pathname } = useLocation();
  const slug = pathname.replace("/docs/", "");
  const { prev, next } = getPrevNext(slug);

  if (!prev && !next) return null;

  return (
    <nav className="docs-prev-next" aria-label="Documentation pagination">
      {prev ? (
        <a href={`/docs/${prev.slug}`} className="docs-prev-next-link">
          <span className="text-sm text-muted">Previous</span>
          <span>{prev.title}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={`/docs/${next.slug}`}
          className="docs-prev-next-link docs-prev-next-link--next"
        >
          <span className="text-sm text-muted">Next</span>
          <span>{next.title}</span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}
