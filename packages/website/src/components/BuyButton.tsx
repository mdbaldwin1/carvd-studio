import { Button } from "@/components/ui/button";
import { getCheckoutUrl } from "../utils/lemonSqueezy";
import { cn } from "@/lib/utils";

interface BuyButtonProps {
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "default" | "lg" | "icon";
}

/**
 * A button that links to the Lemon Squeezy checkout for purchasing a license key.
 * Single product - license works on both Mac and Windows.
 */
export default function BuyButton({
  className,
  children,
  size = "lg",
}: BuyButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const url = getCheckoutUrl();
    if (url === "/pricing") {
      // Checkout not configured, let the link go to pricing page
      return;
    }
    e.preventDefault();
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
