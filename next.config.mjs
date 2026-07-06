/** @type {import('next').NextConfig} */
const isStatic = process.env.NEXT_PUBLIC_DEPLOY_MODE === "static"
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "")

const nextConfig = {
  /** Self-hosted VPS (DreamHost, etc.) — not Vercel serverless */
  output: isStatic
    ? "export"
    : process.env.NEXT_OUTPUT === "standalone"
      ? "standalone"
      : undefined,
  basePath: isStatic && basePath ? basePath : undefined,
  assetPrefix: isStatic && basePath ? basePath : undefined,
  trailingSlash: isStatic ? true : undefined,
  /** pdf-parse bundles native/pdf.js assets; keep it external on the server. */
  serverExternalPackages: ["pdf-parse"],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
