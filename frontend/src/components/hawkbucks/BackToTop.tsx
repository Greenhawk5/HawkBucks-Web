import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }}
      className="fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center rounded-xl border border-primary/50 bg-background/85 text-primary shadow-[var(--shadow-glow)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:bottom-7 sm:right-7"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
