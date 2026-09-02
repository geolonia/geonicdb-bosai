import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/top/SiteFooter";
import { UI_STRINGS } from "@/config/ui-strings";

type Props = {
  children: ReactNode;
};

/**
 * 方針・試験結果など静的コンテンツ向けの共通枠。
 * WCAG 2.2 3.2.6（一貫したヘルプ）のため、トップと同じフッター導線を置く。
 */
export function ContentPageChrome({ children }: Props) {
  const strings = UI_STRINGS.ja;

  return (
    <>
      <header className="content-page-header">
        <div className="content-page-header__inner">
          <p className="content-page-header__brand">
            <Link href="/">{strings.municipalityName}</Link>
            <span aria-hidden="true"> / </span>
            <span>{strings.siteTitle}</span>
          </p>
          <nav className="content-page-header__nav" aria-label="関連ページ">
            <Link href="/accessibility/">{strings.footerAccessibility}</Link>
            <Link href="/accessibility/test-results/">
              {strings.footerTestResults}
            </Link>
            <Link href="/privacy/">{strings.footerPrivacy}</Link>
            <Link href="/">トップページ</Link>
          </nav>
        </div>
      </header>
      {children}
      <SiteFooter
        accessibilityLabel={strings.footerAccessibility}
        testResultsLabel={strings.footerTestResults}
        privacyLabel={strings.footerPrivacy}
        linksLabel={strings.footerLinksLabel}
        contactLabel={strings.footerContact}
        contactValue={strings.footerContactValue}
      />
    </>
  );
}
