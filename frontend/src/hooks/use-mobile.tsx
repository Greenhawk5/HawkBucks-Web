import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Viewport hook shared by the app shell. Returns `undefined` on the server
 * and first client render so SSR HTML never guesses a branch; callers must
 * treat `undefined` as "not mobile" until the media query resolves.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
