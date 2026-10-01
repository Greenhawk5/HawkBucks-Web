import { useEffect, useRef, useState } from "react";

/**
 * Wave 1 — Control Center sign-in backdrop. Adapted from the Cms Template's
 * MatrixDepthBackground (starfield-style z-projection glyph field, NOT
 * vertical rain): a sparse field of katakana/digit glyphs drifts toward the
 * viewer in the HawkBucks green accent on near-black, with the viewport
 * center suppressed so the sign-in card stays readable.
 *
 * Adaptations for HawkBucks (not a copy):
 *   * HawkBucks oklch accent (matches .cc-root --cc-accent) instead of the
 *     template's raw #39ff8b rgba ramp.
 *   * Fewer glyphs (90/44 vs 110/55) + capped DPR 1.5: same feel, less GPU.
 *   * Self-contained prefers-reduced-motion hook (no template hook import).
 *   * pointer-events-none + aria-hidden: purely decorative, never intercepts
 *     form interaction, never announced to AT.
 * Reduced motion: renders one static frame of dim mid-depth glyphs, no rAF.
 */

const CHARSET = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789".split("");

// HawkBucks accent ramp (oklch 0.82 0.23 145 ≈ #7de8a4 in sRGB): brightest
// tier softens toward near-white green for the closest glyphs.
const GLYPH_COLORS = [
  "rgba(125, 232, 164, 0.13)",
  "rgba(125, 232, 164, 0.20)",
  "rgba(125, 232, 164, 0.30)",
  "rgba(150, 240, 180, 0.45)",
  "rgba(200, 250, 215, 0.62)",
] as const;

const MAX_DEPTH = 1600;
const MIN_DEPTH = 90;
const COUNT_DESKTOP = 90;
const COUNT_SMALL = 44;

interface Glyph {
  x: number;
  y: number;
  z: number;
  speed: number;
  char: string;
  twinkleOffset: number;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function CmsLoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationId = 0;
    let tick = 0;

    const pickChar = () => CHARSET[(Math.random() * CHARSET.length) | 0] ?? "ｱ";

    const createGlyph = (initialZ?: number): Glyph => ({
      x: (Math.random() - 0.5) * 2.2,
      y: (Math.random() - 0.5) * 2.2,
      z: initialZ ?? MIN_DEPTH + Math.random() * (MAX_DEPTH - MIN_DEPTH),
      speed: 1.2 + Math.random() * 2.0,
      char: pickChar(),
      twinkleOffset: Math.random() * Math.PI * 2,
    });

    const glyphs: Glyph[] = [];
    const targetCount = () =>
      Math.min(window.innerWidth, window.innerHeight) < 640 ? COUNT_SMALL : COUNT_DESKTOP;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const want = targetCount();
      while (glyphs.length < want) glyphs.push(createGlyph());
      glyphs.length = want;
    };

    const drawFrame = (advance: boolean) => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const focal = Math.min(width, height) * 0.55;

      for (const g of glyphs) {
        if (advance) {
          g.z -= g.speed;
          if (g.z <= MIN_DEPTH) {
            Object.assign(g, createGlyph(MAX_DEPTH));
          }
          if (Math.random() < 0.003) g.char = pickChar();
        }

        const scale = focal / g.z;
        const size = Math.min(58, Math.max(7, scale * 24));
        const px = cx + g.x * scale * cx;
        const py = cy + g.y * scale * cy;
        if (px < -60 || px > width + 60 || py < -60 || py > height + 60) continue;

        const depthRatio = Math.min(1, Math.max(0, (g.z - MIN_DEPTH) / (MAX_DEPTH - MIN_DEPTH)));
        const tier = Math.min(
          GLYPH_COLORS.length - 1,
          ((1 - depthRatio) * GLYPH_COLORS.length) | 0,
        );

        const nx = (px - cx) / (width * 0.5);
        const ny = (py - cy) / (height * 0.5);
        const radial = Math.sqrt(nx * nx * 0.82 + ny * ny * 1.15);
        const centerFade = radial < 1 ? Math.min(1, Math.max(0, (radial - 0.4) / 0.6)) : 1;
        const twinkle = 0.82 + 0.18 * Math.sin(tick * 0.03 + g.twinkleOffset);
        const alpha = centerFade * twinkle;
        if (alpha < 0.04) continue;

        ctx.font = `${size.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.fillStyle = GLYPH_COLORS[tier] ?? GLYPH_COLORS[0];
        ctx.globalAlpha = alpha;
        ctx.fillText(g.char, px, py);
      }
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      tick += 1;
      drawFrame(true);
      animationId = requestAnimationFrame(animate);
    };

    resize();
    if (reducedMotion) {
      for (const g of glyphs) {
        g.z = MIN_DEPTH + (MAX_DEPTH - MIN_DEPTH) * (0.3 + Math.random() * 0.6);
      }
      drawFrame(false);
    } else {
      animationId = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [reducedMotion]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 42% 52% at 50% 50%, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.45) 55%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(5,6,10,0.55) 100%)",
        }}
      />
    </div>
  );
}
