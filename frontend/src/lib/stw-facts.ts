/**
 * Save the World factual constants — the single source of truth for the
 * Missions Guide's policy/reward statements.
 *
 * Every "50 V-Bucks", "April 16, 2026", and "June 29, 2020" statement on the
 * public site reads from here, so a future Epic policy change is a one-line
 * edit rather than a hunt through JSX and nine translation dictionaries.
 *
 * REVIEW STATUS — read before trusting these values.
 *
 * These are the figures supplied in the Missions Guide redesign brief. They
 * were NOT independently re-verified during implementation: the Epic support
 * pages referenced by the brief return HTTP 403 to automated fetches, and the
 * live mission API is not publicly reachable (the Worker disables its
 * workers.dev subdomain and is only bound internally). The live tracker reads
 * the real per-mission reward from Epic's alert data at request time and never
 * consults `STANDARD_VBUCKS_REWARD` — so the tracker stays correct regardless,
 * while the Guide's prose is only as current as this constant.
 *
 * Before the Guide is treated as authoritative, re-check each value against
 * Epic's official support material and update `LAST_REVIEWED_ISO` below.
 */

/** Current standard V-Bucks Mission Alert reward (brief §4 / §11). */
export const STANDARD_VBUCKS_REWARD = 50;

/** Date Save the World became free-to-play for all players (brief §2.1). */
export const STW_FREE_TO_PLAY_DATE = "2026-04-16";

/** Purchase-before cutoff that defines Founder eligibility (brief §2.2). */
export const FOUNDER_CUTOFF_DATE = "2020-06-29";

/**
 * Human-readable "last reviewed" label shown in the Guide's trust section.
 * Update this whenever the facts above are re-checked against Epic sources.
 */
export const LAST_REVIEWED_ISO = "2026-09";

/** Epic Games support hub cited as the primary source in the Guide. */
export const EPIC_SUPPORT_URL = "https://www.epicgames.com/help/";
