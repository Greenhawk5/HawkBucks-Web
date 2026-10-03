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
 * Re-verified 2026-10-02 against Epic Games' own published announcement
 * ("Save the World Goes Free-to-Play April 16, 2026", posted by the Save the
 * World Communities Team on Epic's own community forums), which states:
 *
 *   "Founders will continue earning V-Bucks through Daily Quests, Mission
 *    Alerts, Storm Shield Defense Missions, and existing Challenges."
 *
 * That confirms three of the four claims below: the free-to-play date
 * (2026-04-16), that V-Bucks from Save the World remain a Founder benefit,
 * and the specific activities that pay. The Founder cutoff (2020-06-29, the
 * day Epic ended early access and stopped selling Founder editions) is
 * corroborated by the recorded development history of the mode.
 *
 * NOT VERIFIED: `STANDARD_VBUCKS_REWARD`. Epic does not publish a standing
 * per-alert V-Bucks figure, and the live mission API is not publicly
 * reachable (the Worker disables its workers.dev subdomain and is only bound
 * internally). It is therefore treated as a CURRENTLY OBSERVED example, never
 * as a rule — see the wording in `guide.rewardBody` / `guide.rewardEyebrow`.
 * The live tracker reads the real per-mission reward from Epic's alert data
 * at request time and never consults this constant, so the tracker stays
 * correct regardless.
 *
 * Epic's own support pages return HTTP 403 to automated fetches, so future
 * reviews must be done by hand. Update `LAST_REVIEWED_ISO` when they are.
 */

/**
 * A V-Bucks Mission Alert reward value currently observed by HawkBucks.
 *
 * NOT a rule, NOT a guarantee, and NOT published by Epic — see the review
 * status above. Every surface that renders it must frame it as an example of
 * today's observed value and point at the live tracker for the real number.
 */
export const STANDARD_VBUCKS_REWARD = 50;

/** Date Save the World became free-to-play for all players (brief §2.1). */
export const STW_FREE_TO_PLAY_DATE = "2026-04-16";

/** Purchase-before cutoff that defines Founder eligibility (brief §2.2). */
export const FOUNDER_CUTOFF_DATE = "2020-06-29";

/**
 * Human-readable "last reviewed" label shown in the Guide's trust section.
 * Update this whenever the facts above are re-checked against Epic sources.
 */
export const LAST_REVIEWED_ISO = "2026-10";

/** Epic Games support hub cited as the primary source in the Guide. */
export const EPIC_SUPPORT_URL = "https://www.epicgames.com/help/";
