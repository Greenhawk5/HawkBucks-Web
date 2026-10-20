import { createServerFn } from "@tanstack/react-start";
import { featureAvailabilitySchema, type FeatureAvailabilityConfig } from "./feature-availability";

/**
 * Public-safe reader returning the current availability configuration.
 * Used by route loaders to determine whether to render the unavailable view
 * or proceed with normal page execution.
 */
export const getPublicFeatureStatus = createServerFn({ method: "GET" })
  .validator((input?: { feature?: string }) => input)
  .handler(async (): Promise<{ config: FeatureAvailabilityConfig }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { getFeatureAvailability } = await import("./feature-availability.server");
    const { db, env } = await resolveRequestCmsDb();
    const { config } = await getFeatureAvailability(db, env);
    return { config };
  });

/**
 * Admin loader for the Control Center Settings console.
 * Requires an active authenticated session.
 */
export const getFeatureAvailabilityAdmin = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async (): Promise<{ config: FeatureAvailabilityConfig; updatedAt: string }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { resolveRequestSession, CmsAuthError } = await import("./auth.server");
    const { getFeatureAvailability } = await import("./feature-availability.server");
    const { db, env } = await resolveRequestCmsDb();
    const session = await resolveRequestSession(db);
    if (!session) throw new CmsAuthError(401, "CMS authentication required.");
    return getFeatureAvailability(db, env);
  });

export interface UpdateFeatureAvailabilityInput {
  config: FeatureAvailabilityConfig;
  expectedUpdatedAt?: string | undefined;
}

/**
 * Privileged mutation to update section availability and custom maintenance copy.
 * Enforces:
 * 1. CSRF same-origin verification.
 * 2. Active session verification.
 * 3. Administrator capability (`cms.admin`).
 * 4. Optimistic concurrency check via expectedUpdatedAt.
 */
export const updateFeatureAvailabilityAdmin = createServerFn({ method: "POST" })
  .validator((input: UpdateFeatureAvailabilityInput) => {
    const parsedConfig = featureAvailabilitySchema.safeParse(input.config);
    if (!parsedConfig.success) {
      throw new Error(`Invalid configuration: ${parsedConfig.error.message}`);
    }
    return {
      config: parsedConfig.data as FeatureAvailabilityConfig,
      expectedUpdatedAt:
        typeof input.expectedUpdatedAt === "string" ? input.expectedUpdatedAt : undefined,
    };
  })
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; config: FeatureAvailabilityConfig; updatedAt: string }> => {
      const { resolveRequestCmsDb } = await import("./db.server");
      const auth: typeof import("./auth.server") = await import("./auth.server");

      // CSRF guard first
      auth.assertSameOriginForMutation();

      const { db, env } = await resolveRequestCmsDb();
      const session = await auth.resolveRequestSession(db);
      if (!session) throw new auth.CmsAuthError(401, "CMS authentication required.");

      // Enforce admin capability
      auth.requireCapability(session, "cms.admin");

      const { saveFeatureAvailability } = await import("./feature-availability.server");
      return saveFeatureAvailability(
        db,
        {
          config: data.config,
          expectedUpdatedAt: data.expectedUpdatedAt,
        },
        session.user,
        env,
      );
    },
  );
