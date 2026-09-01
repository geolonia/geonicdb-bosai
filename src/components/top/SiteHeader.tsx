"use client";

import {
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
        <div className="site-header__lang">
          <label className="site-header__lang-label" htmlFor="site-lang">
            {strings.langLabel}
          </label>
          <select
            id="site-lang"
            className="site-header__lang-select"
            value={lang}
            onChange={(event) =>
              onLangChange(event.target.value as SiteLanguage)
            }
          >
            {SITE_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {SITE_LANGUAGE_LABELS[code]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
