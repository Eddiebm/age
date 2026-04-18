#!/usr/bin/env bash
# Deploy AGE on Hetzner from /opt/age (systemd: age-web, age-worker).
# Usage (on server): sudo bash /opt/age/ops/hetzner/deploy.sh
set -euo pipefail

cd /opt/age

echo ">>> git pull"
git pull origin main

echo ">>> npm ci"
npm ci

echo ">>> prisma (schema to DB)"
./node_modules/.bin/prisma db push

echo ">>> build"
npm run build

echo ">>> prune devDependencies"
npm prune --omit=dev

echo ">>> restart services"
systemctl restart age-web age-worker

echo ">>> status"
systemctl is-active age-web age-worker

echo "Done."
