#!/usr/bin/env bash
# Validate ZERNIO_API_KEY at service start.
# Called by ExecStartPre in age-web/age-worker systemd drop-ins.
# Exit 0 = OK or key not set (Zernio is optional).
# Exit 1 = key present but malformed — systemd blocks start.
set -euo pipefail
ENV_FILE="${1:-/opt/age/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

# Extract value, strip optional surrounding quotes, strip whitespace
raw=$(grep '^ZERNIO_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
key=$(printf '%s' "$raw" | sed 's/^["'"'"']//; s/["'"'"']$//' | tr -d '\n\r')

# Key absent or empty — Ayrshare fallback is allowed
if [[ -z "$key" ]]; then exit 0; fi

if ! printf '%s' "$key" | grep -qE '^sk_[0-9a-f]{64}$'; then
  echo "ERROR: ZERNIO_API_KEY in $ENV_FILE is malformed (expected sk_ + 64 hex chars). Refusing start." >&2
  exit 1
fi
