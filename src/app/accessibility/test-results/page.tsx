import type { Metadata } from "next";
import Link from "next/link";
import { ContentPageChrome } from "@/components/content/ContentPageChrome";
import {
  ACCESSIBILITY_TEST_RESULTS,
  TEST_RESULT_JB31_FIELDS,
  WCAG22_ADDITIONS,
} from "@/config/accessibility-content";

export const metadata: Metadata = {
  title: "ウェブアクセシビリティ試験結果 | 防災情報",
  description: "JIS X 8341-3:2016 附属書 JB.3.1 に沿った試験結果の公開雛形",
};

export default function AccessibilityTestResultsPage() {
  const results = ACCESSIBILITY_TEST_RESULTS;
  const fieldValues: Record<(typeof TEST_RESULT_JB31_FIELDS)[number], string> =
    {
      表明日: results.claimDate,
      規格の規格番号及び改正年: results.standard,
      満たしている適合レベル: results.conformanceLevel,
      対象となるウェブページに関する簡潔な説明: results.pageDescription,
      依存したウェブコンテンツ技術のリスト: results.dependentTechnologies,
      試験対象のウェブページを選択した方法: results.selectionMethod,
      試験を行ったウェブページのURI: results.testedUris.join("、"),
      達成基準チェックリスト: results.checklistNote,
      試験実施期間: results.testPeriod,
    };

  return (
    <ContentPageChrome>
      <main className="content-page">
        <h1>ウェブアクセシビリティ試験結果</h1>
        <p>
          本ページは WAIC「JIS X 8341-3:2016
          試験実施ガイドライン」および規格附属書 JB.3.1 の表示事項に沿った
          <strong>記入雛形</strong>
          です。導入自治体が自サイトを試験したうえで更新してください。
        </p>
        <ul className="content-page__notes">
          {results.additionalNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>

        <section aria-labelledby="jb31-heading">
          <h2 id="jb31-heading">試験結果の表示事項（附属書 JB.3.1）</h2>
          <dl className="a11y-result-list">
            {TEST_RESULT_JB31_FIELDS.map((field) => (
              <div key={field} className="a11y-result-list__item">
                <dt>{field}</dt>
                <dd data-jb31-field={field}>{fieldValues[field]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="wcag22-heading">
          <h2 id="wcag22-heading">WCAG 2.2 追加達成基準（N-02）</h2>
          <p>
            JIS X 8341-3:2016（WCAG 2.0 相当）に加え、改正 JIS
            を見据えて次の基準を試験対象に含めます。詳細な記入は{" "}
            <code>docs/a11y/wcag22-aa-checklist.md</code> を用いてください。
          </p>
          <table className="a11y-table">
            <caption>WCAG 2.2 追加基準とテンプレート側の実装メモ</caption>
            <thead>
              <tr>
                <th scope="col">達成基準</th>
                <th scope="col">名称</th>
                <th scope="col">テンプレート実装メモ</th>
              </tr>
            </thead>
            <tbody>
              {WCAG22_ADDITIONS.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.id}</th>
                  <td>{row.title}</td>
                  <td>{row.templateNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading">
            試験に使用した環境（JB.3.2 追加事項・推奨）
          </h2>
          <p>{results.tools}</p>
          <p>
            支援技術シナリオの手順例は{" "}
            <code>docs/a11y/assistive-tech-scenarios.md</code>{" "}
            を参照してください。
          </p>
        </section>

        <p>
          <Link href="/accessibility/">ウェブアクセシビリティ方針へ戻る</Link>
        </p>
      </main>
    </ContentPageChrome>
  );
}
