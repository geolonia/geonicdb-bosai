"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  accessibilityLabel: string;
  testResultsLabel: string;
  privacyLabel: string;
  linksLabel: string;
  contactLabel: string;
  contactValue: string;
  /**
   * 連絡先の後に置く付加 UI（例: 通知トグル）。ContentPageChrome は渡さない。
   * `PushNotificationOptIn` は固定 id を持つので、1 ページに 2 個描画しないこと
   *（推奨帯 `PushOptInBanner` のアンカー先が重複する）。
   */
  children?: ReactNode;
};

export function SiteFooter({
  accessibilityLabel,
  testResultsLabel,
  privacyLabel,
  linksLabel,
  contactLabel,
  contactValue,
  children,
}: Props) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <nav className="site-footer__nav" aria-label={linksLabel}>
          <ul className="site-footer__links">
            <li>
              <Link href="/accessibility/">{accessibilityLabel}</Link>
            </li>
            <li>
              <Link href="/accessibility/test-results/">
                {testResultsLabel}
              </Link>
            </li>
            <li>
              <Link href="/privacy/">{privacyLabel}</Link>
            </li>
          </ul>
        </nav>
        <p className="site-footer__contact">
          {contactLabel}: {contactValue}
        </p>
        {children}
      </div>
    </footer>
  );
}
