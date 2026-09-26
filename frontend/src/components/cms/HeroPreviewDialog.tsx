import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import type { PublicHeroItem } from "@/lib/cms/public.loader";
import { heroDetailHref } from "./HeroCard";

/** Large modal/tour enhancement: canonical route remains the source of truth. */
export function HeroPreviewDialog({
  hero,
  locale,
  onClose,
}: {
  hero: PublicHeroItem | null;
  locale: string;
  onClose: () => void;
}) {
  const s = getPublicStrings(locale);
  const open = hero !== null;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        {hero ? (
          <div data-testid="hero-preview-dialog">
            <DialogTitle>{hero.title}</DialogTitle>
            <DialogDescription>
              {s.classNameLabel}: {heroClassLabel(locale, hero.heroClass)}
            </DialogDescription>
            {hero.imageUrl ? (
              <img
                src={hero.imageUrl}
                alt={hero.title}
                className="mt-4 max-h-72 w-full rounded-lg object-cover"
              />
            ) : null}
            {hero.description ? (
              <p className="mt-4 text-sm leading-relaxed">{hero.description.slice(0, 600)}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Link
                to={heroDetailHref(locale, hero.slug)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                {s.viewDetails}
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-panel-border px-4 py-2 text-sm font-semibold"
              >
                {s.close}
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function useHeroPreview() {
  const [preview, setPreview] = React.useState<PublicHeroItem | null>(null);
  return { preview, setPreview };
}
