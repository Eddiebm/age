#!/usr/bin/env bash
# Create Cloudflare A record: age.<zone> -> Hetzner (DNS only, not proxied).
#
# One-time in Cloudflare: My Profile → API Tokens → Create Token →
#   "Edit zone DNS" template → include zone "theworldagency.uk" → copy token.
#
# Then on your Mac:
#   export CLOUDFLARE_API_TOKEN='paste-token-here'
#   bash ops/hetzner/cloudflare-add-age-a-record.sh
#
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-theworldagency.uk}"
SUB="${SUBDOMAIN:-age}"
IP="${AGE_SERVER_IP:-5.78.183.141}"

if [[ -z "$TOKEN" ]]; then
  echo "Missing CLOUDFLARE_API_TOKEN."
  echo "Create a token: Cloudflare Dashboard → My Profile → API Tokens → Create Token → Edit zone DNS (zone: ${ZONE_NAME})."
  echo "Then: export CLOUDFLARE_API_TOKEN='...' && bash $0"
  exit 1
fi

# Cloudflare expects record "name" relative to zone (e.g. "age" for age.example.com)
RECORD_FQDN="${SUB}.${ZONE_NAME}"

# Zone ID
ZONE_JSON=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")

ZONE_ID=$(python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('result') or []; print(r[0]['id'] if r else '')" <<<"$ZONE_JSON")
if [[ -z "$ZONE_ID" ]]; then
  echo "Could not find zone '${ZONE_NAME}'. Check token has access to this zone."
  python3 -c "import json,sys; print(json.load(sys.stdin))" <<<"$ZONE_JSON" 2>/dev/null || echo "$ZONE_JSON"
  exit 1
fi

# Existing A record for same name?
LIST=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${RECORD_FQDN}")

EXIST=$(python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('result') or []; print(r[0]['id'] if r else '')" <<<"$LIST")

if [[ -n "$EXIST" ]]; then
  echo "Updating existing A record ${RECORD_FQDN} -> ${IP} (id ${EXIST})"
  RESP=$(curl -sS -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${EXIST}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"A\",\"name\":\"${SUB}\",\"content\":\"${IP}\",\"ttl\":1,\"proxied\":false}")
else
  echo "Creating A record ${RECORD_FQDN} -> ${IP}"
  RESP=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"A\",\"name\":\"${SUB}\",\"content\":\"${IP}\",\"ttl\":1,\"proxied\":false}")
fi

if ! echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); ok=d.get('success',False); print('OK' if ok else 'FAIL'); (not ok) and print(d.get('errors') or d); sys.exit(0 if ok else 1)"; then
  exit 1
fi

echo ""
echo "Done. Check with: dig +short ${RECORD_FQDN} A @8.8.8.8"
echo "When you see ${IP}, run on the server:"
echo "  bash /opt/age/ops/hetzner/setup-nginx-tls.sh ${RECORD_FQDN} your@email.com"
