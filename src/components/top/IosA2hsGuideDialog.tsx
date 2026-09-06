"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import type { UiStrings } from "@/config/ui-strings";

type Props = {
  strings: UiStrings;
  open: boolean;
  onClose: () => void;
  /** 閉じたあとにフォーカスを戻す要素（開いたボタン） */
  returnFocusRef: RefObject<HTMLElement | null>;
};

/** 共有アイコンの挿絵（□＋↑）。意味は手順テキスト側に持たせる。 */
function ShareGlyph() {
  return (
    <svg
      className="ios-a2hs-guide__share-icon"
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 3v11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 7l4-4 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="12"
        width="14"
        height="9"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * iOS 向け「ホーム画面に追加」手順ダイアログ（#65）。
 * 帯・通知オプトインのどちらからも開けるよう独立コンポーネント。
 * native dialog.showModal() に任せ、自前 focus trap はしない。
 */
export function IosA2hsGuideDialog({
  strings,
  open,
  onClose,
  returnFocusRef,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      onClose();
      const target = returnFocusRef.current;
      requestAnimationFrame(() => {
        target?.focus();
      });
    };

    dialog.addEventListener("close", handleNativeClose);
    return () => {
      dialog.removeEventListener("close", handleNativeClose);
    };
  }, [onClose, returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      className="ios-a2hs-guide"
      aria-labelledby={titleId}
      data-testid="ios-a2hs-guide-dialog"
    >
      <div className="ios-a2hs-guide__panel">
        <h2 className="ios-a2hs-guide__title" id={titleId}>
          {strings.a2hsIosGuideTitle}
        </h2>
        <ol className="ios-a2hs-guide__steps">
          <li>
            <span className="ios-a2hs-guide__step-body">
              <ShareGlyph />
              <span>{strings.a2hsIosGuideStep1}</span>
            </span>
          </li>
          <li>{strings.a2hsIosGuideStep2}</li>
          <li>{strings.a2hsIosGuideStep3}</li>
          <li>{strings.a2hsIosGuideStep4}</li>
        </ol>
        <button
          type="button"
          className="ios-a2hs-guide__close"
          onClick={() => {
            dialogRef.current?.close();
          }}
        >
          {strings.a2hsIosGuideCloseLabel}
        </button>
      </div>
    </dialog>
  );
}
