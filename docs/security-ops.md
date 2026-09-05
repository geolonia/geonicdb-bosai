# セキュリティ運用メモ（N-20 / N-24 / N-26）

作成日: 2026-09-02
関連: issue #16、[`REQUIREMENTS.md`](REQUIREMENTS.md)、[`spec/requirements-spec-v1.1.md`](spec/requirements-spec-v1.1.md) 5.3

本ドキュメントはテンプレート導入時の運用チェックリストである。HTTP セキュリティヘッダ（N-21 の HSTS / CSP 等）の設定例・IaC は **issue #6**（本番: S3 + CloudFront / AWS CDK）の成果物とする。本リポジトリでは `docs/deployment.md` のヘッダ節を #6 が追加する。

## N-20 公開系としての分離

- 住民向けサイトは静的 export（`next build` → `out/`）をインターネット接続系で配信する。
- 職員の書き込みは GeonicDB の `bosai-write` / `bosai-staff-write` 経由とし、**クライアントバンドルに書き込みキーを埋め込まない**（[`geonicdb-setup.md`](geonicdb-setup.md)）。
- 管理画面 Web UI は初期リリース対象外（[`REQUIREMENTS.md`](REQUIREMENTS.md) 5節）。実装時は庁内・閉域または同等の分離と N-23（MFA 等）を満たすこと。

## N-24 脆弱性診断と依存関係の継続更新

### 継続更新（Dependabot）

- GitHub Dependabot の脆弱性アラートを有効化する（リポジトリ Settings → Code security）。
- バージョン更新 PR は [`.github/dependabot.yml`](../.github/dependabot.yml) で週次に npm / GitHub Actions を監視する。
- セキュリティパッチ（Dependabot alert）は原則 7 日以内に取り込み、破壊的変更は検証後にマージする。

### 年 1 回以上の脆弱性診断

出水期前など、年 1 回以上に次を実施し記録する。

1. `npm audit`（本番依存を優先。やむを得ない例外は理由を残す）
2. 公開 URL に対する Web アプリ診断（委託または内製）。高・中リスクは公開前に解消
3. 依存ライブラリの EOL / 既知 CVE の棚卸し
4. 診断結果・対応・再診の記録を自治体の文書管理ルールに従って保管

## N-26 位置情報・プライバシー

- 住民向け方針の雛形（ソース）: [`src/app/privacy/page.tsx`](../src/app/privacy/page.tsx)（公開パスは `/privacy/`。フッターからリンク）。
- 端末側処理の実装入口: [`src/lib/device-geolocation.ts`](../src/lib/device-geolocation.ts)。
  - `requestDevicePosition` / `distanceMetersBetween` のみ公開する。
  - 取得座標を `fetch`・GeonicDB 書き込み・ログ収集へ渡さない。
  - 許可ダイアログは利用者操作（ボタン等）を契機に出す（ページロード時の自動要求禁止）。
- ハザードマップ（issue #3）等で現在地を使う場合は、上記モジュールを経由し、サーバ保存を追加しないこと。

## 改ざん検知・自動復旧（N-21 の運用面）

静的サイトのソースオブトゥルースは Git である。改ざんや誤配信時は:

1. 配信オブジェクト（S3 等）と Git の該当タグ／コミットを突合する
2. CI の再デプロイ（または `out/` の再アップロード）で復旧する
3. CloudFront 等のキャッシュを無効化する

監視の具体ヘッダ・構成は #6 の配信基盤ドキュメントに従う。

## 関連 MUST / SHOULD（本メモの範囲外・参照のみ）

| ID | 扱い |
|---|---|
| N-21 ヘッダ・TLS | #6 |
| N-22 DDoS / Bot | CDN/WAF は CloudFront 前提。災害時に CAPTCHA 等で住民を締め出しない。Web Push: Function URL 単体では reserved concurrency、CloudFront フルデプロイ時は WAFv2 rate-based（#36） |
| N-23 管理画面認証 | 管理 UI 実装時の issue で扱う |
| N-25 ISMAP | SHOULD。クラウド選定時に登録サービスまたは同等を確認 |
