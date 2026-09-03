import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
} from "@/types/top-page";
import type { SiteLanguage } from "@/config/site-language";

/** ビルド時（またはサーバ取得時）の 1 リソース分。失敗しても他リソースを巻き込まない。 */
export type BosaiResourceResult<T> =
  | { ok: true; data: T; fetchedAt: string }
  | { ok: false; data: null; fetchedAt: string | null };

export type BosaiLangSnapshot = {
  banner: BosaiResourceResult<BosaiEmergencyBanner>;
  alertLevel: BosaiResourceResult<BosaiAlertLevel>;
  notices: BosaiResourceResult<BosaiNotice[]>;
};

/** `output: "export"` ビルド時に HTML へ埋め込むスナップショット。 */
export type BosaiStaticSnapshot = {
  /** スナップショット取得を開始した時刻（ISO）。 */
  builtAt: string;
  languages: Record<SiteLanguage, BosaiLangSnapshot>;
};
