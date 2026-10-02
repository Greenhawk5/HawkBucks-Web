import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

/**
 * Accessible entity overlay (Radix Dialog): focus-trapped, Escape closes,
 * focus returns to the trigger on close, reduced-motion respected via CSS.
 * Enhancement only — every entity also has a canonical detail URL and the
 * dialog always offers an "Open full page" link to it.
 */
export function EntityDialog({
  open,
  onClose,
  title,
  detailHref,
  triggerLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  detailHref: string;
  triggerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-panel-border bg-background p-6 shadow-xl focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl font-extrabold">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close dialog"
              className="rounded-lg border border-panel-border px-3 py-1.5 text-xs font-bold hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              ✕
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
          <div className="mt-6 flex gap-2">
            <a
              href={detailHref}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {triggerLabel}
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Escape-key + focus-restore behavior is provided by Radix Dialog itself. */
export function useEntityDialog(): { open: boolean; setOpen: (v: boolean) => void } {
  const [open, setOpen] = React.useState(false);
  return { open, setOpen };
}
