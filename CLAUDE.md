# CLAUDE.md

`geonicdb-bosai` は自治体向け防災サイトのテンプレートリポジトリ。GeonicDB（Context Broker）本体・関連プロジェクトと同じ運用ルールに従う。

## ワークツリー運用

コードの追加・修正・テスト・コミット・PR を伴う作業は、**着手前に必ず**このリポジトリ内へ git worktree を作成し、その中で行う。メインチェックアウト（`geonicdb-bosai/` 直下）は直接編集しない。

```bash
git worktree add .worktrees/geonicdb-bosai-<branch-name> -b <branch-name>
cd .worktrees/geonicdb-bosai-<branch-name>
npm install
```

## 要件・設計の参照先

- 要件定義: `docs/REQUIREMENTS.md`
- ガイドライン調査: `docs/research/guidelines.md`

実装で判断に迷う場合は、まず上記2文書に立ち返ること。特に非機能要件（可用性・アクセシビリティ）は `docs/research/guidelines.md` 3.2 節を参照する。

## Issue 作成時のラベル付け

`gh issue create` で issue を立てる際は、優先度ラベル（`Priority: Emerg/High/Middle/Low`）を必ず付与する。
