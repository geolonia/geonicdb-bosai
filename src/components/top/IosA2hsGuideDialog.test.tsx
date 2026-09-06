// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useRef, useState } from "react";
import { IosA2hsGuideDialog } from "@/components/top/IosA2hsGuideDialog";
import { SITE_LANGUAGES } from "@/config/site-language";
import { UI_STRINGS } from "@/config/ui-strings";
import { testStrings } from "@/test/fixtures";

/** jsdom は showModal/close が不完全なことがあるので最低限を補う */
function ensureDialogMethods() {
  const proto = HTMLDialogElement.prototype;
  if (typeof proto.showModal !== "function") {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (typeof proto.close !== "function") {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}

function GuideHarness({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  return (
    <>
      <button
        type="button"
        ref={(el) => {
          returnFocusRef.current = el;
        }}
        onClick={() => setOpen(true)}
      >
        open-guide
      </button>
      <IosA2hsGuideDialog
        strings={testStrings}
        open={open}
        onClose={() => setOpen(false)}
        returnFocusRef={returnFocusRef}
      />
    </>
  );
}

describe("IosA2hsGuideDialog (#65)", () => {
  beforeEach(() => {
    ensureDialogMethods();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows numbered install steps when opened", async () => {
    const user = userEvent.setup();
    render(<GuideHarness />);

    await user.click(screen.getByRole("button", { name: "open-guide" }));

    const dialog = await screen.findByTestId("ios-a2hs-guide-dialog");
    expect(dialog).toHaveAttribute("open");
    expect(
      screen.getByRole("heading", { name: testStrings.a2hsIosGuideTitle }),
    ).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent(testStrings.a2hsIosGuideStep1);
    expect(items[1]).toHaveTextContent(testStrings.a2hsIosGuideStep2);
    expect(items[2]).toHaveTextContent(testStrings.a2hsIosGuideStep3);
    expect(items[3]).toHaveTextContent(testStrings.a2hsIosGuideStep4);
  });

  it("does not assert share-button screen position in any language", () => {
    const banned = /画面下|画面下部|bottom of (the )?screen|toolbar/i;
    for (const lang of SITE_LANGUAGES) {
      const s = UI_STRINGS[lang];
      expect(s.a2hsIosHint).not.toMatch(banned);
      expect(s.a2hsIosGuideStep1).not.toMatch(banned);
      expect(s.a2hsIosGuideStep1).toMatch(/…|\.\.\./);
      expect(s.a2hsIosGuideStep4.length).toBeGreaterThan(0);
    }
  });

  it("returns focus to the opener when closed", async () => {
    const user = userEvent.setup();
    render(<GuideHarness />);
    const opener = screen.getByRole("button", { name: "open-guide" });
    await user.click(opener);

    await screen.findByTestId("ios-a2hs-guide-dialog");
    await user.click(
      screen.getByRole("button", { name: testStrings.a2hsIosGuideCloseLabel }),
    );

    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  // near-miss: ステップ4（スタンドアロン起動）が無いと Push 前提が崩れる
  it("near-miss: step 4 must mention opening from the Home Screen icon", () => {
    for (const lang of SITE_LANGUAGES) {
      const step4 = UI_STRINGS[lang].a2hsIosGuideStep4;
      expect(step4.length).toBeGreaterThan(0);
      // 位置断定ではなく「追加されたアイコンから開く」系統であること
      expect(step4).not.toMatch(/画面下|画面下部/);
    }
    expect(testStrings.a2hsIosGuideStep4).toMatch(
      /ホーム画面|Home Screen|主屏幕|Màn hình chính|홈 화면/,
    );
  });
});
