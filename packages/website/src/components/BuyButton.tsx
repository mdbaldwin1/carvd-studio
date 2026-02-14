import { getCheckoutUrl } from "../utils/lemonSqueezy";

interface BuyButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * A button that links to the Lemon Squeezy checkout for purchasing a license key.
 * Single product - license works on both Mac and Windows.
 */
export default function BuyButton({
  className = "btn btn-primary btn-lg",
  children,
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
    <a href="/pricing" onClick={handleClick} className={className}>
      {children || `Buy License - $59.99`}
    </a>
  );
}
