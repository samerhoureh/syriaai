#!/bin/sh
# SYRIA AI platform container entrypoint:
# prepare the SQLite schema + seed, then start the standalone Next.js server.
set -e

echo "[platform] prisma db push ..."
bunx prisma db push --skip-generate

echo "[platform] seeding research/demo data ..."
bun prisma/seed.ts || echo "[platform] seed failed (continuing — platform still serves REAL engine data)"

echo "[platform] starting server on :3000"
exec bun .next/standalone/server.js
