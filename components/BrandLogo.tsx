/* eslint-disable @next/next/no-img-element */
// Brand lockup for the site headers. Renders three static PNGs; exactly one is
// visible at a time, chosen by CSS in globals.css (no client JS, no flash):
//   • the symbol-only mark below the sm breakpoint (the full wordmark is too
//     wide for a phone nav) — blue, reads on any background;
//   • the full logo at sm+, as a dark-text variant for the light packs
//     (default) and a light-text variant for the dark packs (ink/slate),
//     swapped off the <html data-style> attribute.
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
        className="brand-mark h-8 w-auto"
      />
      <img
        src="/brand/logo-full.png"
        alt=""
        width={523}
        height={120}
        className="brand-logo--light h-9 w-auto"
      />
      <img
        src="/brand/logo-full-dark.png"
        alt=""
        width={523}
        height={120}
        className="brand-logo--dark h-9 w-auto"
      />
    </>
  );
}
