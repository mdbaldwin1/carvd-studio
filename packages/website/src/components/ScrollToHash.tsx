import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { docPages } from "../pages/docs/docsNavConfig";

const docSlugs = new Set(docPages.map((p) => p.slug));

/** Supports legacy docs URLs and anchors in lazily loaded route content. */
export default function ScrollToHash() {
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let slug: string;
    try {
      slug = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    if (pathname === "/docs" && docSlugs.has(slug)) {
      navigate(`/docs/${slug}`, { replace: true });
      return;
    }

    const scrollToTarget = () => {
      const element = document.getElementById(slug);
      if (!element) return false;
      element.scrollIntoView({ behavior: "smooth" });
      return true;
    };
    if (scrollToTarget()) return;

    // A cold desktop help link can arrive before the lazy docs page is ready.
    const observer = new window.MutationObserver(() => {
      if (scrollToTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 10000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [hash, pathname, navigate]);

  return null;
}
