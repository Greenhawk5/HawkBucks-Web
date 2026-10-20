import { z } from "zod";

export const FEATURE_KEYS = ["heroes", "schematics", "loadouts", "guides"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureSetting {
  enabled: boolean;
  message: string;
}

export type FeatureAvailabilityConfig = Record<FeatureKey, FeatureSetting>;

export const DEFAULT_FEATURE_MESSAGES: Record<FeatureKey, string> = {
  heroes: "The Heroes section is temporarily unavailable while we make improvements.",
  schematics: "The Schematics section is temporarily unavailable. Please check back later.",
  loadouts: "The Loadouts section is temporarily unavailable while we work on improvements.",
  guides: "The Guides section is temporarily unavailable. We appreciate your patience.",
};

export const DEFAULT_FEATURE_AVAILABILITY: FeatureAvailabilityConfig = {
  heroes: {
    enabled: true,
    message: DEFAULT_FEATURE_MESSAGES.heroes,
  },
  schematics: {
    enabled: true,
    message: DEFAULT_FEATURE_MESSAGES.schematics,
  },
  loadouts: {
    enabled: true,
    message: DEFAULT_FEATURE_MESSAGES.loadouts,
  },
  guides: {
    enabled: true,
    message: DEFAULT_FEATURE_MESSAGES.guides,
  },
};

export const FEATURE_METADATA: Record<
  FeatureKey,
  { label: string; route: string; description: string }
> = {
  heroes: {
    label: "Heroes",
    route: "/heroes",
    description: "Hero codex, tier progression, perks, abilities, and hero detail pages.",
  },
  schematics: {
    label: "Schematics",
    route: "/schematics",
    description: "Weapons, traps, perks, and schematic detail pages.",
  },
  loadouts: {
    label: "Loadouts",
    route: "/loadouts",
    description: "Hero commander and support team loadouts.",
  },
  guides: {
    label: "Guides",
    route: "/guides",
    description: "STW game guides, tutorials, and editorial articles.",
  },
};

export const MAX_MESSAGE_LENGTH = 500;

/**
 * Sanitize untrusted administrator copy:
 * - Collapses raw HTML angle brackets into safe text entities.
 * - Trims leading and trailing whitespace.
 * - Enforces max length bound.
 * - Falls back to the section default message when empty.
 */
export function sanitizeMessage(raw: unknown, feature: FeatureKey): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    return DEFAULT_FEATURE_MESSAGES[feature];
  }
  const clean = raw.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return clean.slice(0, MAX_MESSAGE_LENGTH);
}

export const featureSettingSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(MAX_MESSAGE_LENGTH),
});

export const featureAvailabilitySchema = z.object({
  heroes: featureSettingSchema,
  schematics: featureSettingSchema,
  loadouts: featureSettingSchema,
  guides: featureSettingSchema,
});

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}

export type BulkAvailabilityState = "all_enabled" | "all_disabled" | "mixed";

export function computeBulkState(config: FeatureAvailabilityConfig): BulkAvailabilityState {
  const values = FEATURE_KEYS.map((k) => config[k].enabled);
  const enabledCount = values.filter(Boolean).length;
  if (enabledCount === FEATURE_KEYS.length) return "all_enabled";
  if (enabledCount === 0) return "all_disabled";
  return "mixed";
}
