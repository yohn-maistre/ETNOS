#!/usr/bin/env bash
# Provision and deploy ETNOS + etnos-identity-host onto a fresh Cloudflare Free account.
# Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, node >= 24, npx wrangler.
set -euo pipefail

: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID for the target Cloudflare account}"
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN for the target Cloudflare account}"

ETNOS_ORIGIN="${ETNOS_ORIGIN:-https://etnos.space}"
D1_NAME="${D1_NAME:-etnos-identity-directory}"
R2_BUCKET="${R2_BUCKET:-etnos-identity-blobs}"
DRY_RUN="${DRY_RUN:-0}"

echo "==> Target Cloudflare account: ${CLOUDFLARE_ACCOUNT_ID}"
echo "==> Origin: ${ETNOS_ORIGIN}"

if [ "$DRY_RUN" = "1" ]; then
  echo "[dry-run] Would provision D1 (${D1_NAME}), R2 (${R2_BUCKET}), secrets, build UI, and deploy both Workers."
  exit 0
fi

echo "==> 1/5 Building web app..."
npm ci --ignore-scripts
npm ci --prefix apps/web --ignore-scripts
npm ci --prefix packages/pds --ignore-scripts
npm run build:ui

echo "==> 2/5 Ensuring R2 bucket (${R2_BUCKET}) exists..."
npx wrangler r2 bucket create "${R2_BUCKET}" 2>/dev/null || echo "Bucket ${R2_BUCKET} already exists."

echo "==> 3/5 Generating missing ETNOS secrets if not provided..."
if [ -z "${STRATA_AUTH_SEAL_KEY:-}" ]; then
  STRATA_AUTH_SEAL_KEY="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"
  echo "Generated fresh STRATA_AUTH_SEAL_KEY."
fi
if [ -z "${STRATA_OAUTH_JWK:-}" ]; then
  STRATA_OAUTH_JWK="$(node -e "const {generateKeyPairSync}=require('node:crypto');const {privateKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});const j=privateKey.export({format:'jwk'});j.kid='etnos-'+Date.now();j.use='sig';j.alg='ES256';console.log(JSON.stringify(j))")"
  echo "Generated fresh ES256 STRATA_OAUTH_JWK."
fi

echo "==> 4/5 Deploying ETNOS web Worker (strata-preview)..."
printf '%s' "${STRATA_OAUTH_JWK}" | npx wrangler secret put STRATA_OAUTH_JWK --config wrangler.web.jsonc
printf '%s' "${STRATA_AUTH_SEAL_KEY}" | npx wrangler secret put STRATA_AUTH_SEAL_KEY --config wrangler.web.jsonc
npx wrangler deploy --config wrangler.web.jsonc --var "STRATA_ORIGIN:${ETNOS_ORIGIN}"

echo "==> 5/5 Deploying identity host (packages/pds)..."
(
  cd packages/pds
  if [ -z "${PDS_HOSTNAME:-}" ]; then
    SUB="$(curl -fsS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/subdomain" \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).result.subdomain))')"
    PDS_HOSTNAME="etnos-identity-host.${SUB}.workers.dev"
  fi
  echo "Identity host hostname: ${PDS_HOSTNAME}"
  npx wrangler deploy --config wrangler.host.jsonc --var "PDS_HOSTNAME:${PDS_HOSTNAME}"
  if [ -n "${ACCOUNT_KEK_V1:-}" ]; then
    printf '%s' "${ACCOUNT_KEK_V1}" | npx wrangler secret put ACCOUNT_KEK_V1 --config wrangler.host.jsonc
  else
    echo "NOTE: Set ACCOUNT_KEK_V1 and OPERATOR_TOKEN on etnos-identity-host before opening sign-ups."
  fi
  if [ -n "${OPERATOR_TOKEN:-}" ]; then
    printf '%s' "${OPERATOR_TOKEN}" | npx wrangler secret put OPERATOR_TOKEN --config wrangler.host.jsonc
  fi
)

echo "==> Done! Verify live endpoints:"
echo "  curl -fsS ${ETNOS_ORIGIN}/health"
echo "  curl -fsS -I ${ETNOS_ORIGIN}/v1/aksara/jadwal | grep -i x-etnos-edge-cache"
