"use client";

import { BANNER_VARIANT_COLORS } from "@/config/alert-colors";
import type { UI_STRINGS } from "@/config/ui-strings";
import { resolveLocalizedString } from "@/lib/localized-string";
import type { SiteLanguage } from "@/config/site-language";
import type { EmergencyBannerData } from "@/types/top-page";

type Props = {
  data: EmergencyBannerData;
  lang: SiteLanguage;
  strings: (typeof UI_STRINGS)[SiteLanguage];
};

export function EmergencyBanner({ data, lang, strings }: Props) {
  const colors = BANNER_VARIANT_COLORS[data.variant];
  const isNeutral = data.variant === "お知らせ";
  const heading = resolveLocalizedString(data.heading, lang);
  const description = resolveLocalizedString(data.description, lang);
  const variantLabel = strings.bannerVariants[data.variant];

  return (
    <section
      className="emergency-banner"
      role={isNeutral ? "status" : "alert"}
      aria-live={isNeutral ? "polite" : "assertive"}
      aria-atomic="true"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      <div className="emergency-banner__inner">
        <p className="emergency-banner__variant">{variantLabel}</p>
        <h2 className="emergency-banner__heading">{heading}</h2>
        <p className="emergency-banner__description">{description}</p>
        {data.link ? (
          <p className="emergency-banner__link-wrap">
            <a className="emergency-banner__link" href={data.link.href}>
              {resolveLocalizedString(data.link.label, lang)}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function EmergencyBannerPlaceholder({
  loadingLabel,
  loadingText,
}: {
  loadingLabel: string;
  loadingText: string;
}) {
  return (
    <section
      className="emergency-banner emergency-banner--loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={loadingLabel}
    >
      <div className="emergency-banner__inner">
        <p className="emergency-banner__heading">{loadingText}</p>
      </div>
    </section>
  );
}

export function EmergencyBannerError({ message }: { message: string }) {
  return (
    <section
      className="emergency-banner emergency-banner--error"
      role="status"
      aria-live="polite"
    >
      <div className="emergency-banner__inner">
        <p className="emergency-banner__heading">{message}</p>
      </div>
    </section>
  );
}
