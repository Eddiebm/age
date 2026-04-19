#!/usr/bin/env bash
# Merge OAuth + OpenAI API key into /opt/age/.env (replaces existing keys when set).
#
# On the server, with values exported in the same shell:
#   export GOOGLE_CLIENT_ID='...'
#   export GOOGLE_CLIENT_SECRET='...'
#   export GITHUB_ID='...'
#   export GITHUB_SECRET='...'
#   export ZERNIO_API_KEY='sk_...'            # https://zernio.com — plus ZERNIO_PROFILE_ID or ZERNIO_TARGETS_JSON
#   export OPENROUTER_API_KEY='sk-or-v1-...'   # https://openrouter.ai/keys (recommended)
#   export OPENAI_API_KEY='sk-...'             # optional fallback: OpenAI direct
#   bash /opt/age/ops/hetzner/patch-oauth-env.sh
#
set -euo pipefail
ENV_FILE="${1:-/opt/age/.env}"
export ENV_FILE
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi


# Validate ZERNIO_API_KEY format if provided
if [[ -n "${ZERNIO_API_KEY:-}" ]]; then
  if ! printf '%s' "$ZERNIO_API_KEY" | grep -qE '^sk_[0-9a-f]{64}$'; then
    echo "ERROR: ZERNIO_API_KEY does not match ^sk_[0-9a-f]{64}$ — refusing to write a malformed key." >&2
    exit 1
  fi
fi

python3 <<'PY'
import os, re, sys

path = os.environ["ENV_FILE"]
keys = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GITHUB_ID",
    "GITHUB_SECRET",
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "OPENROUTER_BASE_URL",
    "OPENROUTER_HTTP_REFERER",
    "OPENROUTER_APP_TITLE",
    "ZERNIO_API_KEY",
    "ZERNIO_PROFILE_ID",
    "ZERNIO_TARGETS_JSON",
    "ZERNIO_API_BASE",
]
incoming = {k: os.environ.get(k, "").strip() for k in keys}
if not any(incoming.values()):
    print(
        "Set at least one of: "
        + ", ".join(keys)
        + " in the environment.",
        file=sys.stderr,
    )
    sys.exit(1)

with open(path, "r", encoding="utf-8") as f:
    lines = f.read().splitlines()


def esc(v: str) -> str:
    if v == "":
        return ""
    if re.search(r'[\s#"$`!\\]', v) or "'" in v:
        return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return v


out = []
seen = set()
for line in lines:
    m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", line)
    if m and m.group(1) in keys:
        k = m.group(1)
        if incoming[k]:
            out.append(f"{k}={esc(incoming[k])}")
            seen.add(k)
        else:
            out.append(line)
    else:
        out.append(line)

for k in keys:
    if incoming[k] and k not in seen:
        out.append(f"{k}={esc(incoming[k])}")

with open(path, "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")

print("OK:", ", ".join(k for k in keys if incoming[k]))
PY
