// Test-only ESM loader hooks:
// - maps the "@/" tsconfig path alias to src/
// - resolves extensionless relative imports to their .ts files
// - shims import.meta.env for src modules that read VITE_* at module scope
// Used by `npm run test:server` under Node's --experimental-strip-types.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

export async function resolve(specifier, context, nextResolve) {
  const [base, query] = splitQuery(specifier);

  if (base.startsWith("@/")) {
    return nextResolve(pathToFileURL(path.join(srcDir, base.slice(2))).href + query, context);
  }

  const isRelative = base.startsWith("./") || base.startsWith("../");
  const hasExtension = /\.[cm]?[jt]s$/.test(base);
  if (isRelative && !hasExtension && context.parentURL?.startsWith(pathToFileURL(srcDir).href)) {
    const candidate = new URL(`${base}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) {
      return nextResolve(candidate.href + query, context);
    }
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
  if (base.startsWith(pathToFileURL(srcDir).href) && base.endsWith(".ts")) {
    // Shim import.meta.env for src modules that may read VITE_* variables at
    // module scope when imported outside Vite.
    result.source = `if (!import.meta.env) import.meta.env = {};\n${result.source}`;
  }
  return result;
}
