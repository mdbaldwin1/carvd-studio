import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { websiteAnalytics } from "./analytics";

export function PostHogPageviews() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    websiteAnalytics.capture("$pageview", {
      $current_url: window.location.href,
    });
  }, [pathname, search]);

  return null;
}
