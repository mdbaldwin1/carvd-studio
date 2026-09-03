import { Button } from "@/components/ui/button";
import { getCheckoutUrl } from "../utils/lemonSqueezy";
import { cn } from "@/lib/utils";
import { websiteAnalytics } from "../analytics/analytics";

interface BuyButtonProps {
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "default" | "lg" | "icon";
  location?: string;
}

/**
 * A button that links to the Lemon Squeezy checkout for purchasing a license key.
 * Single product - license works on macOS, Windows, and Linux.
 */
export default function BuyButton({
  className,
  children,
  size = "lg",
  location = "pricing-card",
}: BuyButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const url = getCheckoutUrl();
    if (url === "/pricing") {
      // Checkout not configured, let the link go to pricing page
      return;
    }
    e.preventDefault();
    try {
      websiteAnalytics.capture("checkout_started", {
        product: "desktop_license",
        location,
      });
    } catch {
      // Analytics failures must not interrupt checkout navigation.
    }
    window.open(url, "_blank");
  };

  return (
    <Button asChild size={size} className={cn(className)}>
      <a href="/pricing" onClick={handleClick}>
        {children || `Buy License - $59.99`}
      </a>
    </Button>
  );
}
