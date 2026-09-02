"use client";

import Link from "next/link";

type Props = {
  accessibilityLabel: string;
  testResultsLabel: string;
  linksLabel: string;
  contactLabel: string;
  contactValue: string;
};

export function SiteFooter({
  accessibilityLabel,
  testResultsLabel,
  linksLabel,
  contactLabel,
  contactValue,
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
          </ul>
        </nav>
        <p className="site-footer__contact">
          {contactLabel}: {contactValue}
        </p>
      </div>
    </footer>
  );
}
