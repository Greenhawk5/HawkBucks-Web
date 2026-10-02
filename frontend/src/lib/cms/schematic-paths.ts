/**
 * Content Platform — canonical schematic path helpers (PURE LOGIC).
 *
 * Canonical IA (Master Spec §1.5): /schematics + /schematics/:slug.
 * Legacy /inventory/* URLs are preserved via permanent redirect, never as
 * canonical content. Entity links inside article bodies also resolve here so
 * every surface points at the canonical path.
 */

export function schematicHubPath(): string {
  return "/schematics";
}

export function schematicDetailPath(slug: string): string {
  return `/schematics/${slug}`;
}

export function schematicLocalizePath(basePath: string, locale: string): string {
  return locale === "en" ? basePath : `/${locale}${basePath}`;
}

/** Legacy /inventory detail path → canonical /schematics redirect target. */
export function legacyInventoryToSchematic(slug: string, locale: string): string {
  return schematicLocalizePath(schematicDetailPath(slug), locale);
}
