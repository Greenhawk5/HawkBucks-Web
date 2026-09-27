// Test-only ESM loader hooks:
// - maps the "@/" tsconfig path alias to src/
// - resolves extensionless relative imports to their .ts files
// - shims import.meta.env for src modules that read VITE_* at module scope
// Used by `npm run test:server` under Node's --experimental-strip-types.
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const frontendDir = path.resolve(srcDir, "..");

function findBuiltRouter() {
  const dir = path.join(frontendDir, ".output", "server", "_ssr");
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith("router-") && entry.endsWith(".mjs")) {
        return path.join(dir, entry);
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const [base, query] = splitQuery(specifier);

  // The SSR router entry cannot load under Node's type-stripping test runner
  // (.tsx + Vite aliases). Point it at the built SSR bundle instead.
  if (base === "#tanstack-router-entry") {
    const built = findBuiltRouter();
    if (built) return nextResolve(pathToFileURL(built).href + query, context);
    throw new Error("Built SSR router not found — run `npm run build` first.");
  }
  if (base === "#tanstack-start-entry") {
    return nextResolve(pathToFileURL(path.join(srcDir, "start.ts")).href + query, context);
  }
  if (base === "#tanstack-start-plugin-adapters") {
    // Resolve to a tiny test shim next to this hook file.
    const shim = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "_tanstack-start-plugin-adapters.mjs",
    );
    return nextResolve(pathToFileURL(shim).href + query, context);
  }

  if (base.startsWith("@/")) {
    const candidate = path.join(srcDir, base.slice(2));
    // Extensionless aliased imports (e.g. "@/lib/preferences") resolve to
    // their .ts source, mirroring the relative-import branch below.
    if (!/\.[cm]?[jt]s$/.test(base)) {
      if (existsSync(`${candidate}.ts`))
        return nextResolve(pathToFileURL(`${candidate}.ts`).href + query, context);
      if (existsSync(`${candidate}.tsx`))
        return nextResolve(pathToFileURL(`${candidate}.tsx`).href + query, context);
    }
    return nextResolve(pathToFileURL(candidate).href + query, context);
  }

  const isRelative = base.startsWith("./") || base.startsWith("../");
  const hasExtension = /\.[cm]?[jt]s$/.test(base) || base.endsWith(".tsx");
  if (isRelative && !hasExtension && context.parentURL?.startsWith(pathToFileURL(srcDir).href)) {
    const tryTs = new URL(`${base}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(tryTs))) return nextResolve(tryTs.href + query, context);
    const tryTsx = new URL(`${base}.tsx`, context.parentURL);
    if (existsSync(fileURLToPath(tryTsx))) return nextResolve(tryTsx.href + query, context);
  }

  return nextResolve(specifier, context);
}

function splitQuery(specifier) {
  const index = specifier.indexOf("?");
  if (index === -1) return [specifier, ""];
  return [specifier.slice(0, index), specifier.slice(index)];
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  const [base] = splitQuery(url);
  if (
    base.startsWith(pathToFileURL(srcDir).href) &&
    (base.endsWith(".ts") || base.endsWith(".tsx"))
  ) {
    // Shim import.meta.env for src modules that may read VITE_* variables at
    // module scope when imported outside Vite.
    result.source = `if (!import.meta.env) import.meta.env = {};\n${result.source}`;
  }
  return result;
}
