# Commit 4 — Phases 16–20 Forensic Audit

## 1. Executive Verdict

**NOT READY FOR COMMIT 4.** The build and automated suites pass, and the reviewed CMS mutations enforce authentication and role capabilities. However, 27 CMS POST server functions omit the required same-origin check, preview responses lack an explicit `no-store` policy, and the V-Bucks guide cluster falls back to an unfiltered article listing. These are unresolved security, draft-isolation, and route-correctness issues.

## 2. Git Working Tree

- **Branch:** `main`, ahead of `origin/main` by 4 commits.
- **Staged files:** None.
- **Working tree:** 91 changed paths plus untracked Phase 16–20 implementation and tests; the complete path list is in `git status --short`.
- **Commit 4 attribution:** Most CMS, article, guide, localization, RTL, and security changes align with Phases 16–20. The broader UI component direction changes and sitemap rewrite need explicit scope confirmation. Four prior-phase docs and tracked diagnostic files are deleted; their purpose should be checked before staging.
- **Temporary/generated artifacts:** Build output in `.output` and `.wrangler` is ignored and did not add tracked changes. No committed build output or test data was found.
- **Sensitive files:** No credential or environment file is tracked in the changed set. Public bundles had no credential values; server output contained credential-handling code but no credential values.
- **History:** HEAD is `91c83f7` (“Phase 15.5 — introduce R2 media provider migration layer”); no Phase 16–20 commit exists yet.

## 3. Phase-by-Phase Verification

### Phase 16

| Requirement | Status | Evidence |
|---|---|---|
| Article model, structured storage, block editor | VERIFIED | `articles.ts` validates a versioned set of block types; `articles.server.ts` persists bodies; admin article route edits them. |
| Safe rendering and media blocks | VERIFIED | `ArticleBody.tsx` renders validated React nodes and resolves image asset IDs through the media resolver; no article HTML passthrough. |
| Entity linking and references | VERIFIED | `content-types.ts` defines the reference registry; `articles.server.ts` validates and persists typed references. |
| Categories, tags, related content | VERIFIED | Article persistence and public loader implement category/tag joins, explicit related rows, and published-only filters. |
| Draft/publish and preview token | PARTIAL | Published selectors filter status; preview tokens are random, hash-stored, expiring and revocable. Preview route does not set response `Cache-Control: no-store`. |
| Localization and SEO | PARTIAL | Localized routes and article metadata exist; full runtime/SEO behavior was not browser-tested. |
| Article JSON-LD | VERIFIED | Public content helper builds article structured data from validated, published content. |
| Body image batching and missing media | VERIFIED | `resolveArticleBodyImageUrls()` deduplicates/caps IDs and resolves them in one query; missing/deleted rows produce no URL. |

### Phase 17

| Requirement | Status | Evidence |
|---|---|---|
| V-Bucks, Heroes, Loadouts, Inventory guide clusters | PARTIAL | Cluster routes exist, but V-Bucks mapping is set to `undefined`, triggering unfiltered `listPublicArticles()` in both guide detail routes. |
| Editorial internal linking | VERIFIED | Article entity references and `RelatedGuides` provide public internal links with locale paths. |
| Published-only and locale handling | PARTIAL | Topic queries filter published articles and use the requested locale; missing translations yield no topic result. Guide hreflang is generated for every supported locale. |
| Cluster SEO | PARTIAL | Title, description, canonical, OG/Twitter text, JSON-LD, and hreflang are present. Localized cluster route lacks OG image while declaring `summary_large_image`. |

### Phase 18

| Requirement | Status | Evidence |
|---|---|---|
| Persian and Arabic RTL | VERIFIED | Locale direction is resolved at the root; `fa-IR` and `ar-SA` are RTL in source and tests. |
| Logical CSS and layout mirroring | PARTIAL | Changed components use logical utilities in many places; remaining physical positioning in shared UI components requires a broader source audit. |
| Sidebar, forms, dialogs, tables, focus | PARTIAL | Source and targeted tests cover several shared controls; no real visual browser check was performed. |
| CMS direction and English-only labels | VERIFIED | CMS stays English-only as specified; admin shell is not localized. |
| Responsive behavior | PARTIAL | Responsive utilities and tests exist; no viewport browser verification was available. |

### Phase 19

| Requirement | Status | Evidence |
|---|---|---|
| Article listing | VERIFIED | SQL applies published filter, locale join, `LIMIT/OFFSET`, excerpt join; it does not select `body_json`. |
| Detail batching and entity listing | VERIFIED | Independent reads use `Promise.all`; `listPublishedByEntity()` uses one joined query. |
| Image resolution | VERIFIED | Batched, deduplicated, capped, missing/deleted-safe media lookup. |
| LCP and below-fold images | VERIFIED | Article covers are eager/high-priority; body images are lazy with async decoding. |
| Client/server isolation and route splitting | VERIFIED | Production build emits public route chunks separately from CMS/server modules. |
| Cache policy | PARTIAL | Hashed assets are immutable and service worker is no-cache. Preview/draft/CMS response protections are not explicit in `_headers` or the preview route. |
| D1 semantics | PARTIAL | Query filters and ordering were source-reviewed; not every optimized query was behavior-compared against its previous implementation. |
| Bundle/image/R2/Worker/CWV audit | PARTIAL | Build output confirms route splitting; no image transformation or R2 cache optimization is implemented, and no Worker latency/CWV measurements were run. |

### Phase 20

| Requirement | Status | Evidence |
|---|---|---|
| Authentication and password envelope | VERIFIED | PBKDF2-SHA256, 100,000 iterations, 16-byte salt, 32-byte hash; malformed/out-of-range envelopes fail closed. |
| Sessions | VERIFIED | 256-bit random token, hash-only D1 storage, HttpOnly/Secure/SameSite=Lax, expiry, revocation, inactive-user check, role resolution. |
| Authorization | PARTIAL | Reviewed CMS server functions enforce session and capability checks; viewer/editor/admin role separation is present. |
| CSRF origin enforcement | FAILED | Login/logout and media writes call the helper. Article, hero, loadout, and inventory POST handlers do not: 27 mutation endpoints lack same-origin enforcement. |
| Login abuse | PARTIAL | Per-instance username throttle: 10 failures per 10 minutes, reset on success, capped at 500 keys. It is in-memory and not distributed. |
| Upload security | VERIFIED | MIME allowlist, 10 MiB cap, traversal-safe derived key, MIME-derived extension, and magic-byte checks are present. |
| Content sanitization/XSS | VERIFIED | Unknown blocks are rejected; text renders as React nodes; article links allow internal paths or HTTPS only. The one `dangerouslySetInnerHTML` hit is the existing chart style component, unrelated to CMS content. |
| CSP and headers | PARTIAL | HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP, frame protection, and restrictive script policy are present. `img-src` includes unrestricted `https:`, making the image-source policy broader than needed. |
| R2 isolation and deletion | VERIFIED | R2 binding is server-only; keys are validated; deletion checks references before object removal and tombstoning. |
| Preview security | PARTIAL | Token is hashed, expires after one hour, is revocable, and preview route is noindex/non-canonical. Response cache policy is absent. |

## 4. Critical Findings

1. **BLOCKER — CMS mutation origin checks are incomplete**
   - **Location:** `articles-admin.loader.ts`, `heroes-admin.loader.ts`, `loadouts-admin.loader.ts`, `schematics-admin.loader.ts`.
   - **Root cause:** Their POST functions check authentication/authorization but do not call `assertSameOriginForMutation()`.
   - **Impact:** Phase 20’s stated server-side same-origin mutation guarantee does not cover most CMS writes, including publish and editorial changes.
   - **Reproduction:** Send a cross-origin request to an affected server-function POST endpoint with a valid CMS session context; the handler has no explicit origin/referer rejection.
   - **Recommended fix:** Add the same-origin guard to every state-changing CMS handler and test each boundary class.

2. **BLOCKER — Preview HTTP response is not explicitly non-cacheable**
   - **Location:** `frontend/src/routes/articles.preview.tsx:8-18`, `frontend/src/lib/cms/public-articles.loader.ts:377`.
   - **Root cause:** The route sets `noindex` metadata, then loads draft data in a client effect. Neither the route nor server function applies `Cache-Control: no-store`.
   - **Impact:** A tokenized preview request/data response may be cached by an intermediary despite noindex metadata; noindex does not prevent HTTP caching.
   - **Reproduction:** Inspect the preview document and server-function responses; there is no response cache-control policy configured for the preview path/data.
   - **Recommended fix:** Enforce `private, no-store` at the response/server boundary for preview HTML and data, then verify headers.

3. **HIGH — V-Bucks cluster uses an unfiltered article fallback**
   - **Location:** `editorial-clusters.ts:75-82`; `guides.$slug.tsx:31-36`; `$locale.guides.$slug.tsx:50-55`.
   - **Root cause:** Both category and tag maps define V-Bucks as `undefined`; routes fall back to `listPublicArticles()`.
   - **Impact:** `/guides/vbucks-missions` and localized equivalents show the newest articles without topic filtering. This defeats the intended cluster mapping.
   - **Reproduction:** Visit either route with unrelated published articles present; those articles appear in the cluster.
   - **Recommended fix:** Supply the intended V-Bucks tag/category mapping and remove the unfiltered fallback for cluster detail routes.

## 5. Cross-Phase Regression Audit

| Area | Result |
|---|---|
| Articles (16 × 19 × 20) | **Partial:** batching and published filters verified; preview cache issue remains. |
| Guides (17 × 18 × 20) | **Failed:** V-Bucks mapping falls back to all published articles; RTL not browser-verified. |
| Media (16 × 19 × 20) | **Pass:** batched media resolver; missing/deleted safe; image URLs use compatibility layer. |
| CMS (16 × 18 × 20) | **Partial:** CMS remains English-only, but broad origin guard gap exists for mutations. |
| Preview (16 × 19 × 20) | **Failed:** token controls are present, response cache policy is absent. |
| SEO (16 × 17 × 18) | **Partial:** canonical/meta/JSON-LD source present; cluster language alternates and localized OG image need correction/review. |
| Localization (16 × 17 × 18) | **Partial:** locale-specific article routes and RTL direction are present; no browser visual proof. |
| R2 (16 × 19 × 20) | **Pass:** server-only binding, safe keys, validation, deletion protection, batched lookup. |
| Auth (18 × 20) | **Partial:** auth/capabilities work by source; mutation-origin guard incomplete. |
| Admin/client isolation (18 × 19 × 20) | **Pass:** production build separates client routes from CMS server modules. |
| Headers/CSP (19 × 20) | **Partial:** headers present; broad `https:` in `img-src`; SSR and preview cache rules need explicit protection. |
| D1 (16 × 19 × 20) | **Partial:** parameterized queries and bounded article/media reads verified; full semantic comparison not completed. |

## 6. Security Audit

- **Auth, sessions, roles:** Source-level checks are strong: bounded PBKDF2 envelopes, hash-only session storage, secure cookie flags, expiry/revocation/inactive-user checks.
- **Authorization:** Capability checks are present in reviewed admin loaders; UI hiding is not the enforcement boundary.
- **CSRF:** Incomplete on 27 write endpoints. Same-origin and referer predicate tests cover the helper, not all handler wiring.
- **XSS/content:** Article blocks reject unknown types and render as text/React nodes. Link URLs are restricted. Existing chart style injection is not CMS-fed.
- **CSP/headers:** Required headers are present. `img-src https:` is overly broad; scripts remain same-origin, object embeds are blocked, and frame ancestors are denied.
- **Uploads/R2:** Allowlist, size, filename/key, signature, server-only binding, and reference-aware deletion checks are present.
- **Preview:** Hash/expiry/revocation/noindex are present; HTTP no-store is missing.
- **Rate limit:** Bounded in-memory throttle is per instance only; not a distributed control.
- **Error leakage:** No credential values found in public bundle; build output contains server code references but not secrets. Full deployed error behavior was not tested.

## 7. Data / SEO Audit

- Published-only filtering is present on public article/entity/topic queries.
- Draft preview is token-gated and separated from public selectors; response caching remains unresolved.
- Article locale selection is explicit; article hreflang uses completed locales.
- Guide clusters emit canonical/hreflang and JSON-LD; x-default is present in the helper.
- Article structured data is built from validated published data.
- Sitemap includes static `/articles` and `/guides` entries; it does not include dynamic article or guide-detail URLs or admin routes, matching the stated sitemap decision.
- V-Bucks guide topic selection is incorrect due to the unset map.
- Localized guide OG image is absent.

## 8. Performance Audit

- Article listing: bounded SQL pagination, excerpt join, no `body_json`.
- Article detail: concurrent independent reads; body image IDs batch in one query.
- Entity listing: one joined query rather than translation N+1.
- Cover image eager/high priority; body images lazy.
- Build: 2,153 modules transformed; route chunks split; CMS auth/db/media server modules appear only under `.output/server`.
- Hashed assets immutable; `sw.js` no-cache.
- Preview/CMS response cache behavior not explicitly protected; no LCP/CWV measurements were generated.
- No performance claims are based on Lighthouse or production timings.

## 9. Test Results

**Frontend:** `npm run test:server` — **286 passed, 0 failed**.

**TypeScript:** `npx tsc --noEmit` — passed.

**Lint:** passed with **0 errors, 15 warnings**.

**Build:** `npm run build` — passed.

**Worker:** `npm test` from `worker/` — passed. The output is truncated in this report capture, so I cannot state the exact test count reliably.

**Security tests:** `cms-security-phase20.test.mjs` is included in the 286 frontend tests. Its individual security assertions were not separately counted in the captured output. It does not test that every CMS mutation wires the origin guard or that preview responses carry no-store.

## 10. Browser / Runtime

- **Tested:** Source-level route, query, auth, SEO and security review; frontend test suite; production build output.
- **Not tested:** Real browser smoke tests, local HTTP preview route responses, actual CMS login/logout/publish operations, live R2 media delivery, focus/keyboard behavior, visual RTL/responsive rendering.
- **Unavailable:** No browser automation was used for this audit. No production Cloudflare, D1, R2, or secret mutation/verification was performed.

## 11. Remaining Issues

### Blockers

- Add origin/referer checking to all CMS state-changing endpoints.
- Set `private, no-store` for preview HTML/data responses.

### High

- Set the V-Bucks cluster’s intended tag/category mapping; remove the unfiltered route fallback.

### Medium

- Tighten CSP `img-src` to approved image origins instead of all HTTPS sources.
- Add localized cluster OG image or use a card type consistent with no image.
- Complete the broader source-only audit of remaining physical-direction assumptions and query semantics.

### Low

- Lint reports 15 Fast Refresh warnings.
- Verify whether the unrelated UI polishing and deleted diagnostic files belong in Commit 4.

### Informational

- Login rate limiting is in-memory and per-instance.
- No new direct runtime dependency was added in `frontend/package.json`; lockfile includes platform-specific `sharp` packages transitively through tooling, not article/media client code.

### Production/manual actions

- Phase 20’s `todo.txt` security items remain unchecked. No secrets, D1, Worker, R2, backup, deployment, or production verification was performed.

### Deferred items

- Phase 19 bundle audit, image optimization, R2 caching optimization, Worker latency audit, and Core Web Vitals remain unchecked in `todo.txt`; build splitting alone does not complete these.
- Phases 21+ testing, sitemap validation, production checks, and release tasks remain outside this audit scope.

## 12. Todo Checkbox Reconciliation

| Phase | Checkbox | Status | Evidence |
|---|---|---|---|
| 16 | Article/content model | VERIFIED | `articles.ts`, migration `0010`. |
| 16 | Rich text editor | VERIFIED | Admin article route edits structured blocks. |
| 16 | Structured content storage | VERIFIED | `articles.server.ts` stores validated JSON body. |
| 16 | Safe content rendering | VERIFIED | `ArticleBody.tsx` React-node renderer. |
| 16 | Article media support | VERIFIED | Asset-ID blocks resolve through media compatibility layer. |
| 16 | Entity linking | VERIFIED | Typed refs and internal links. |
| 16 | Hero references | VERIFIED | Canonical `hero` registry type. |
| 16 | Loadout references | VERIFIED | Canonical `loadout` registry type. |
| 16 | Weapon references | VERIFIED | Canonical `weapon` registry type. |
| 16 | Trap references | VERIFIED | Canonical `trap` registry type. |
| 16 | Perk references | VERIFIED | Canonical `perk` registry type. |
| 16 | Schematic references | VERIFIED | Canonical `schematic` registry type. |
| 16 | Categories | VERIFIED | Category tables, validators, and topic query. |
| 16 | Tags | VERIFIED | Tag tables and article-tag links. |
| 16 | Draft/publish workflow | VERIFIED | Capability-gated writes and published-only public readers. |
| 16 | Preview workflow | PARTIAL | Hash/expiry/revocation; no response no-store. |
| 16 | Localization | VERIFIED | Localized article routes and locale-specific loader inputs. |
| 16 | SEO metadata | VERIFIED | Article head metadata, canonical, alternates. |
| 16 | Article structured data | VERIFIED | Published article JSON-LD helper. |
| 16 | Related content system | VERIFIED | Explicit and category fallback with published filter. |
| 17 | V-Bucks Missions cluster | FAILED | Map is unset; routes use unfiltered article listing. |
| 17 | Heroes cluster | VERIFIED | Cluster routes and category/tag query. |
| 17 | Loadouts cluster | VERIFIED | Cluster routes and category/tag query. |
| 17 | Inventory cluster | VERIFIED | Cluster routes and category/tag query. |
| 17 | Editorial internal linking | VERIFIED | Related guide and entity links. |
| 18 | Persian RTL | VERIFIED | `fa-IR` direction configuration and tests. |
| 18 | Arabic RTL | VERIFIED | `ar-SA` direction configuration and tests. |
| 18 | Layout mirroring | PARTIAL | Logical utilities and mirrored control variants; physical offsets remain in shared UI. |
| 18 | Sidebar audit | PARTIAL | Source review only; no browser visual check. |
| 18 | Forms audit | PARTIAL | Logical form classes/source review; no browser visual check. |
| 18 | CMS RTL audit | VERIFIED | CMS is intentionally English-only; admin shell remains English. |
| 19 | Bundle audit | PARTIAL | Production output inspected; no full size/budget audit. |
| 19 | Image optimization | PARTIAL | Lazy/eager policy checked; no responsive/format optimization. |
| 19 | R2 caching optimization | PARTIAL | Stable media URLs observed; no cache header optimization verified. |
| 19 | Worker latency audit | PARTIAL | No latency measurements or production runtime check. |
| 19 | D1 optimization | VERIFIED | Joined listing/detail query changes and batch image resolution confirmed. |
| 19 | Core Web Vitals | PARTIAL | Not measured; no Lighthouse/CWV claim. |
| 20 | CMS security audit | FAILED | Mutation CSRF guard missing from most POST server functions. |
| 20 | Auth review | VERIFIED | PBKDF2 parameters, envelope validation, no-default bootstrap. |
| 20 | Session review | VERIFIED | Secure cookie, token hashing, expiry/revocation/inactive user check. |
| 20 | Upload security | VERIFIED | MIME, size, extension derivation, key validation, magic bytes. |
| 20 | Content sanitization | VERIFIED | Validated block allowlist and text rendering. |
| 20 | XSS audit | PARTIAL | Relevant CMS render paths checked; existing chart style injection is unrelated. |

## 13. Commit 4 Gate

- [ ] No blockers
- [x] No high-severity unresolved regression beyond listed HIGH item? **No — V-Bucks cluster remains HIGH**
- [x] Build passes
- [x] TypeScript passes
- [ ] Lint has no errors — **passes with 0 errors**
- [x] Frontend tests pass
- [x] Worker tests pass
- [ ] Security audit passed
- [ ] Public/admin boundary passed
- [ ] Published/draft isolation passed
- [ ] SEO/localization passed
- [ ] Phase 19 semantics preserved — **partially source-verified**
- [ ] Phase 20 security semantics preserved
- [ ] No unrelated dangerous changes — **scope attribution unresolved**
- [x] No secrets exposed in inspected client output

## 14. Final Decision

**NOT READY FOR COMMIT 4**

Minimum remediation before Commit 4:

1. Enforce same-origin checks in all CMS POST mutation handlers and add handler-wiring coverage.
2. Set and verify `private, no-store` on preview HTML and preview data responses.
3. Correct the V-Bucks cluster mapping and remove the unfiltered article fallback.
4. Re-run frontend tests, TypeScript, lint, and build; then review the mixed UI/docs/sitemap changes for Commit 4 attribution.

No files were modified; no commit, push, deploy, remote migration, production configuration change, or production data operation was performed.