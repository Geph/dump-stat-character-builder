/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Self-hosted VPS (DreamHost, etc.) — not Vercel serverless */
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
