import Link from "next/link";

export default function AccessibilityPage() {
  return (
    <main className="content-page">
      <h1>ウェブアクセシビリティ方針</h1>
      <p>
        本テンプレートは、JIS X 8341-3（WCAG 2.2 AA
        相当）を目標にアクセシブルな防災情報サイトを提供します。
      </p>
      <ul>
        <li>警戒レベルは色だけでなく数字と文言を併記しています。</li>
        <li>
          緊急バナーは role=&quot;alert&quot; / aria-live で更新を通知します。
        </li>
        <li>320px 幅でも横スクロールが発生しないレスポンシブ設計です。</li>
      </ul>
      <p>
        <Link href="/">トップページへ戻る</Link>
      </p>
    </main>
  );
}
