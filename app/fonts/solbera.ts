import localFont from "next/font/local"

/**
 * Solbera’s D&D Fonts (CC BY-SA 4.0 — Solbera / Ryrok).
 * Self-hosted so Firefox can load them (cross-origin @font-face is blocked
 * unless the remote host sends CORS headers).
 * https://jonathonf.github.io/solbera-dnd-fonts/
 */

export const nodestoCaps = localFont({
  src: [
    { path: "./solbera/nodesto-caps-condensed.otf", weight: "400", style: "normal" },
    { path: "./solbera/nodesto-caps-condensed-bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-nodesto",
  display: "swap",
})

export const bookinsanity = localFont({
  src: [
    { path: "./solbera/bookinsanity.otf", weight: "400", style: "normal" },
    { path: "./solbera/bookinsanity-bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-bookinsanity",
  display: "swap",
})

export const scalySans = localFont({
  src: [
    { path: "./solbera/scaly-sans.otf", weight: "400", style: "normal" },
    { path: "./solbera/scaly-sans-bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-scaly-sans",
  display: "swap",
})

export const mrEaves = localFont({
  src: [{ path: "./solbera/mr-eaves-small-caps.otf", weight: "400", style: "normal" }],
  variable: "--font-mr-eaves",
  display: "swap",
})

export const solberaFontVariables = [
  nodestoCaps.variable,
  bookinsanity.variable,
  scalySans.variable,
  mrEaves.variable,
].join(" ")
