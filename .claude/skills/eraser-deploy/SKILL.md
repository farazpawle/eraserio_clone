---
name: eraser-deploy
description: Redeploys the Eraser Next.js app as a Docker container on the VPS `main` (/opt/eraser) behind Nginx Proxy Manager. Use for any task that builds, ships or restarts the live app.
---

# Eraser app deploy (VPS `main`)

Reach the server with the `ssh-vps` MCP tools. Ask the user before redeploying.

- Tarball the source without `.env*`, `.git`, `node_modules`; unpack over `/opt/eraser`.
- `cd /opt/eraser && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build`
- `.env.prod` (chmod 600) holds the public Supabase URL, anon key, service-role key and `SITE_URL`; it is built on the server and never leaves it.
- The container binds `10.0.0.1:8091:3000`; Nginx Proxy Manager forwards `eraser.garritwulf.com` to it. If the NPM container is recreated, run `docker network connect supabase_default NGINX-Proxy`.
- The Supabase API is public at `eraser-api.garritwulf.com` (Kong behind NPM); Studio is not public.
