import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { docPages } from "../pages/docs/docsNavConfig";

const docSlugs = new Set(docPages.map((p) => p.slug));

/**
 * Component that scrolls to hash elements when navigating.
 * Handles both initial page load and navigation within the app.
 * Also redirects old /docs#section URLs to /docs/section.
 */
export default function ScrollToHash() {
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (hash) {
      const slug = hash.slice(1); // remove the '#'

      // Redirect old /docs#slug URLs to /docs/slug
      if (pathname === "/docs" && docSlugs.has(slug)) {
        navigate(`/docs/${slug}`, { replace: true });
        return;
      }

      // Small delay to ensure the DOM is ready
      const timeoutId = setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      // Scroll to top when navigating to a new page without hash
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [hash, pathname, navigate]);

  return null;
}
