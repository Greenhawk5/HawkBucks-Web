import { MediaIcon } from "@/components/heroes/HeroReferenceBits";
import { gameItemInitials, resolveGameItemIconUrl } from "@/lib/catalog-icons";
import { cn } from "@/lib/utils";

/**
 * Catalog-backed icon for CMS and shared surfaces.
 *
 * The single renderer for game-item imagery: `MediaIcon` owns the image /
 * placeholder / onError behavior (never a broken-image glyph, fixed slot so
 * swaps never shift layout). This wrapper only applies the catalog precedence
 * (override -> catalog -> definition -> placeholder) and derives accessible
 * text + placeholder initials from the item name.
 *
 * Public hero/weapon/trap/schematic displays keep their existing components
 * (ResourceCostChip, EntityCardMedia, ...): the override-aware server readers
 * already resolve the same precedence into a single `iconUrl`, so both paths
 * render the same pixels from the same rule.
 */
export function GameItemIcon({
  overrideUrl,
  catalogUrl,
  definitionUrl,
  iconUrl,
  name,
  sizeClass = "h-8 w-8",
  className,
  labelled = false,
}: {
  overrideUrl?: string | null;
  catalogUrl?: string | null;
  definitionUrl?: string | null;
  /** Pre-resolved URL (server readers); used when the pieces are already joined. */
  iconUrl?: string | null;
  name: string;
  sizeClass?: string;
  className?: string;
  labelled?: boolean;
}) {
  const url =
    iconUrl !== undefined
      ? (typeof iconUrl === "string" && iconUrl.trim() !== "" ? iconUrl : null)
      : resolveGameItemIconUrl({ overrideUrl, catalogUrl, definitionUrl });
  return (
    <span className={cn("inline-flex shrink-0", className)} title={name}>
      <MediaIcon
        url={url}
        sizeClass={sizeClass}
        fallbackText={gameItemInitials(name)}
        labelled={labelled}
      />
    </span>
  );
}
