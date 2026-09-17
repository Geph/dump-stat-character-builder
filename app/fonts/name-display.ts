import { Cinzel, Comic_Neue, Great_Vibes, MedievalSharp, Orbitron } from "next/font/google"

export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
})

export const medievalSharp = MedievalSharp({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-medieval-sharp",
  display: "swap",
})

export const comicNeue = Comic_Neue({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-comic-neue",
  display: "swap",
})

export const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-great-vibes",
  display: "swap",
})

export const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
})

export const nameDisplayFontVariables = [
  cinzel.variable,
  medievalSharp.variable,
  comicNeue.variable,
  greatVibes.variable,
  orbitron.variable,
].join(" ")
