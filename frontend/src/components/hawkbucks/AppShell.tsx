import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Footer } from "@/components/hawkbucks/Footer";
import { LanguageMenu } from "@/components/hawkbucks/LanguageSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebarPreference } from "@/hooks/use-preferences";
import type { InitialServerPreferences } from "@/hooks/use-preferences";
import { useI18n } from "@/i18n";
import { ASSETS } from "@/lib/assets";
import { NAV_ITEMS, matchNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const DESKTOP_EXPANDED_WIDTH = "16rem";
const DESKTOP_COLLAPSED_WIDTH = "4.25rem";

type ShellContextValue = {
  desktopOpen: boolean;
  setDesktopOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** undefined until the client media query resolves — avoids hydration mismatch. */
  isMobile: boolean | undefined;
  toggleDesktop: () => void;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

function useShell() {
  const ctx = React.useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within AppShell.");
  return ctx;
}

function BrandLink() {
  const { t } = useI18n();
  return (
    <Link
      to="/"
      aria-label={t("shell.brandHome")}
      className="flex min-h-[3rem] min-w-0 shrink-0 items-center gap-2 rounded-lg px-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={ASSETS.logo}
        alt="HawkBucks logo"
        // The logo is a square mark — keep it fixed-size so it never
        // stretches, crops, or (in future RTL) mirrors.
        className="h-9 w-9 shrink-0 rounded-lg shadow-[var(--shadow-glow)]"
        draggable={false}
      />
      <span className="shrink-0 whitespace-nowrap font-display text-base font-extrabold uppercase tracking-tight">
        Hawk<span className="text-primary">Bucks</span>
      </span>
    </Link>
  );
}

/** Collapsed-rail reopen affordance: a semantic button (not a Link) so
    activating it expands the sidebar without navigating. Hovering (or
    keyboard-focusing) the button cross-fades the logo mark into the
    open-sidebar icon in the same fixed-size slot — no layout shift. */
function CollapsedBrandButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("shell.openSidebar")}
      title={t("shell.openSidebar")}
      className="group flex min-h-[3rem] w-full items-center justify-center rounded-lg px-0 outline-none transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative grid h-9 w-9 shrink-0 place-items-center">
        <img
          src={ASSETS.logo}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-9 w-9 rounded-lg shadow-[var(--shadow-glow)] transition-opacity duration-150 ease-linear group-hover:opacity-0 group-focus-visible:opacity-0 motion-reduce:transition-none"
          draggable={false}
        />
        <PanelLeftOpen
          aria-hidden="true"
          className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      </span>
    </button>
  );
}

function DesktopSidebar() {
  const { desktopOpen, setDesktopOpen, toggleDesktop } = useShell();
  const { pathname } = useLocation();
  const { t } = useI18n();
  const active = matchNavItem(pathname);
  const collapsed = !desktopOpen;

  const openSidebar = React.useCallback(() => {
    setDesktopOpen(true);
  }, [setDesktopOpen]);

  return (
    <aside
      aria-label={t("shell.sidebar")}
      data-state={collapsed ? "collapsed" : "expanded"}
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-e border-border/60 bg-background/60 backdrop-blur-xl transition-[width] duration-200 ease-linear md:flex",
        "motion-reduce:transition-none",
      )}
      style={{ width: collapsed ? DESKTOP_COLLAPSED_WIDTH : DESKTOP_EXPANDED_WIDTH }}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-0.5",
          // Narrower padding on the collapsed rail so the 36px logo mark
          // fits the 68px column with room to center.
          collapsed ? "justify-center overflow-hidden px-2" : "px-1.5",
        )}
      >
        {collapsed ? (
          <CollapsedBrandButton onOpen={openSidebar} />
        ) : (
          <>
            <div className="flex min-w-0 shrink-0 items-center">
              <BrandLink />
            </div>
            {/* Expanded-header controls: grouped at the logical end edge via
                ms-auto so the brand keeps its full width and never truncates.
                Both are icon buttons with the same 36px footprint. */}
            <div className="ms-auto flex shrink-0 items-center gap-0.5">
              <LanguageMenu />
              <button
                type="button"
                onClick={toggleDesktop}
                aria-label={t("shell.collapseSidebar")}
                aria-expanded={true}
                title={t("shell.collapseSidebar")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PanelLeftClose aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>

      <nav
        aria-label={t("shell.primaryNav")}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-6"
      >
        <p
          className={cn(
            "px-2 pb-1 pt-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70",
            collapsed && "sr-only",
          )}
        >
          {t("navigation.navigate")}
        </p>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === active.to;
            const label = t(item.labelKey);
            const link = (
              <Link
                to={item.to}
                activeOptions={{ exact: item.exact }}
                aria-current={isActive ? "page" : undefined}
                aria-label={collapsed ? label : undefined}
                data-active={isActive}
                className={cn(
                  "flex min-h-[2.75rem] items-center rounded-lg px-3 font-display text-[13px] font-bold uppercase tracking-[0.08em] outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  // Only the horizontal axis adapts when collapsed; vertical
                  // geometry (min-height, alignment) stays identical so icon
                  // Y-positions never shift between states.
                  collapsed ? "justify-center gap-0" : "gap-3",
                  isActive
                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--color-primary)]"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                )}
              >
                <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center">
                  <item.Icon
                    aria-hidden="true"
                    className={cn("h-5 w-5", isActive ? "text-primary" : "")}
                  />
                </span>
                <span className={cn(collapsed ? "sr-only" : "truncate")}>{label}</span>
                {!collapsed && isActive && (
                  <span
                    aria-hidden="true"
                    className="ms-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                )}
              </Link>
            );

            if (!collapsed) return <li key={item.to}>{link}</li>;

            return (
              <li key={item.to}>
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    {label}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function MobileDrawer() {
  const { mobileOpen, setMobileOpen } = useShell();
  const { pathname } = useLocation();
  const { t } = useI18n();
  const active = matchNavItem(pathname);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!mobileOpen) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus?.();
    };
  }, [mobileOpen, setMobileOpen]);

  // Close the drawer on successful navigation (link onClick already covers
  // taps; this covers programmatic navigations while open).
  const lastPathname = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;
      setMobileOpen(false);
    }
  }, [pathname, setMobileOpen]);

  if (!mobileOpen) return null;

  return (
    <div className="md:hidden">
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("shell.mobileNav")}
        className="fixed inset-y-0 start-0 z-50 flex h-full w-[18rem] max-w-[85vw] flex-col border-e border-border/60 bg-background shadow-2xl animate-in slide-in-from-left duration-200 motion-reduce:animate-none rtl:slide-in-from-right"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-3">
          <BrandLink />
          <button
            ref={closeRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("shell.closeMenu")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <nav
          aria-label={t("shell.primaryNav")}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4"
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.to === active.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.exact }}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex min-h-[3rem] items-center gap-3 rounded-lg px-3 font-display text-sm font-bold uppercase tracking-[0.08em] outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--color-primary)]"
                        : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                    )}
                  >
                    <item.Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 space-y-3 border-t border-border/60 p-4">
          <LanguageMenu showCurrentLabel align="start" />
          <Link
            to="/vbucks-missions"
            onClick={() => setMobileOpen(false)}
            className="flex min-h-[3rem] w-full items-center justify-center rounded-lg bg-primary px-4 font-display text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("navigation.checkTodaysMissions")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function TopNavbar({ title }: { title: string }) {
  const { isMobile, mobileOpen, setMobileOpen } = useShell();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      {/* Mobile-only drawer trigger. No desktop sidebar toggle exists here
          by design: expanded collapse lives inside the sidebar header and
          the collapsed logo rail is the desktop reopen affordance. To avoid
          an SSR hydration mismatch, render nothing until the media query
          resolves on desktop. */}
      {isMobile === undefined ? null : isMobile ? (
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? t("shell.closeMenu") : t("shell.openMenu")}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-panel-border text-primary outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mobileOpen ? (
            <X aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-extrabold uppercase tracking-[0.12em] sm:text-base">
          {title}
        </p>
      </div>
    </header>
  );
}

export function AppShell({
  children,
  initialSidebarOpen,
  initialPreferences,
}: {
  children: React.ReactNode;
  /** Legacy Phase 2 prop — used when `initialPreferences` is absent. */
  initialSidebarOpen?: boolean | undefined;
  /** Phase 3 seeded SSR snapshot (preferred when present). */
  initialPreferences?: InitialServerPreferences | undefined;
}) {
  const initialState =
    initialPreferences?.sidebar.state ?? (initialSidebarOpen === false ? "collapsed" : "expanded");
  const { open: desktopOpen, setOpen: setDesktopOpen } = useSidebarPreference(initialState);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { t } = useI18n();

  const toggleDesktop = React.useCallback(() => {
    setDesktopOpen((prev) => !prev);
  }, [setDesktopOpen]);

  const value = React.useMemo<ShellContextValue>(
    () => ({
      desktopOpen,
      setDesktopOpen,
      mobileOpen,
      setMobileOpen,
      isMobile,
      toggleDesktop,
    }),
    [desktopOpen, setDesktopOpen, mobileOpen, isMobile, toggleDesktop],
  );

  // Top-navbar title resolves the nav item's translation key at render time.
  const navbarTitle = t(matchNavItem(pathname).titleKey);

  return (
    <ShellContext.Provider value={value}>
      <TooltipProvider delayDuration={200}>
        {/* overflow-x-clip on the shell row absorbs sub-pixel rounding during
            the sidebar width transition so no horizontal scrollbar flashes.
            `clip` (not `hidden`) avoids creating a scroll container, so the
            sticky sidebar/header keep working and vertical scrolling is
            unaffected. */}
        <div className="flex min-h-svh w-full items-stretch overflow-x-clip">
          <DesktopSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
            <TopNavbar title={navbarTitle} />
            <div className="flex min-h-0 flex-1 flex-col">
              <main className="mx-auto w-full min-w-0 max-w-[1100px] flex-1 px-4 sm:px-6">
                {children}
              </main>
              <Footer />
            </div>
          </div>
        </div>
        <div id="mobile-navigation">
          <MobileDrawer />
        </div>
      </TooltipProvider>
    </ShellContext.Provider>
  );
}
