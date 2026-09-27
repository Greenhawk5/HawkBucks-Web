/**
 * Commit 4 — centralized CMS mutation inventory (PURE LOGIC, client-safe).
 *
 * Every CMS state-changing server function MUST enforce, in order:
 *   1. authentication/session
 *   2. capability/role authorization
 *   3. same-origin mutation validation via assertSameOriginForMutation()
 *
 * This inventory is the single source of truth consumed by
 * test/commit4-remediation.test.mjs: the test asserts that the POST exports
 * found in each loader file exactly match this list, so a future mutation
 * handler cannot silently omit the guard without breaking the suite.
 *
 * Scope: CMS state-changing mutations only. Explicitly out of scope:
 * - GET/read-only operations (must remain guard-free).
 * - frontend/src/services/push.loader.ts subscribe/unsubscribePush: Phase 8
 *   non-CMS push subscription transport (no CMS state, no session
 *   capability model); unchanged by this remediation.
 */

export interface CmsMutationInventoryEntry {
  file: string;
  mutations: string[];
  families: string[];
}

export const CMS_MUTATION_INVENTORY: CmsMutationInventoryEntry[] = [
  {
    file: "../src/lib/cms/articles-admin.loader.ts",
    mutations: [
      "createAdminArticle",
      "saveAdminArticleBody",
      "publishAdminArticle",
      "createAdminCategory",
      "createAdminTag",
      "setAdminArticleRefs",
      "setAdminArticleRelated",
      "setAdminArticleTags",
      "previewAdminArticle",
    ],
    families: [
      "create",
      "update",
      "publish/unpublish",
      "translation changes",
      "relation changes",
      "media association changes",
      "preview token issuance",
    ],
  },
  {
    file: "../src/lib/cms/heroes-admin.loader.ts",
    mutations: [
      "createAdminHero",
      "updateAdminHero",
      "deleteAdminAbility",
      "publishAdminContent",
      "upsertAdminTranslation",
    ],
    families: ["create", "update", "delete", "publish/unpublish", "translation changes"],
  },
  {
    file: "../src/lib/cms/loadouts-admin.loader.ts",
    mutations: [
      "createAdminLoadout",
      "updateAdminLoadout",
      "setAdminLoadoutHeroes",
      "upsertAdminAbility",
    ],
    families: ["create", "update", "attach/detach", "relation changes"],
  },
  {
    file: "../src/lib/cms/schematics-admin.loader.ts",
    mutations: [
      "createAdminWeapon",
      "updateAdminWeapon",
      "createAdminTrap",
      "updateAdminTrap",
      "createAdminPerk",
      "upsertAdminPerkTranslation",
      "createAdminSchematic",
      "setAdminSchematicPerks",
      "publishAdminInventoryContent",
    ],
    families: [
      "create",
      "update",
      "publish/unpublish",
      "translation changes",
      "attach/detach",
      "relation changes",
    ],
  },
  {
    file: "../src/lib/cms/media-admin.loader.ts",
    mutations: ["uploadAdminMedia", "deleteAdminMedia"],
    families: ["create", "delete", "media association changes", "upload magic-byte validation"],
  },
  {
    file: "../src/lib/cms/admin.loader.ts",
    mutations: ["adminLogin", "adminLogout"],
    families: ["session issuance", "session revocation", "login throttle"],
  },
];

export function allCmsMutationNames(): string[] {
  return CMS_MUTATION_INVENTORY.flatMap((entry) => entry.mutations);
}
