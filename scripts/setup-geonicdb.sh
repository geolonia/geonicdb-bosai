#!/usr/bin/env bash
# GeonicDB 向け bosai-* XACML ポリシー / API キーの冪等セットアップ。
# 仕様: docs/geonicdb-setup.md（staging で動作確認済み）
#
# 確認済みの罠:
#   - rules[] 各要素に ruleId が必須
#   - リソースパスは /ngsi-ld/**（/v2/** ではない。SDK は NGSI-LD のみ）
#   - WS 購読には method: WS が必要（WS ⊂ GET の両方 Permit）
#   - api-keys create には --origins が実質必須
#   - bosai-public-read は tenant_admin 必須（admin policies）
#
# API キー作成時は --save を付けない（CLI 設定へ書き込まず、stdout に一度だけ表示）。
# ユーザーあたり API キー上限(5)に達した場合は警告してスキップし exit 0 で継続する。
set -euo pipefail

POLICY_PUBLIC='bosai-public-read'
POLICY_WRITE='bosai-write'
KEY_STAFF='bosai-staff-write'

if ! command -v geonic >/dev/null 2>&1; then
  cat >&2 <<'EOF'
error: `geonic` コマンドが見つかりません。

geonicdb-cli をインストールし、PATH を通してください。
手順は geonicdb-cli リポジトリの README を参照してください。
EOF
  exit 1
fi

ensure_me_policy() {
  local policy_id="$1"
  local json="$2"

  if geonic me policies get "$policy_id" >/dev/null 2>&1; then
    echo "[setup:geonicdb] policy already exists: ${policy_id}"
    return 0
  fi

  echo "[setup:geonicdb] creating personal policy: ${policy_id}"
  geonic me policies create "$json"
}

# tenant スコープ。tenant_admin が無いと失敗するため、失敗時は警告して継続する。
ensure_admin_policy() {
  local policy_id="$1"
  local json="$2"

  if geonic admin policies get "$policy_id" >/dev/null 2>&1; then
    echo "[setup:geonicdb] admin policy already exists: ${policy_id}"
    return 0
  fi

  echo "[setup:geonicdb] creating tenant policy: ${policy_id} (requires tenant_admin)"
  local out status
  set +e
  out="$(geonic admin policies create "$json" 2>&1)"
  status=$?
  set -e
  printf '%s\n' "$out"

  if [[ "$status" -eq 0 ]]; then
    return 0
  fi

  echo "[setup:geonicdb] warning: admin権限が必要です。手動で geonic admin policies create を実行してください (${policy_id})" >&2
  return 0
}

api_key_exists() {
  local name="$1"
  local list_json
  list_json="$(geonic me api-keys list --format json --limit 200 2>/dev/null || true)"
  if [[ -z "$list_json" ]]; then
    return 1
  fi
  NAME="$name" node -e '
    const raw = require("fs").readFileSync(0, "utf8").trim();
    if (!raw) process.exit(1);
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(1); }
    const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
    const name = process.env.NAME;
    process.exit(items.some((k) => k && k.name === name) ? 0 : 1);
  ' <<<"$list_json"
}

ensure_api_key() {
  local name="$1"
  local policy_id="$2"

  if api_key_exists "$name"; then
    echo "[setup:geonicdb] API key already exists: ${name} (値は再表示できません。必要なら geonic me api-keys refresh)"
    return 0
  fi

  echo "[setup:geonicdb] creating API key: ${name} (policy=${policy_id})"
  echo "[setup:geonicdb] ※ キー値は次の出力に一度だけ表示されます。控えて .env の GEONICDB_API_KEY に設定してください。"

  local out status
  set +e
  out="$(geonic me api-keys create --name "$name" --policy "$policy_id" --origins '*' 2>&1)"
  status=$?
  set -e
  printf '%s\n' "$out"

  if [[ "$status" -eq 0 ]]; then
    return 0
  fi

  if printf '%s\n' "$out" | grep -qi 'Maximum number of API keys'; then
    echo "[setup:geonicdb] warning: 上限に達したためスキップしました。既存キーで代用してください (${name})" >&2
    return 0
  fi

  return "$status"
}

# --- policies (docs/geonicdb-setup.md と同一・staging 確認済み) ---

PUBLIC_JSON=$(cat <<'EOF'
{
  "policyId": "bosai-public-read",
  "description": "geonicdb-bosai: anonymous public read access to bosai-* entity types (citizen-facing AJAX)",
  "target": {
    "subjects": [
      { "attributeId": "role", "matchValue": "anonymous" }
    ],
    "resources": [
      { "attributeId": "path", "matchValue": "/ngsi-ld/**", "matchFunction": "glob" },
      { "attributeId": "entityType", "matchValue": "bosai-*", "matchFunction": "glob" }
    ]
  },
  "ruleCombiningAlgorithm": "first-applicable",
  "rules": [
    {
      "ruleId": "permit-bosai-public-read",
      "effect": "Permit",
      "target": {
        "actions": [
          { "attributeId": "method", "matchValue": "GET" }
        ]
      }
    },
    { "ruleId": "deny-rest", "effect": "Deny" }
  ]
}
EOF
)

WRITE_JSON=$(cat <<'EOF'
{
  "policyId": "bosai-write",
  "description": "geonicdb-bosai: write access to bosai-* entity types (staff content updates, NGSI-LD)",
  "target": {
    "resources": [
      { "attributeId": "path", "matchValue": "/ngsi-ld/**", "matchFunction": "glob" },
      { "attributeId": "entityType", "matchValue": "bosai-*", "matchFunction": "glob" }
    ]
  },
  "ruleCombiningAlgorithm": "first-applicable",
  "rules": [
    {
      "ruleId": "permit-bosai-write",
      "effect": "Permit",
      "target": {
        "actions": [
          { "attributeId": "method", "matchValue": "GET" },
          { "attributeId": "method", "matchValue": "POST" },
          { "attributeId": "method", "matchValue": "PATCH" },
          { "attributeId": "method", "matchValue": "PUT" },
          { "attributeId": "method", "matchValue": "DELETE" },
          { "attributeId": "method", "matchValue": "WS" }
        ]
      }
    },
    { "ruleId": "deny-rest", "effect": "Deny" }
  ]
}
EOF
)

echo "[setup:geonicdb] ensuring XACML policies and API keys (idempotent)…"
echo "[setup:geonicdb] prerequisite: geonic auth login (or --client-credentials) and a selected tenant"

ensure_admin_policy "$POLICY_PUBLIC" "$PUBLIC_JSON"
ensure_me_policy "$POLICY_WRITE" "$WRITE_JSON"
ensure_api_key "$KEY_STAFF" "$POLICY_WRITE"

cat <<EOF

[setup:geonicdb] 完了。

次の手順:
1. 新規作成された ${KEY_STAFF} があれば .env の GEONICDB_API_KEY に反映（CLI では再表示不可）
2. 住民向け公開ページ用（秘密情報ではない）:
   NEXT_PUBLIC_GEONICDB_URL / NEXT_PUBLIC_GEONICDB_TENANT（.env.example 参照）
3. ${POLICY_PUBLIC} が未作成の場合は tenant_admin で手動作成（docs/geonicdb-setup.md）
EOF
