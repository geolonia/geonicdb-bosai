import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_MARK,
  POLICY_HEADINGS,
  TEST_RESULT_JB31_FIELDS,
  WCAG22_ADDITIONS,
} from "@/config/accessibility-content";

describe("accessibility-content invariants", () => {
  it("keeps JB.3.1 field list exactly 9 items required by the annex", () => {
    expect([...TEST_RESULT_JB31_FIELDS]).toEqual([
      "表明日",
      "規格の規格番号及び改正年",
      "満たしている適合レベル",
      "対象となるウェブページに関する簡潔な説明",
      "依存したウェブコンテンツ技術のリスト",
      "試験対象のウェブページを選択した方法",
      "試験を行ったウェブページのURI",
      "達成基準チェックリスト",
      "試験実施期間",
    ]);
  });

  it("covers all six WCAG 2.2 additions required by N-02", () => {
    expect(WCAG22_ADDITIONS.map((row) => row.id).sort()).toEqual([
      "2.4.11",
      "2.5.7",
      "2.5.8",
      "3.2.6",
      "3.3.7",
      "3.3.8",
    ]);
  });

  it("keeps policy heading anchors stable for public pages", () => {
    expect(POLICY_HEADINGS[0]).toBe("ウェブアクセシビリティ方針");
    expect(PLACEHOLDER_MARK).toBe("【要記入】");
  });
});
