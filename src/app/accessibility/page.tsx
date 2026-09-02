import type { Metadata } from "next";
import Link from "next/link";
import { ContentPageChrome } from "@/components/content/ContentPageChrome";
import {
  ACCESSIBILITY_POLICY,
  POLICY_HEADINGS,
  WCAG22_ADDITIONS,
} from "@/config/accessibility-content";

export const metadata: Metadata = {
  title: "ウェブアクセシビリティ方針 | 防災情報",
  description:
    "JIS X 8341-3:2016 AA / WCAG 2.2 AA を目標とするウェブアクセシビリティ方針（雛形）",
};

export default function AccessibilityPolicyPage() {
  const policy = ACCESSIBILITY_POLICY;

  return (
    <ContentPageChrome>
      <main className="content-page">
        <h1>{POLICY_HEADINGS[0]}</h1>
        <p>
          {policy.municipality}
          は、障害者差別解消法に基づく合理的配慮の提供義務を踏まえ、誰もが利用しやすい防災情報サイトの提供を目指します。
        </p>
        <ul className="content-page__notes">
          {policy.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>

        <section aria-labelledby="a11y-scope">
          <h2 id="a11y-scope">{POLICY_HEADINGS[1]}</h2>
          <p>{policy.targetScope}</p>
        </section>

        <section aria-labelledby="a11y-level">
          <h2 id="a11y-level">{POLICY_HEADINGS[2]}</h2>
          <p>{policy.conformanceGoal}</p>
          <p>
            WCAG 2.2 で追加された次の達成基準にも先行対応します（詳細は{" "}
            <Link href="/accessibility/test-results/">試験結果</Link>{" "}
            およびリポジトリのチェックリストを参照）。
          </p>
          <ul>
            {WCAG22_ADDITIONS.map((row) => (
              <li key={row.id}>
                <strong>
                  {row.id} {row.title}
                </strong>
                <span> — {row.templateNote}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="a11y-exceptions">
          <h2 id="a11y-exceptions">{POLICY_HEADINGS[3]}</h2>
          <p>{policy.exceptions}</p>
        </section>

        <section aria-labelledby="a11y-department">
          <h2 id="a11y-department">{POLICY_HEADINGS[4]}</h2>
          <p>{policy.department}</p>
        </section>

        <section aria-labelledby="a11y-deadline">
          <h2 id="a11y-deadline">{POLICY_HEADINGS[5]}</h2>
          <p>{policy.deadline}</p>
        </section>

        <section aria-labelledby="a11y-related">
          <h2 id="a11y-related">{POLICY_HEADINGS[6]}</h2>
          <ul>
            <li>
              <Link href="/accessibility/test-results/">
                ウェブアクセシビリティ試験結果
              </Link>
            </li>
            <li>
              <a
                href="https://waic.jp/docs/jis2016/test-guidelines/"
                rel="noopener noreferrer"
              >
                WAIC「JIS X 8341-3:2016 試験実施ガイドライン」
              </a>
            </li>
            <li>
              <a
                href="https://www.digital.go.jp/resources/introduction-to-web-accessibility-guidebook"
                rel="noopener noreferrer"
              >
                デジタル庁「ウェブアクセシビリティ導入ガイドブック」
              </a>
            </li>
          </ul>
        </section>

        <section aria-labelledby="a11y-impl">
          <h2 id="a11y-impl">テンプレート同梱の実装上の配慮（参考）</h2>
          <ul>
            <li>
              警戒レベルは色だけでなく数字と文言を併記しています（N-03）。
            </li>
            <li>
              緊急バナーは role=&quot;alert&quot; / aria-live
              で更新を通知します（WCAG 4.1.3）。
            </li>
            <li>
              320px 幅でも横スクロールが発生しないレスポンシブ設計です（WCAG
              1.4.10）。
            </li>
            <li>
              独自の閲覧支援ツールは同梱せず、ブラウザ標準の拡大・読み上げ・反転を阻害しません（N-05）。
            </li>
            <li>
              地図・グラフ・PDF・動画は現状未提供です。追加時は同等のテキスト／表、テキスト付き
              PDF、字幕・書き起こしを必須とします（N-04 / N-06 / N-07）。
            </li>
          </ul>
        </section>
      </main>
    </ContentPageChrome>
  );
}
