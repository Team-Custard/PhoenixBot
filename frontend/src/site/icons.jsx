// Line icons for the website, drawn on a 24px grid.
const PATHS = {
  shield: "M12 3l7 3v6c0 4.4-3 8.1-7 9-4-.9-7-4.6-7-9V6l7-3z M9 12l2 2 4-4",
  robot: "M12 3v3 M7 8h10a2 2 0 012 2v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7a2 2 0 012-2z M9.5 13h.01 M14.5 13h.01 M9 16h6 M3 12v3 M21 12v3",
  scroll: "M8 4h10a2 2 0 012 2v12a2 2 0 01-2 2H8 M8 4a2 2 0 00-2 2v12a2 2 0 002 2 M8 4H6a2 2 0 00-2 2v2h4 M11 9h6 M11 13h6 M11 17h4",
  trophy: "M8 4h8v5a4 4 0 01-8 0V4z M8 6H5a2 2 0 002 4h1 M16 6h3a2 2 0 01-2 4h-1 M12 13v4 M8 20h8 M9 17h6v3H9z",
  wave: "M7 11V6.5a1.5 1.5 0 013 0V11 M10 10V4.5a1.5 1.5 0 013 0V10 M13 10V5.5a1.5 1.5 0 013 0V12 M16 9.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7h-1a6 6 0 01-5-2.7L3.5 14a1.5 1.5 0 012.4-1.8L7 13.5",
  list: "M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01",
  palette: "M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.4 1.5-1.4H16a5 5 0 005-5c0-4.4-4-8-9-8z M7.5 11.5h.01 M10 7.5h.01 M14.5 7.5h.01 M17 11h.01",
  tag: "M3 12V4a1 1 0 011-1h8l9 9-9 9-9-9z M7.5 7.5h.01",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2",
  sliders: "M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M20 18h0 M16 4v4 M10 10v4 M18 16v4",
  code: "M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 5l-3 14",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  copy: "M9 9h10v10H9z M5 15V5h10",
  check: "M5 12l5 5 9-10",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14z M20 20l-4-4",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z",
};

export function Icon({ name, size = 24, className = "" }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
