#!/usr/bin/env bash
# GeonicDB 向け bosai-* XACML ポリシー / API キーの冪等セットアップ。
# 仕様: docs/geonicdb-setup.md
#
# staging で確認済み:
#   - rules[] 各要素に ruleId が必須
#   - api-keys create には --origins が実質必須（未指定だと array expected で失敗）
#   - target.subjects 省略は個人スコープで動作する
#
# API キー作成時は --save を付けない（CLI 設定へ書き込むと 2 本目が上書きし、
# .env への手動反映用に標準出力へ一度だけ出す方針と衝突するため）。
# ユーザーあたり API キー上限(5)に達した場合は警告してスキップし、exit 0 で継続する
#（bosai-staff-write 1 本を職員書き込み・sync 読み取りの両方に使う運用可）。
set -euo pipefail

POLICY_WRITE='bosai-write'
POLICY_READ='bosai-read'
KEY_STAFF='bosai-staff-write'
KEY_SYNC='bosai-sync-read'

if ! command -v geonic >/dev/null 2>&1; then
  cat >&2 <<'EOF'
error: `geonic` コマンドが見つかりません。

geonicdb-cli をインストールし、PATH を通してください。
手順は geonicdb-cli リポジトリの README を参照してください。
EOF
  exit 1
fi

ensure_policy() {
  local policy_id="$1"
  local json="$2"

  if geonic me policies get "$policy_id" >/dev/null 2>&1; then
    echo "[setup:geonicdb] policy already exists: ${policy_id}"
    return 0
  fi

  echo "[setup:geonicdb] creating policy: ${policy_id}"
  geonic me policies create "$json"
}

api_key_exists() {
  local name="$1"
  local list_json
  # stderr には「キー値は create/refresh 時のみ」等の注記が混ざるため stdout のみ使う
  list_json="$(geonic me api-keys list --format json --limit 200 2>/dev/null || true)"
  if [[ -z "$list_json" ]]; then
    return 1
  fi
  # node で名前一致を判定（jq 非依存）
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
  echo "[setup:geonicdb] ※ キー値は次の出力に一度だけ表示されます。控えて .env に設定してください。"

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

# --- policies (docs/geonicdb-setup.md の JSON と同一・staging 確認済み) ---

WRITE_JSON=$(cat <<'EOF'
{
  "policyId": "bosai-write",
  "description": "geonicdb-bosai: write access to bosai-* entity types (staff content updates)",
  "target": {
    "resources": [
      { "attributeId": "path", "matchValue": "/v2/**", "matchFunction": "glob" },
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
          { "attributeId": "method", "matchValue": "DELETE" }
        ]
      }
    },
    { "ruleId": "deny-rest", "effect": "Deny" }
  ]
}
EOF
)

READ_JSON=$(cat <<'EOF'
{
  "policyId": "bosai-read",
  "description": "geonicdb-bosai: read access to bosai-* entity types (WebSocket sync tool)",
  "target": {
    "resources": [
      { "attributeId": "path", "matchValue": "/v2/**", "matchFunction": "glob" },
      { "attributeId": "entityType", "matchValue": "bosai-*", "matchFunction": "glob" }
    ]
  },
  "ruleCombiningAlgorithm": "first-applicable",
  "rules": [
    {
      "ruleId": "permit-bosai-read",
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

echo "[setup:geonicdb] ensuring XACML policies and API keys (idempotent)…"
echo "[setup:geonicdb] prerequisite: geonic auth login (or --client-credentials) and a selected tenant"

ensure_policy "$POLICY_WRITE" "$WRITE_JSON"
ensure_policy "$POLICY_READ" "$READ_JSON"
ensure_api_key "$KEY_STAFF" "$POLICY_WRITE"
ensure_api_key "$KEY_SYNC" "$POLICY_READ"

cat <<EOF

[setup:geonicdb] 完了。

次の手順:
1. 上記で新規作成されたキーがあれば、.env に反映する（既存キーの値は CLI では再表示されない）:
   - ${KEY_STAFF}  → GEONICDB_API_KEY
   - ${KEY_SYNC}   → GEONICDB_SYNC_API_KEY（未作成・上限スキップ時は GEONICDB_API_KEY のみで可。sync は staff キーにフォールバック）
2. GEONICDB_URL / GEONICDB_TENANT も .env に設定する（.env.example 参照）
3. 同期ツール: npm run sync:geonicdb（docs/ws-sync.md / docs/geonicdb-setup.md）
EOF
