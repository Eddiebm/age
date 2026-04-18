#!/usr/bin/env bash
# Install nginx + Let's Encrypt TLS for AGE, point NEXTAUTH_URL at https://<domain>.
# Prerequisites: domain A/AAAA record → this server's public IP (DNS propagated).
#
# Usage:
#   sudo bash /opt/age/ops/hetzner/setup-nginx-tls.sh age.example.com you@email.com
# Or: CERTBOT_EMAIL=you@email.com sudo bash ... age.example.com
#
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-${CERTBOT_EMAIL:-}}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain> [certbot-email]"
  echo "Example: $0 age.example.com you@gmail.com"
  echo "Ensure DNS for <domain> points to this host before running."
  exit 1
fi

if [[ -z "$EMAIL" ]]; then
  echo "Error: provide Let's Encrypt email as second argument or set CERTBOT_EMAIL."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx python3-certbot-nginx

# Optional: HTTP-only reverse proxy (certbot --nginx will add TLS + :443)
cat > /etc/nginx/sites-available/age <<NGINX
upstream age_next {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        proxy_pass http://age_next;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/age /etc/nginx/sites-enabled/age
if [[ -f /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ">>> Requesting TLS certificate for ${DOMAIN} ..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect

nginx -t
systemctl reload nginx

ENV_FILE=/opt/age/.env
if [[ -f "${ENV_FILE}" ]]; then
  sed -i '/^NEXTAUTH_URL=/d' "${ENV_FILE}"
  echo "NEXTAUTH_URL=https://${DOMAIN}" >> "${ENV_FILE}"
  systemctl restart age-web age-worker 2>/dev/null || true
  echo ">>> Set NEXTAUTH_URL=https://${DOMAIN} in ${ENV_FILE} and restarted age-web / age-worker."
else
  echo ">>> Warning: ${ENV_FILE} not found — set NEXTAUTH_URL=https://${DOMAIN} manually."
fi

echo ""
echo "Done. Public URL: https://${DOMAIN}"
echo "In Google/GitHub OAuth apps, add callback URLs:"
echo "  https://${DOMAIN}/api/auth/callback/google"
echo "  https://${DOMAIN}/api/auth/callback/github"
