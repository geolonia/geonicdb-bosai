"use client";

import { ALERT_LEVEL_COLORS } from "@/config/alert-colors";
import { formatDateTime, UI_STRINGS } from "@/config/ui-strings";
import { resolveLocalizedString } from "@/lib/localized-string";
import type { SiteLanguage } from "@/config/site-language";
import type { AlertLevelData } from "@/types/top-page";

type Props = {
  data: AlertLevelData;
  lang: SiteLanguage;
  strings: (typeof UI_STRINGS)[SiteLanguage];
};

export function AlertLevelDisplay({ data, lang, strings }: Props) {
  const colors = ALERT_LEVEL_COLORS[data.level];
  const meta = strings.alertLevelMeta[data.level];
  const label = resolveLocalizedString(data.label, lang);

  return (
    <section className="alert-level" aria-labelledby="alert-level-heading">
      <h2 id="alert-level-heading">{strings.alertLevelHeading}</h2>
      <div
        className="alert-level__badge"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
        }}
      >
        <span className="alert-level__number" aria-hidden="true">
          {data.level}
        </span>
        <div className="alert-level__text">
          <p className="alert-level__label">
            {strings.alertLevelPrefix} {data.level}：{label}
          </p>
          <p className="alert-level__action">{meta.action}</p>
          {meta.officialNote ? (
            <p className="alert-level__note">{meta.officialNote}</p>
          ) : null}
        </div>
      </div>
      <p className="alert-level__updated">
        {strings.alertLevelUpdated}: {formatDateTime(data.updatedAt, lang)}
      </p>
    </section>
  );
}

export function AlertLevelPlaceholder({
  strings,
}: {
  strings: (typeof UI_STRINGS)[SiteLanguage];
}) {
  return (
    <section className="alert-level" aria-labelledby="alert-level-heading">
      <h2 id="alert-level-heading">{strings.alertLevelHeading}</h2>
      <p aria-busy="true">{strings.loading}</p>
    </section>
  );
}

export function AlertLevelError({
  heading,
  message,
}: {
  heading: string;
  message: string;
}) {
  return (
    <section className="alert-level" aria-labelledby="alert-level-heading">
      <h2 id="alert-level-heading">{heading}</h2>
      <p role="status">{message}</p>
    </section>
  );
}
