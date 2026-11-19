import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * True when the reader has enlarged text (browser text-only zoom, a large
 * default font, or the 200 % plate the parity matrix captures).
 *
 * Text-only zoom does not change the viewport width, so a width media query
 * cannot see it. Measuring the root font size can: 150 % and above is where an
 * expanded sidebar starts eating the content column.
 */
export function useLargeText(thresholdPx = 24) {
  const [large, setLarge] = React.useState(false)

  React.useEffect(() => {
    const read = () => {
      const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      setLarge(Number.isFinite(size) && size >= thresholdPx)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    })
    // Playwright and devtools inject a <style> plate for text-only zoom; that
    // changes the computed root size without touching an attribute.
    observer.observe(document.head, { childList: true, subtree: true })
    window.addEventListener("resize", read)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", read)
    }
  }, [thresholdPx])

  return large
}
