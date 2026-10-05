import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BellRing, Compass, Menu, PanelLeftClose, PanelLeftOpen, Sparkles, X } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  HEADER_BRAND_ROW,
  HEADER_CONTROLS,
  HEADER_ICON,
  HEADER_ICON_BUTTON,
  HEADER_PAD,
  HEADER_WORDMARK,
} from "@/components/hawkbucks/header-controls";
import { Footer } from "@/components/hawkbucks/Footer";
import { LanguageMenu } from "@/components/hawkbucks/LanguageSelector";
import { ReminderToggle } from "@/components/hawkbucks/ReminderToggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useNotificationsPreference,
  useSidebarPreference,
  useWelcomePreference,
} from "@/hooks/use-preferences";
import type { InitialServerPreferences } from "@/hooks/use-preferences";
import { useReminderNotifications as useReminderNotificationsShared } from "@/hooks/use-reminder-notifications";
import {
  enableReminderNotifications,
  resolveReminderState,
  unsupportedMessageKey,
} from "@/lib/reminders";
import { useI18n } from "@/i18n";
import { ASSETS } from "@/lib/assets";
import { NAV_GROUPS, localizedNavTo, matchNavItem } from "@/lib/navigation";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";
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

function BrandLink({ hideWordmark = false }: { hideWordmark?: boolean }) {
  const { t, currentLanguage } = useI18n();
  const { pathname } = useLocation();
  return (
    <Link
      to={localizedNavTo("/", pathname, currentLanguage)}
      aria-label={t("shell.brandHome")}
      className="flex min-h-[3rem] min-w-0 shrink items-center gap-1 rounded-lg px-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={ASSETS.logo}
        alt={t("seo.logoAlt")}
        // The logo is a square mark — keep it fixed-size so it never
        // stretches, crops, or (in future RTL) mirrors.
        className="h-9 w-9 shrink-0 rounded-lg shadow-[var(--shadow-glow)]"
        draggable={false}
      />
      <span className={hideWordmark ? "sr-only" : HEADER_WORDMARK}>
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
          className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none rtl:scale-x-[-1]"
        />
      </span>
    </button>
  );
}

function DesktopSidebar() {
  const { desktopOpen, setDesktopOpen, toggleDesktop } = useShell();
  const { pathname } = useLocation();
  const { t, currentLanguage } = useI18n();
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
          collapsed ? "justify-center overflow-hidden px-2" : HEADER_PAD,
        )}
      >
        {collapsed ? (
          <CollapsedBrandButton onOpen={openSidebar} />
        ) : (
          <>
            <div className={HEADER_BRAND_ROW}>
              <BrandLink />
            </div>
            {/* Expanded-header controls: grouped at the logical end edge.
                Order: Language → Reminder → Collapse. The control cluster is
                non-shrinking; the brand row above yields first so these can
                never be pushed out of the header. */}
            <div className={HEADER_CONTROLS}>
              <LanguageMenu />
              <ReminderToggle />
              <button
                type="button"
                onClick={toggleDesktop}
                aria-label={t("shell.collapseSidebar")}
                aria-expanded={true}
                title={t("shell.collapseSidebar")}
                className={HEADER_ICON_BUTTON}
              >
                <PanelLeftClose
                  aria-hidden="true"
                  className={cn(HEADER_ICON, "rtl:scale-x-[-1]")}
                />
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
        {/* Grouped nav: the tracker pair stays on top and unlabelled, the
            content hubs sit under Explore, About under its own heading. Groups
            with no translation key (the primary pair) render a bare list, so
            no empty heading or extra rule is emitted for them. */}
        <div className="flex flex-col gap-4">
          {NAV_GROUPS.filter((group) => group.items.length > 0).map((group) => (
            <div key={group.id} className="flex flex-col">
              {group.labelKey ? (
                <p
                  className={cn(
                    "px-2 pb-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60",
                    collapsed && "sr-only",
                  )}
                >
                  {t(group.labelKey)}
                </p>
              ) : null}
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive = item.to === active.to;
                  const label = t(item.labelKey);
                  const link = (
                    <Link
                      to={localizedNavTo(item.to, pathname, currentLanguage)}
                      activeOptions={{ exact: item.exact }}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={collapsed ? label : undefined}
                      data-active={isActive}
                      className={cn(
                        "flex min-h-[2.75rem] items-center gap-3 rounded-lg border-s-2 px-3 py-2 font-display text-[13px] font-bold uppercase leading-tight tracking-[0.08em] outline-none transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ring",
                        // Only the horizontal axis adapts when collapsed; vertical
                        // geometry (min-height, alignment) stays identical so icon
                        // Y-positions never shift between states.
                        collapsed ? "justify-center gap-0" : "gap-3",
                        // `border-s-2` is a logical (direction-aware) property, so
                        // the active edge renders on the left in LTR and on the
                        // right in ar-SA / fa-IR with no duplicate markup. The
                        // transparent default reserves the same 2px on inactive
                        // items, so activating one never shifts its neighbours.
                        // The existing inset ring is kept as the active box
                        // treatment; the border is the edge indicator.
                        isActive
                          ? "border-s-primary bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--color-primary)]"
                          : "border-s-transparent text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      )}
                    >
                      <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center">
                        <item.Icon
                          aria-hidden="true"
                          className={cn("h-5 w-5", isActive ? "text-primary" : "")}
                        />
                      </span>
                      {/* Two lines maximum, never an ellipsis. `line-clamp-2`
                          allows the natural break so long localized labels
                          ("V-Bucks Mission Tracker") stay fully readable
                          without widening the sidebar or shrinking the type.
                          The full label remains the accessible name; only the
                          visual overflow is clamped. */}
                      <span
                        className={cn(
                          collapsed ? "sr-only" : "min-w-0 flex-1 line-clamp-2 break-words",
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  );

                  if (!collapsed) return <li key={item.to}>{link}</li>;

                  return (
                    <li key={item.to}>
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent
                          side={
                            typeof document !== "undefined" && document.dir === "rtl"
                              ? "left"
                              : "right"
                          }
                          align="center"
                        >
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}

function MobileDrawer() {
  const { mobileOpen, setMobileOpen } = useShell();
  const { pathname } = useLocation();
  const { t, currentLanguage } = useI18n();
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
        <div className="flex h-16 shrink-0 items-center gap-0.5 px-3">
          {/* Icon-only brand saves ~110px so Language + Reminder + Close all
              fit in the 288px drawer; the wordmark stays in the a11y tree. */}
          <BrandLink hideWordmark />
          {/* Drawer header controls mirror the desktop header exactly: the
              Language → Reminder → Close order and the shared compact icon
              button. The globe here is the ONLY language entry point — the
              drawer footer must not repeat it. */}
          <div className={HEADER_CONTROLS}>
            <LanguageMenu />
            <ReminderToggle />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t("shell.closeMenu")}
              className={HEADER_ICON_BUTTON}
            >
              <X aria-hidden="true" className={HEADER_ICON} />
            </button>
          </div>
        </div>

        <nav
          aria-label={t("shell.primaryNav")}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4"
        >
          <div className="flex flex-col gap-4">
            {NAV_GROUPS.filter((group) => group.items.length > 0).map((group) => (
              <div key={group.id} className="flex flex-col">
                {group.labelKey ? (
                  <p className="px-2 pb-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    {t(group.labelKey)}
                  </p>
                ) : null}
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const isActive = item.to === active.to;
                    return (
                      <li key={item.to}>
                        <Link
                          to={localizedNavTo(item.to, pathname, currentLanguage)}
                          activeOptions={{ exact: item.exact }}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex min-h-[3rem] items-center gap-3 rounded-lg px-3 py-2 font-display text-sm font-bold uppercase leading-tight tracking-[0.08em] outline-none transition-colors",
                            "focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--color-primary)]"
                              : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                          )}
                        >
                          <item.Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                          {/* Same two-line wrap as the desktop sidebar — the drawer is a
                              different width, so labels break independently. */}
                          <span className="min-w-0 flex-1 line-clamp-2 break-words">
                            {t(item.labelKey)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer: mission CTA only. The language entry point lives in the
            drawer header (globe) — repeating it here duplicated the control. */}
        <div className="shrink-0 border-t border-border/60 p-4">
          <Link
            to={localizedNavTo("/vbucks-missions", pathname, currentLanguage)}
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

function WelcomeDialog() {
  const { t, currentLanguage } = useI18n();
  const { pathname } = useLocation();
  const welcome = useWelcomePreference();
  const reminders = useNotificationsPreference();
  const [reminderSaved, setReminderSaved] = React.useState(false);
  const [reminderStatus, setReminderStatus] = React.useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = React.useState(false);
  const open = welcome.ready && reminders.ready && !welcome.completed;
  const destination = localizePath("/", splitLocalePath(pathname).locale ?? currentLanguage);

  const setWelcomeCompleted = welcome.setCompleted;
  const complete = React.useCallback(() => setWelcomeCompleted(true), [setWelcomeCompleted]);

  // Canonical enable path (shared with the sidebar ReminderToggle via
  // useReminderNotifications): permission → subscription → backend
  // registration. No auto-prompt on mount or on dialog open.
  const sharedReminders = useReminderNotificationsShared();
  const enableReminders = React.useCallback(async () => {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderStatus(null);
    try {
      const { ok, state } = await enableReminderNotifications(currentLanguage);
      await sharedReminders.refresh();
      if (!ok) {
        reminders.setEnabled(false);
        // Re-resolve: the mutation's own state can be "off" while the true
        // cause is a blocked or unsupported browser.
        const resolved = await resolveReminderState();
        const hint = unsupportedMessageKey() === "unsupportedInstallHint";
        setReminderStatus(
          t(
            resolved.state === "blocked" || state === "blocked"
              ? "notifications.blocked"
              : resolved.state === "unsupported" || state === "unsupported"
                ? hint
                  ? "notifications.unsupportedInstallHint"
                  : "notifications.unsupported"
                : "notifications.disabled",
          ),
        );
        return;
      }
      reminders.setEnabled(true);
      setReminderSaved(true);
      setReminderStatus(t("notifications.enabled"));
    } catch {
      reminders.setEnabled(false);
      setReminderStatus(t("notifications.disabled"));
    } finally {
      setReminderBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderBusy, currentLanguage]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open) complete();
      }}
    >
      <DialogContent
        aria-describedby="welcome-description"
        className="max-h-[min(90svh,44rem)] w-[calc(100%-2rem)] max-w-xl gap-0 overflow-y-auto rounded-2xl border-primary/20 bg-card p-0 shadow-[0_24px_80px_-24px_var(--color-primary)] sm:w-[calc(100%-3rem)]"
      >
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/15 via-card to-card px-6 pb-6 pt-8 sm:px-8 sm:pt-9">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[var(--shadow-glow)]">
            <Sparkles aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {t("welcome.eyebrow")}
          </p>
          <DialogTitle className="max-w-md font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            {t("welcome.title")}
          </DialogTitle>
          <DialogDescription
            id="welcome-description"
            className="mt-3 max-w-lg text-sm leading-6 sm:text-base"
          >
            {t("welcome.description")}
          </DialogDescription>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2 sm:px-8 sm:py-6">
          <section className="rounded-xl border border-border/70 bg-background/50 p-4">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Compass aria-hidden="true" className="h-4 w-4" />
            </div>
            <h3 className="font-display text-sm font-bold">{t("welcome.trackingTitle")}</h3>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
              {t("welcome.trackingDescription")}
            </p>
          </section>
          <section className="rounded-xl border border-border/70 bg-background/50 p-4">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <BellRing aria-hidden="true" className="h-4 w-4" />
            </div>
            <h3 className="font-display text-sm font-bold">{t("welcome.remindersTitle")}</h3>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
              {t("welcome.remindersDescription")}
            </p>
          </section>
        </div>

        <div className="space-y-3 px-6 pb-6 sm:px-8 sm:pb-8">
          {reminderStatus && (
            <p role="status" className="text-sm leading-5 text-muted-foreground">
              {reminderStatus}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full border-primary/30 sm:w-auto"
              disabled={reminderBusy}
              onClick={() => {
                void enableReminders();
              }}
            >
              <BellRing aria-hidden="true" />
              {t("welcome.enableReminders")}
            </Button>
            <Button asChild className="min-h-11 w-full sm:w-auto">
              <Link to={destination} onClick={complete}>
                <Compass aria-hidden="true" />
                {t("welcome.explore")}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
        <WelcomeDialog />
      </TooltipProvider>
    </ShellContext.Provider>
  );
}
