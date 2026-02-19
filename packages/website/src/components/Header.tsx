import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-[100] border-b border-border bg-bg/95 backdrop-blur-[10px]">
      <a
        href="#main-content"
        className="absolute left-[-9999px] top-2 z-[999] rounded-sm bg-primary px-4 py-2 font-semibold text-text no-underline focus:left-2"
      >
        Skip to content
      </a>
      <div
        className="container flex items-center justify-between px-4 py-2 sm:py-4 md:px-6 md:py-6"
        aria-label="Main navigation"
      >
        <a
          href="/"
          className="text-base font-bold text-text no-underline transition-colors hover:text-accent sm:text-xl md:text-2xl"
        >
          Carvd Studio
        </a>
        <NavigationMenu>
          <NavigationMenuList className="gap-4 sm:gap-6 md:gap-12">
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/features"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent text-text hover:bg-transparent hover:text-highlight text-xs sm:text-sm",
                )}
              >
                Features
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/pricing"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent text-text hover:bg-transparent hover:text-highlight text-xs sm:text-sm",
                )}
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/docs"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent text-text hover:bg-transparent hover:text-highlight text-xs sm:text-sm",
                )}
              >
                Docs
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem className="hidden md:block">
              <Button asChild size="sm">
                <a href="/download">Download</a>
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
