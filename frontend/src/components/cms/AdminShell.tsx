import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export type AdminSection = "dashboard" | "heroes" | "loadouts" | "inventory" | "media" | "articles";

export type AdminBackTo =
  | "/admin"
  | "/admin/heroes"
  | "/admin/loadouts"
  | "/admin/inventory"
  | "/admin/media"
  | "/admin/articles";

const NAV_ITEMS: Array<{ section: AdminSection; to: AdminBackTo; label: string }> = [
  { section: "dashboard", to: "/admin", label: "Dashboard" },
  { section: "heroes", to: "/admin/heroes", label: "Heroes" },
  { section: "loadouts", to: "/admin/loadouts", label: "Loadouts" },
  { section: "inventory", to: "/admin/inventory", label: "Inventory" },
  { section: "media", to: "/admin/media", label: "Media" },
  { section: "articles", to: "/admin/articles", label: "Articles" },
];

export function AdminNav(props: { active: AdminSection }) {
  return (
    <nav aria-label="CMS sections" className="mt-4 border-b pb-2">
      <ul className="flex flex-wrap gap-4 text-sm">
        {NAV_ITEMS.map((item) => (
          <li key={item.section}>
            {item.section === props.active ? (
              <span aria-current="page" className="font-semibold">
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AdminPage(props: {
  active: AdminSection;
  title: string;
  description?: string;
  backTo?: AdminBackTo;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <AdminNav active={props.active} />
      <h1 className="mt-6 text-2xl font-bold">{props.title}</h1>
      {props.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{props.description}</p>
      ) : null}
      {props.children}
      {props.backTo ? (
        <p className="mt-8 text-sm">
          <Link to={props.backTo} className="underline">
            Back to admin
          </Link>
        </p>
      ) : null}
    </main>
  );
}

export function AdminSignInGate(props: { title: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">{props.title}</h1>
      <p className="mt-2 text-sm">
        <Link to="/admin" className="underline">
          Sign in
        </Link>
        .
      </p>
    </main>
  );
}

export function AdminError(props: { error: string | null }) {
  if (!props.error) return null;
  return (
    <p role="alert" className="mt-3 text-sm text-red-600">
      {props.error}
    </p>
  );
}

export function AdminNotice(props: { message: string | null }) {
  if (!props.message) return null;
  return <p className="mt-3 text-sm text-green-700">{props.message}</p>;
}

export function AdminEmpty(props: { message: string }) {
  return <p className="mt-6 text-sm text-muted-foreground">{props.message}</p>;
}

/** Route-level fallback when a loader throws (e.g. unknown contentId). */
export function AdminRouteError(props: { title: string; backTo: AdminBackTo; error: unknown }) {
  const detail = props.error instanceof Error ? props.error.message : "Something went wrong.";
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">{props.title}</h1>
      <p role="alert" className="mt-2 text-sm text-red-600">
        {detail}
      </p>
      <p className="mt-4 text-sm">
        <Link to={props.backTo} className="underline">
          Back
        </Link>
        .
      </p>
    </main>
  );
}

/** Lightweight loading fallback for admin routes while loaders resolve. */
export function AdminPending(props: { title: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16" aria-busy="true">
      <h1 className="text-2xl font-bold">{props.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}
