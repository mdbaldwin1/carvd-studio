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
    <header className="sticky top-0 z-[100] border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <a
        href="#main-content"
        className="absolute left-[-9999px] top-2 z-[999] rounded-sm bg-primary px-4 py-2 font-semibold text-primary-foreground no-underline focus:left-2"
      >
        Skip to content
      </a>
      <div
        className="container flex items-center justify-between gap-3 py-2 sm:py-3"
        aria-label="Main navigation"
      >
        <a
          href="/"
          aria-label="Carvd Studio"
          className="inline-flex items-center rounded-md p-1 no-underline transition-opacity hover:opacity-90"
        >
          <img
            src="/branding/CarvdStudio-Horizontal-WHT.svg"
            alt=""
            aria-hidden="true"
            className="h-7 w-auto sm:h-8 md:h-9"
          />
          <span className="sr-only">Carvd Studio</span>
        </a>

        <NavigationMenu>
          <NavigationMenuList className="gap-1 rounded-lg border border-border/80 bg-surface/80 p-1 shadow-sm">
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/features"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "h-9 bg-transparent px-3 text-sm text-text hover:bg-surface-elevated hover:text-highlight",
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
                  "h-9 bg-transparent px-3 text-sm text-text hover:bg-surface-elevated hover:text-highlight",
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
                  "h-9 bg-transparent px-3 text-sm text-text hover:bg-surface-elevated hover:text-highlight",
                )}
              >
                Docs
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem className="hidden md:block">
              <Button asChild size="sm" className="h-9 px-4">
                <a href="/download">Download</a>
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
