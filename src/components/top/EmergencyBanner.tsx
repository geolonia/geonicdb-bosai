"use client";

import { BANNER_VARIANT_COLORS } from "@/config/alert-colors";
import type { UiStrings } from "@/config/ui-strings";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import type { BosaiEmergencyBanner } from "@/types/top-page";

type Props = {
  data: BosaiEmergencyBanner;
  strings: UiStrings;
};

export function EmergencyBanner({ data, strings }: Props) {
  const colors = BANNER_VARIANT_COLORS[data.variant];
  const isNeutral = data.variant === "notice";
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
        <h2 className="emergency-banner__heading">{data.heading}</h2>
        <SafeMarkdown className="emergency-banner__description">
          {data.body}
        </SafeMarkdown>
        {data.linkHref && data.linkText ? (
          <p className="emergency-banner__link-wrap">
            <a className="emergency-banner__link" href={data.linkHref}>
              {data.linkText}
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
