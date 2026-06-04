# GitHub Actions

This repository **does not deploy to Vercel**.

Any historical Vercel / v0 auto-deploy workflows have been removed. Production runs on a **self-hosted DreamHost VPS** (Node + MySQL + nginx). See [README.md](../../README.md#production-deployment-dreamhost-vps-or-similar).

The only workflow here is optional CI (`ci.yml`) — lint and MySQL client checks only, no deploy step.
