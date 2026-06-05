/**
 * PM2 process config for DreamHost VPS (or any Linux host with Node + MySQL).
 * Usage: pnpm build && pm2 start deploy/ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "dump-stat",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
    },
  ],
}
