"use client";

import { BANNER_VARIANT_COLORS } from "@/config/alert-colors";
import type { EmergencyBannerData } from "@/types/top-page";

type Props = {
  data: EmergencyBannerData;
};

export function EmergencyBanner({ data }: Props) {
  const colors = BANNER_VARIANT_COLORS[data.variant];

  return (
    <section
      className="emergency-banner"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      <div className="emergency-banner__inner">
        <p className="emergency-banner__variant">{data.variant}</p>
        <h2 className="emergency-banner__heading">{data.heading}</h2>
        <p className="emergency-banner__description">{data.description}</p>
        {data.link ? (
          <p className="emergency-banner__link-wrap">
            <a className="emergency-banner__link" href={data.link.href}>
              {data.link.label}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function EmergencyBannerPlaceholder() {
  return (
    <section
      className="emergency-banner emergency-banner--loading"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      aria-label="緊急情報を読み込み中"
    >
      <div className="emergency-banner__inner">
        <p className="emergency-banner__heading">読み込み中…</p>
      </div>
    </section>
  );
}
