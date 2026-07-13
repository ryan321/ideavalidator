/* eslint-disable @next/next/no-img-element */
// Brand lockup for the site headers. Renders three static PNGs; exactly one is
// visible at a time. Responsive + default visibility are Tailwind utilities on
// the elements (always compiled, so a stale/partial stylesheet can never show a
// duplicate logo):
//   • the symbol-only mark below the sm breakpoint (`sm:hidden`) — the full
//     wordmark is too wide for a phone nav; the blue symbol reads on any bg;
//   • the full logo at sm+ (`hidden sm:block`), dark-text by default.
// The only custom CSS (globals.css) flips to the light-text variant on the dark
// packs (ink/slate) at sm+, off <html data-style> — no JS, no flash.
// The wrapping <Link> in each header carries the accessible label, so the
// images are decorative (alt=""); that also keeps the logo out of the i18n
// catalogs. next/image is intentionally not used: these are tiny fixed-size
// static assets where its optimization/lazy-loading buys nothing and would
// complicate the CSS-driven swap.

export function BrandLogo() {
  return (
    <>
      <img
        src="/brand/mark.png"
        alt=""
        width={150}
        height={128}
        className="brand-mark h-8 w-auto sm:hidden"
      />
      <img
        src="/brand/logo-full.png"
        alt=""
        width={523}
        height={120}
        className="brand-logo--light hidden h-9 w-auto sm:block"
      />
      <img
        src="/brand/logo-full-dark.png"
        alt=""
        width={523}
        height={120}
        className="brand-logo--dark hidden h-9 w-auto"
      />
    </>
  );
}
