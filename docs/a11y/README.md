# アクセシビリティ（導入自治体向け）

本ディレクトリは、JIS X 8341-3:2016 適合レベル AA および WCAG 2.2 AA への対応を進めるための**雛形・チェックリスト**です。正式な適合試験と結果公開は、導入自治体が自サイトに対して実施します（自動検査は代替になりません）。

## 同梱物

| ファイル | 用途 |
| --- | --- |
| [`wcag22-aa-checklist.md`](./wcag22-aa-checklist.md) | WCAG 2.2 AA（2.2 追加基準含む）の達成基準チェックリスト |
| [`assistive-tech-scenarios.md`](./assistive-tech-scenarios.md) | NVDA / VoiceOver / TalkBack 向け主要シナリオ |

サイト上の公開ページ:

| URL | 内容 |
| --- | --- |
| `/accessibility/` | ウェブアクセシビリティ方針（雛形） |
| `/accessibility/test-results/` | 試験結果（附属書 JB.3.1 表示事項の雛形） |

データソースは `src/config/accessibility-content.ts` です。`【要記入】` を実値に置換してください。

## 手順（要約）

1. 方針ページの対象範囲・担当・期限を自治体向けに更新する。
2. WAIC「試験実施ガイドライン」に従い試験対象ページを選び、手動＋支援技術で試験する。
3. `wcag22-aa-checklist.md` と試験結果ページを更新し、サイトで公開する。
4. 対応度表記は WAIC のガイドラインに従う（未試験のまま「適合」と名乗らない）。

詳細はリポジトリ直下の [`README.md`](../../README.md)「アクセシビリティ」節を参照。
