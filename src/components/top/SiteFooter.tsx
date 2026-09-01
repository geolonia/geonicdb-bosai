"use client";

type Props = {
  accessibilityLabel: string;
  contactLabel: string;
  contactValue: string;
};

export function SiteFooter({
  accessibilityLabel,
  contactLabel,
  contactValue,
}: Props) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          <a href="/accessibility/">{accessibilityLabel}</a>
        </p>
        <p>
          {contactLabel}: {contactValue}
        </p>
      </div>
    </footer>
  );
}
