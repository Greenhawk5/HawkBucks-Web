# HawkBucks — Frontend Design Plan

A two-page premium gaming site that answers one question in under 3 seconds: *are there V-Bucks missions today?*

## 1. Data assumption

A single data layer owns mission data: `src/lib/missions.types.ts` (Mission, Area, Zone, MissionsResponse) and `src/lib/missions.ts` exposing one async function `getMissions(): Promise<MissionsResponse>`. Today it resolves mock data; later it becomes a `fetch("/api/missions")` call against the Cloudflare Worker — same response shape, zero changes to UI components. Components consume it through a `useMissions()` hook (TanStack Query) so loading/error/empty states are already wired. Both states (missions present / none) are handled by the UI from day one.

## 2. Page structure

```text
/           Home  — Navbar, Hero + StatusBadge, MissionDashboard | EmptyState, UpdateTimer, Footer
/about      About — Navbar, AboutHero, HowItWorks, FeatureCards, Credits, Footer
```

Each route gets its own head() metadata (title, description, og/twitter).

## 3. Component hierarchy

```text
__root
├─ Navbar            logo mark + "HAWKBUCKS" wordmark + Home / About links
├─ <Outlet/>
│  ├─ Home
│  │  ├─ HeroSection      "SAVE THE WORLD" / "V-Bucks Missions Tracker"
│  │  │  └─ StatusBadge   glowing pill: "150 V-BUCKS AVAILABLE" or "NO MISSIONS TODAY"
│  │  ├─ MissionDashboard grouped by area, area header shows index (01, 02…)
│  │  │  └─ MissionCard × n
│  │  │     ├─ MissionIcon   mission-type icon from the bot asset set
│  │  │     ├─ mission name  bold uppercase
│  │  │     ├─ ZoneBadge     zone/biome chip, e.g. "DESERT (BUNKER)"
│  │  │     ├─ PowerBadge    "52 ⚡ POWER"
│  │  │     └─ RewardBadge   "50 ⓥ"
│  │  ├─ EmptyState        V-Bucks icon, pulse ring, reset copy
│  │  └─ UpdateTimer       last updated + next 30-min UTC slot + live countdown
│  └─ About
│     ├─ AboutHero
│     ├─ HowItWorks        4-step flow: Epic API → Worker → Analysis → Website
│     ├─ FeatureCards      4 glass cards
│     └─ Credits
└─ Footer            @HawkBucks_bot handle, project credit
```

Cards mirror the bot output: icon tile left, mission name + zone chip center, power number + reward badge right.

## 4. Design system

Tokens in `src/styles.css` (`@theme inline` + `:root`), oklch only, no hardcoded colors in components.

| Token | Role | Value |
|---|---|---|
| `--background` | deep black-green base | near-black with green cast |
| `--card` | glass panel fill | dark forest green, low alpha |
| `--primary` | neon emerald | vivid `#22e06a`-class green |
| `--primary-glow` | halo / border glow | lighter mint |
| `--accent` | V-Bucks chrome blue | icy blue for coin accents |
| `--destructive` | no-missions red state | neon crimson (mirrors the red bot card) |
| `--muted-foreground` | labels, meta | desaturated green-grey |

Extras: `--gradient-panel` (forest-green diagonal), `--gradient-emerald` (badge fill), `--shadow-glow` (emerald bloom), `--shadow-panel`. Radius `1rem` for panels, `999px` for badges.

Typography: **Sora** headings (bold, uppercase, tight tracking), **Inter** body — loaded via `<link>` in `__root.tsx`, mapped to `--font-display` / `--font-sans`.

## 5. Color palette

- Base: deep black → dark forest green vertical wash, faint low-poly texture overlay.
- Surfaces: translucent forest-green glass, 1px emerald border at ~35% opacity, inner glow.
- Accent: neon emerald for status, borders, numbers, zone chips.
- Alert: crimson is a **status accent only** — used on the StatusBadge and the empty-state icon/border when no missions exist. The page keeps the dark emerald HawkBucks identity; it never turns into a full red error screen.

## 6. Animation strategy

Restrained, purposeful — CSS-first.

- StatusBadge: slow 3s glow pulse on the border; number counts up on mount.
- MissionCard: staggered fade-up on load (60ms apart); hover lifts 2px, border brightens, glow intensifies.
- EmptyState: concentric pulse rings behind the V-Bucks coin.
- UpdateTimer: countdown ticks every second, no layout shift (tabular numerals).
- Nav links: emerald underline sweep on hover.
- All motion respects `prefers-reduced-motion`.

## 7. Responsive behavior

Mobile-first.

- **< 768px**: single column, card becomes two rows (name/zone on top, power + reward on a right-aligned row), hero text scales down. Navbar shows logo + wordmark with a **hamburger button** that opens a slide-in glass drawer holding Home / About (standard mobile nav pattern; closes on link tap and on Escape).
- **640–1024px**: cards full-width in a max-w container, hero badge sits below the title.
- **> 1024px**: max-w 1100px centered column, hero badge inline right of the title (matching the bot header), About features in a 4-up grid.

## 8. Assets

No new artwork is generated. The supplied HawkBucks / Telegram bot assets are the single source of truth, uploaded as CDN asset pointers:

- `logo.png` — navbar, hero, and favicon (square copy in `public/`).
- `vbucks.png` — V-Bucks coin in the StatusBadge, RewardBadge, and empty state.
- `power.png` — power-level indicator.
- `Fight_the_Storm_Single_Atlas.png` and any further mission-type icons — mapped by mission type in a small icon registry, so more bot icons can be dropped in later.

Existing bot branding (uppercase Sora headings, emerald glass panels, chrome V-Bucks accent) is matched rather than reinvented.

## 9. Future-ready

Mission types, areas, and zones are typed enums; the dashboard renders from an array so history views, i18n string extraction, notification opt-ins, and a live API swap all plug into the same data module without touching presentation components.
