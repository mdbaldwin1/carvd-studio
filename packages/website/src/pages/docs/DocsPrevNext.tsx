import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getPrevNext } from "./docsNavConfig";

export default function DocsPrevNext() {
  const { pathname } = useLocation();
  const slug = pathname.replace("/docs/", "");
  const { prev, next } = getPrevNext(slug);

  if (!prev && !next) return null;

  return (
    <nav
      className="mt-16 flex justify-between gap-4 border-t border-border pt-8 max-[600px]:flex-col max-md:mt-12 max-sm:mt-8"
      aria-label="Documentation pagination"
    >
      {prev ? (
        <a
          href={`/docs/${prev.slug}`}
          className={cn(
            "feature-card flex max-w-[45%] flex-col gap-1 p-4 text-text no-underline",
            "max-[600px]:max-w-full",
          )}
        >
          <span className="text-sm text-text-muted">Previous</span>
          <span>{prev.title}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={`/docs/${next.slug}`}
          className={cn(
            "feature-card ml-auto flex max-w-[45%] flex-col gap-1 p-4 text-right text-text no-underline",
            "max-[600px]:max-w-full max-[600px]:text-left",
          )}
        >
          <span className="text-sm text-text-muted">Next</span>
          <span>{next.title}</span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}
