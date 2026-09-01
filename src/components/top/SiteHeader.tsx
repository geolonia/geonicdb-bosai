"use client";

import {
  SITE_LANGUAGE_FLAGS,
  SITE_LANGUAGE_LABELS,
  SITE_LANGUAGES,
  type SiteLanguage,
} from "@/config/site-language";
import type { UiStrings } from "@/config/ui-strings";

type Props = {
  strings: Pick<UiStrings, "siteTitle" | "municipalityName" | "langLabel">;
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
        {/*
          国旗はクリック対象として分かりやすくするための装飾（aria-hidden）。
          言語と国は 1:1 ではないため、読み上げ・判別は言語名テキストで行う。
        */}
        <nav className="site-header__lang" aria-label={strings.langLabel}>
          <ul className="site-header__lang-list">
            {SITE_LANGUAGES.map((code) => {
              const isCurrent = code === lang;
              return (
                <li key={code}>
                  <button
                    type="button"
                    className="site-header__lang-button"
                    lang={code}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => onLangChange(code)}
                  >
                    <span className="site-header__lang-flag" aria-hidden="true">
                      {SITE_LANGUAGE_FLAGS[code]}
                    </span>
                    <span className="site-header__lang-name">
                      {SITE_LANGUAGE_LABELS[code]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
