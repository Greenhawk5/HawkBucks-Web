import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { adminLogin, adminLogout, getAdminSession } from "@/lib/cms/admin.loader";

/**
 * Phase 11 — minimal admin shell (proof-of-concept, deliberately unpolished).
 *
 * Security properties (enforced server-side, not by this UI):
 *  - The loader resolves the session through getAdminSession; anonymous users
 *    see ONLY the login form — no CMS data is fetched without a session.
 *  - Every mutation/query behind this shell re-checks authorization in its
 *    server function (requireCapability). Hiding UI enforces nothing.
 *  - This route is intentionally absent from public navigation
 *    (src/lib/navigation.ts untouched) and is always noindex, nofollow with
 *    no canonical URL, so it can never enter search indexes or sitemaps.
 */

export const Route = createFileRoute("/admin/")({
  loader: async () => getAdminSession(),
  head: () => ({
    meta: [{ title: "CMS Admin — HawkBucks" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminShell,
});

function AdminShell() {
  const session = Route.useLoaderData();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await adminLogin({ data: { username, password } });
      setPassword("");
      await router.invalidate();
    } catch {
      setError("Invalid credentials.");
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    await adminLogout();
    await router.invalidate();
  }

  if (!session.authenticated || !session.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">CMS Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Restricted area. Authentication is verified server-side on every request.
        </p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Username</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">CMS Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {session.user.displayName} ({session.user.username}, {session.user.role}).
      </p>
      <nav className="mt-6">
        <ul className="list-disc pl-5 text-sm">
          <li>
            <Link to="/admin/heroes" className="underline">
              Heroes
            </Link>
          </li>
          <li>
            <Link to="/admin/loadouts" className="underline">
              Loadouts
            </Link>
          </li>
          <li>
            <Link to="/admin/media" className="underline">
              Media library (foundation proof-of-concept)
            </Link>
          </li>
        </ul>
      </nav>
      <button type="button" onClick={handleLogout} className="mt-8 rounded border px-4 py-2">
        Sign out
      </button>
    </main>
  );
}
