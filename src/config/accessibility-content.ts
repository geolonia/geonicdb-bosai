/**
 * ウェブアクセシビリティ方針・試験結果の雛形データ。
 * 導入自治体が自サイト向けに置換する箇所は PLACEHOLDER_MARK で明示する。
 * 試験未実施のまま「適合」を名乗らないこと（WAIC 対応度表記ガイドライン）。
 */

export const PLACEHOLDER_MARK = "【要記入】";

/** 方針ページに必ず出す見出し（回帰テストのアンカー） */
export const POLICY_HEADINGS = [
  "ウェブアクセシビリティ方針",
  "対象範囲",
  "目標とする適合レベル",
  "例外事項",
  "担当部署",
  "達成期限・見直し",
  "関連資料",
] as const;

/** JIS 附属書 JB.3.1 表示事項（試験結果ページの必須フィールド） */
export const TEST_RESULT_JB31_FIELDS = [
  "表明日",
  "規格の規格番号及び改正年",
  "満たしている適合レベル",
  "対象となるウェブページに関する簡潔な説明",
  "依存したウェブコンテンツ技術のリスト",
  "試験対象のウェブページを選択した方法",
  "試験を行ったウェブページのURI",
  "達成基準チェックリスト",
  "試験実施期間",
] as const;

export type Wcag22AdditionId =
  "2.4.11" | "2.5.7" | "2.5.8" | "3.2.6" | "3.3.7" | "3.3.8";

export type Wcag22AdditionRow = {
  id: Wcag22AdditionId;
  title: string;
  /** テンプレート同梱時点での実装メモ（自治体試験の代替ではない） */
  templateNote: string;
};

/** N-02: WCAG 2.2 追加の A/AA 達成基準（方針・チェックリスト共用） */
export const WCAG22_ADDITIONS: readonly Wcag22AdditionRow[] = [
  {
    id: "2.4.11",
    title: "フォーカスの非隠蔽（Focus Not Obscured）",
    templateNote:
      "固定オーバーレイは置かない。フォーカスリングは outline で可視。",
  },
  {
    id: "2.5.7",
    title: "ドラッグ動作の代替（Dragging Movements）",
    templateNote:
      "現状ドラッグ必須 UI は無し。地図等が追加されたらポインタ単発の代替を必須化。",
  },
  {
    id: "2.5.8",
    title: "ターゲットサイズ（最小）（Target Size Minimum）",
    templateNote:
      "言語切替 select は min-height 2.75rem。フッター・ナビの単独リンクは min-height 24px。",
  },
  {
    id: "3.2.6",
    title: "一貫したヘルプ（Consistent Help）",
    templateNote:
      "全ページフッターに方針・試験結果・問い合わせを同一順で配置。",
  },
  {
    id: "3.3.7",
    title: "冗長な入力の回避（Redundant Entry）",
    templateNote:
      "住民向け入力フォームは未実装。追加時に前回入力の再利用を設計。",
  },
  {
    id: "3.3.8",
    title: "アクセシブルな認証（Accessible Authentication）",
    templateNote:
      "住民向け認証は無し。職員向け経路を公開する場合は認知機能テストを避ける。",
  },
] as const;

export const ACCESSIBILITY_POLICY = {
  municipality: `${PLACEHOLDER_MARK}○○市`,
  targetScope: `${PLACEHOLDER_MARK}https://example.city.example.jp/bosai/ 配下のウェブページ一式（PDF・動画を含む場合は範囲に明記）`,
  conformanceGoal:
    "JIS X 8341-3:2016 適合レベル AA、および WCAG 2.2 レベル AA（追加達成基準を含む）",
  exceptions: `${PLACEHOLDER_MARK}外部埋め込みコンテンツ、試験対象外とした第三者提供地図タイル等（該当が無ければ「なし」）`,
  department: `${PLACEHOLDER_MARK}○○市 防災課（電話: 000-0000-0000 / メール: bosai@example.city.example.jp）`,
  deadline: `${PLACEHOLDER_MARK}YYYY-MM-DD までに初回試験を完了し、以降は年1回以上見直し`,
  notes: [
    "本ページはテンプレート同梱の雛形です。導入自治体が試験実施後に内容を更新してください。",
    "自動検査（axe 等）は JIS 試験の代替ではありません。キーボード操作・読み上げ・地図のテキスト代替は手動試験が必要です。",
    "対応度の表記は WAIC「JIS X 8341-3:2016 対応度表記ガイドライン」に従ってください（未試験のまま「適合」と名乗らない）。",
  ],
} as const;

export const ACCESSIBILITY_TEST_RESULTS = {
  claimDate: `${PLACEHOLDER_MARK}YYYY-MM-DD`,
  standard: "JIS X 8341-3:2016",
  conformanceLevel: `${PLACEHOLDER_MARK}適合レベル AA（試験完了後に WAIC 対応度表記に合わせて記載）`,
  pageDescription: `${PLACEHOLDER_MARK}防災情報サイト（トップ、アクセシビリティ方針、試験結果 等）`,
  dependentTechnologies: "HTML、CSS、JavaScript、WAI-ARIA",
  selectionMethod: `${PLACEHOLDER_MARK}ウェブページ一式／ランダムなウェブページと代表的なウェブページ（WAIC 試験実施ガイドラインに従い選択）`,
  testedUris: [
    `${PLACEHOLDER_MARK}/`,
    `${PLACEHOLDER_MARK}/accessibility/`,
    `${PLACEHOLDER_MARK}/accessibility/test-results/`,
  ],
  checklistNote: `${PLACEHOLDER_MARK}達成基準チェックリスト（適合／不適合／適用外）を添付または下表を埋める。リポジトリの docs/a11y/wcag22-aa-checklist.md を複製してよい。`,
  testPeriod: `${PLACEHOLDER_MARK}YYYY-MM-DD 〜 YYYY-MM-DD`,
  tools: `${PLACEHOLDER_MARK}例: axe DevTools x.y / キーボード操作 / NVDA x.y + Firefox / VoiceOver + Safari / TalkBack + Chrome`,
  additionalNotes: [
    "テンプレート同梱時点では自治体サイトとしての正式な適合試験は未実施です。",
    "トップページ主要コンポーネントは vitest + jest-axe による自動検査を CI で実行しています（補完であり JIS 試験の代替ではない）。",
  ],
} as const;
