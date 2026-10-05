import type { ReactNode } from "react";

import { CmsFormSection } from "./CmsPrimitives";

/**
 * Wave 1 fix pass — dedicated Media section for object editors.
 *
 * WHY A SECTION, NOT JUST A NARROWER FIELD
 * ---------------------------------------
 * `CmsMediaField` renders a live thumbnail, metadata lines, and four controls.
 * Dropped into the same two-column grid as `Class` / `Rarity` / `Popularity`,
 * one media field is three to four times taller than its neighbours, so the
 * whole row stretches, unrelated fields drift apart, and the metadata block
 * stops reading as a scannable matrix. Making the field narrower does not fix
 * that — the height is the problem.
 *
 * So media gets its OWN section, below the metadata section, and the metadata
 * grid goes back to being metadata only. That is the same visual language the
 * CMS already uses for every other grouping (CmsFormSection is what Identity,
 * Roster, Abilities and the rest already use), so this introduces no new design
 * system.
 *
 * Scope note: this wrapper is layout only. `CmsMediaField` is unchanged — every
 * capability it gained in Wave 1 (edit the id, Upload, Replace, Select
 * existing, Preview, Clear, loading and error states) is preserved.
 *
 * Editors with no object-level media simply do not render this and are
 * unaffected.
 */
export function CmsMediaSection(props: { children: ReactNode }) {
  return (
    <CmsFormSection
      title="Media"
      description="Image references, stored as Media Asset ids. Upload inline or pick an existing asset; the reference is saved with the record."
    >
      {/* Stacked, never a grid: two media fields side by side is the same
          crowding problem this section exists to solve. */}
      <div className="space-y-4">{props.children}</div>
    </CmsFormSection>
  );
}
