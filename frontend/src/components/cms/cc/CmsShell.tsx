import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { ASSETS } from "@/lib/assets";
import { BRAND_NAME } from "@/lib/site";
import { adminLogout } from "@/lib/cms/admin.loader";
import { CmsToastHost } from "./CmsPrimitives";

export type CmsSection =
  | "dashboard"
  | "heroes"
  | "loadouts"
  | "inventory"
  | "articles"
  | "media"
  | "publishing"
  | "seo"
  | "activity"
  | "settings";

interface NavItem {
  section: CmsSection;
  to: string;
  label: string;
  hint: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Control Center navigation — authoritative IA (Cms Template blueprint,
 * adapted to real HawkBucks capabilities; no fabricated sections).
 */
export const CMS_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        section: "dashboard",
        to: "/admin",
        label: "Dashboard",
        hint: "Content status at a glance",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        section: "heroes",
        to: "/admin/heroes",
        label: "Heroes",
        hint: "Classes, abilities, translations",
      },
      {
        section: "loadouts",
        to: "/admin/loadouts",
        label: "Loadouts",
        hint: "Commander + support rosters",
      },
      {
        section: "inventory",
        to: "/admin/inventory",
        label: "Inventory",
        hint: "Weapons, traps, perks, schematics",
      },
      { section: "articles", to: "/admin/articles", label: "Articles", hint: "Editorial content" },
      { section: "media", to: "/admin/media", label: "Media Library", hint: "R2-backed assets" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        section: "publishing",
        to: "/admin/publishing",
        label: "Publishing",
        hint: "Draft / published / archived",
      },
      {
        section: "seo",
        to: "/admin/seo",
        label: "SEO Center",
        hint: "Factual metadata diagnostics",
      },
      { section: "activity", to: "/admin/activity", label: "Activity", hint: "Audit trail" },
      {
        section: "settings",
        to: "/admin/settings",
        label: "Settings",
        hint: "Session and environment",
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.to === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function BrandMark() {
  return (
    <Link
      to="/admin"
      aria-label="HawkBucks Control Center home"
      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1.5 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
    >
      <img
        src={ASSETS.logo}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 grow-0 basis-9 self-center rounded-lg object-contain"
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center leading-none">
        <span className="block truncate font-display text-sm font-extrabold uppercase tracking-tight">
          Hawk<span className="text-[var(--cc-accent)]">Bucks</span>
        </span>
        <span className="cc-brand-sub mt-1 block">Control Center</span>
      </span>
    </Link>
  );
}

/**
 * Wave 1 — collapsed-rail logo button. Mirrors the public AppShell's
 * CollapsedBrandButton interaction: a semantic <button> (expands WITHOUT
 * navigating) whose hover/focus cross-fades the logo mark into the
 * expand icon in the SAME fixed-size slot — no layout shift, keyboard
 * equivalent via :focus-visible, tooltip + aria-label for AT.
 */
function CollapsedLogoButton(props: { onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onExpand}
      aria-label="Expand sidebar"
      title="Expand sidebar"
      className="group grid min-h-[3rem] w-full place-items-center rounded-xl px-0 py-2 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
    >
      <span className="relative grid h-10 w-10 shrink-0 place-items-center">
        <img
          src={ASSETS.logo}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-10 w-10 rounded-xl transition-opacity duration-150 ease-linear group-hover:opacity-0 group-focus-visible:opacity-0 motion-reduce:transition-none"
        />
        <PanelLeftOpen
          aria-hidden="true"
          className="absolute inset-0 m-auto h-6 w-6 text-[var(--cc-accent)] opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      </span>
    </button>
  );
}

export function CmsShell(props: {
  active: CmsSection;
  sessionUser: { displayName: string; username: string; role: string } | null;
  expiresAt: string | null;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  // Wave 1 — desktop collapse + mobile drawer are SEPARATE state by design.
  // `collapsed` touches ONLY the desktop rail (persisted); `drawerOpen`
  // touches ONLY the mobile overlay. Closing the drawer never writes the
  // rail preference, and navigation never mutates either — only the explicit
  // collapse/expand/close controls below call these setters.
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("hb-cc-rail") === "1";
    } catch {
      return false;
    }
  });
  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    try {
      if (value) localStorage.setItem("hb-cc-rail", "1");
      else localStorage.removeItem("hb-cc-rail");
    } catch {
      // Private mode — collapse simply won't persist.
    }
  };
  const expandRail = () => setCollapsed(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Close the MOBILE drawer on navigation (taps call setDrawerOpen(false)
    // directly; this covers programmatic navigations while open). The desktop
    // `collapsed` rail is deliberately untouched here.
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Single canonical logout: server-side revocation FIRST (the cookie is
  // HttpOnly — only the server can clear the session row), then a full
  // client redirect to /admin so no stale authenticated state lingers.
  // router.invalidate() alone could leave a cached authenticated loader
  // painting the dashboard after logout.
  async function handleLogout() {
    try {
      await adminLogout();
    } finally {
      window.location.assign("/admin");
    }
  }

  // Wave 1 — navigation links NEVER mutate sidebar state: no onClick that
  // touches `collapsed` or `drawerOpen` here. Desktop state changes only via
  // the explicit collapse/expand buttons; the drawer closes itself via its
  // own link onClick (mobile only) + backdrop/Escape/close button.
  const nav = (inDrawer: boolean) => (
    <nav
      aria-label="Control Center sections"
      className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4"
    >
      {CMS_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {(!collapsed || inDrawer) && <p className="cc-eyebrow mb-1.5 px-2.5">{group.label}</p>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = props.active === item.section;
              const railMode = collapsed && !inDrawer;
              return (
                <li key={item.section}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    aria-label={railMode ? item.label : undefined}
                    title={railMode ? `${item.label} — ${item.hint}` : item.hint}
                    onClick={inDrawer ? () => setDrawerOpen(false) : undefined}
                    className={cn(
                      "flex w-full items-center rounded-lg text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]",
                      // One geometry for every row in both states: the row is
                      // always 44px+ tall, the glyph always sits in a fixed
                      // 22px icon box (28px in rail mode), labels always start
                      // on the same axis with a shared leading-6 centerline.
                      // Collapsed rail only centers and drops the label —
                      // vertical positions never shift. RTL-safe: flex +
                      // logical gaps only, no physical offsets.
                      railMode
                        ? "min-h-[3.25rem] justify-center px-0 py-2"
                        : "min-h-[2.75rem] gap-3 px-3 py-2 text-[15px] font-medium leading-6",
                      active
                        ? "cc-navlink-active font-medium"
                        : "font-normal opacity-75 hover:bg-white/5 hover:opacity-100",
                    )}
                  >
                    <CmsNavGlyph section={item.section} large={railMode} />
                    {railMode ? null : (
                      <span className="min-w-0 flex-1 truncate leading-6">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const rail = (
    <div
      className={cn(
        "flex h-dvh flex-col border-r bg-[var(--cc-abyss)] transition-[width] duration-200 cc-hairline",
        collapsed ? "w-[76px]" : "w-60",
      )}
    >
      {/* Wave 1 header: collapsed = logo button that cross-fades to the
          expand affordance on hover/focus (click still expands — behavior
          unchanged, only the affordance is now discoverable). Expanded =
          brand + a dedicated 44px collapse ICON button beside it (same
          pattern as the public AppShell header: icon, tooltip, aria-label,
          keyboard reachable). No more "← Collapse" text row. */}
      <div className="border-b px-2 py-3 cc-hairline">
        {collapsed ? (
          <>
            <CollapsedLogoButton onExpand={expandRail} />
            <span className="sr-only">{BRAND_NAME} Control Center</span>
          </>
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1">
              <BrandMark />
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              aria-expanded={true}
              title="Collapse sidebar"
              className="grid h-9 w-9 shrink-0 grow-0 basis-9 place-items-center self-center rounded-xl opacity-70 outline-none transition-colors hover:bg-white/5 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
            >
              <PanelLeftClose aria-hidden="true" className="h-5 w-5 shrink-0 rtl:scale-x-[-1]" />
            </button>
          </div>
        )}
      </div>

      {nav(false)}

      <div
        className={cn(
          "space-y-1.5 border-t px-3 py-3 cc-hairline",
          collapsed && "px-2 text-center",
        )}
      >
        {props.sessionUser && !collapsed ? (
          <p className="px-1 text-xs leading-relaxed opacity-70">
            {props.sessionUser.displayName}
            <span className="block font-mono text-[10px] uppercase tracking-wider opacity-60">
              {props.sessionUser.role}
            </span>
          </p>
        ) : null}
        {!collapsed && props.expiresAt ? (
          <p className="px-1 text-[10px] leading-relaxed opacity-50">
            Session valid until {formatExpiry(props.expiresAt)}
          </p>
        ) : null}
      </div>
    </div>
  );

  // SINGLE-SCROLL CONTRACT: this outer frame owns viewport height AND clips
  // (overflow-hidden) — it never scrolls itself. Exactly ONE inner column
  // (the content column below) carries overflow-y-auto. Any second
  // overflow-y-auto/h-dvh scroll region inside <main> is a duplicate scrollbar
  // bug — content should flow in the column's scroll context, never create
  // its own.
  return (
    <div className="cc-root cc-shell-bg flex h-dvh min-h-dvh overflow-hidden font-sans">
      <aside className="hidden shrink-0 lg:block" aria-label="Sidebar">
        {rail}
      </aside>

      {drawerOpen ? (
        <div
          className="fixed inset-0 z-[80] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[85vw] shadow-2xl">
            <div className="cc-root flex h-full flex-col bg-[var(--cc-abyss)]">
              <div className="border-b px-3 py-3 cc-hairline">
                <BrandMark />
              </div>
              {nav(true)}
              <div className="border-t px-3 py-3 cc-hairline">
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost cc-btn-sm w-full"
                  onClick={() => setDrawerOpen(false)}
                >
                  Close navigation
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* THE single vertical scroll context for all CMS content: the page
          column scrolls (header sticky within it), document body never does
          (outer frame is overflow-hidden h-dvh). A second overflow-y-auto
          anywhere inside <main> = the duplicate-scrollbar bug. */}
      <div className="cc-shell-scroll flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-[var(--cc-void)]/85 px-4 py-3 backdrop-blur-md cc-hairline sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border outline-none transition-colors cc-hairline hover:border-[var(--cc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] lg:hidden"
          >
            ☰
          </button>
          <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm opacity-80">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--cc-accent)]"
            />
            <span className="truncate">HawkBucks Control Center</span>
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="cc-btn cc-btn-outline cc-btn-sm"
          >
            View site ↗
          </a>
          <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {props.children}
        </main>

        <footer className="border-t px-4 py-3 text-center cc-hairline sm:px-6">
          <p className="font-mono text-[10px] opacity-40">
            HawkBucks Control Center — restricted surface, never indexed.
          </p>
        </footer>
      </div>

      <CmsToastHost />
    </div>
  );
}

export function CmsNavGlyph(props: { section: CmsSection; large?: boolean }) {
  const glyph: Record<CmsSection, string> = {
    dashboard: "▦",
    heroes: "⚔",
    loadouts: "⛨",
    inventory: "▤",
    articles: "✎",
    media: "◫",
    publishing: "⬆",
    seo: "◎",
    activity: "◷",
    settings: "⚙",
  };
  // Wave 1 — 4A (+ precision pass): expanded rows now use the shared
  // .cc-nav-glyph primitive — a fixed 22px flex-centered box with ~19px
  // visual size so every glyph shares one vertical centerline with its
  // leading-6 label. The collapsed rail keeps its larger 28px glyphs so
  // the narrow column reads as an intentional icon rail.
  return (
    <span
      aria-hidden="true"
      className={cn("cc-nav-glyph leading-none", props.large && "h-7 w-7 text-xl")}
    >
      {glyph[props.section]}
    </span>
  );
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
