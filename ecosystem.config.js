// PM2 Process Manager Configuration for Dump Stat
// Usage:
//   Install PM2 globally:  npm install -g pm2
//   Start:                 pm2 start ecosystem.config.js
//   Stop:                  pm2 stop dump-stat
//   Restart:               pm2 restart dump-stat
//   View logs:             pm2 logs dump-stat
//   Save process list:     pm2 save
//   Auto-start on reboot:  pm2 startup

module.exports = {
  apps: [
    {
      name: "dump-stat",

      // Run the Next.js production server
      script: "node_modules/.bin/next",
      args: "start",

      // Working directory — adjust to where the app is deployed
      cwd: "./",

      // Number of instances. Use "max" to use all available CPU cores
      // or set a specific number (e.g. 2) for a cluster-mode app.
      instances: 1,
      exec_mode: "fork", // change to "cluster" if instances > 1

      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      // Port — must match the port Next.js binds to.
      // Override with PORT env var below if needed.
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Log file paths (relative to cwd or absolute)
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Graceful shutdown — waits up to 5 s for in-flight requests to finish
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}
