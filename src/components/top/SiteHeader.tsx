"use client";

import type { SiteLanguage } from "@/types/top-page";

type Props = {
  strings: {
    siteTitle: string;
    municipalityName: string;
    langLabel: string;
    langJa: string;
    langJaEasy: string;
    langEn: string;
  };
  lang: SiteLanguage;
  onLangChange: (lang: SiteLanguage) => void;
};

export function SiteHeader({ strings, lang, onLangChange }: Props) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <p className="site-header__logo" aria-hidden="true">
            ◎
          </p>
          <div>
            <p className="site-header__municipality">
              {strings.municipalityName}
            </p>
            <h1 className="site-header__title">{strings.siteTitle}</h1>
          </div>
        </div>
        <nav className="site-header__lang" aria-label={strings.langLabel}>
          <ul className="site-header__lang-list">
            {(
              [
                ["ja", strings.langJa],
                ["ja-easy", strings.langJaEasy],
                ["en", strings.langEn],
              ] as const
            ).map(([code, label]) => (
              <li key={code}>
                <button
                  type="button"
                  className={
                    lang === code
                      ? "site-header__lang-btn site-header__lang-btn--active"
                      : "site-header__lang-btn"
                  }
                  aria-pressed={lang === code}
                  onClick={() => onLangChange(code)}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
