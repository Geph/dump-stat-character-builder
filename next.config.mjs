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
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
