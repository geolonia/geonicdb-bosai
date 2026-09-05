import type { SiteLanguage } from "@/config/site-language";
import { toDateLocale } from "@/config/site-language";

export type UiStrings = {
  siteTitle: string;
  municipalityName: string;
  langLabel: string;
  alertLevelHeading: string;
  alertLevelPrefix: string;
  alertLevelUpdated: string;
  quickLinksHeading: string;
  newsHeading: string;
  newsUpdated: string;
  footerAccessibility: string;
  footerTestResults: string;
  footerPrivacy: string;
  footerLinksLabel: string;
  footerContact: string;
  footerContactValue: string;
  comingSoon: string;
  loading: string;
  loadError: string;
  /** ビルド時スナップショット表示時。`{time}` は HH:MM。 */
  asOfLabel: string;
  /** F-45: 取得失敗かつ最終取得時刻あり。`{time}` は HH:MM。 */
  loadErrorWithLastFetch: string;
  bannerLoadingLabel: string;
  /** #35 Web Push 購読ボタン */
  pushEnableLabel: string;
  pushEnabledLabel: string;
  pushUnsupportedLabel: string;
  pushErrorLabel: string;
  pushBusyLabel: string;
  quickLinks: {
    shelters: string;
    hazard: string;
    evacuation: string;
    preparedness: string;
  };
  bannerVariants: {
    "emergency-safety": string;
    "evacuation-order": string;
    "elderly-evacuation": string;
    advisory: string;
    notice: string;
  };
  alertLevelMeta: Record<
    1 | 2 | 3 | 4 | 5,
    { action: string; officialNote?: string }
  >;
};

export const UI_STRINGS: Record<SiteLanguage, UiStrings> = {
  ja: {
    siteTitle: "防災情報",
    municipalityName: "○○市（テンプレート）",
    langLabel: "表示言語",
    alertLevelHeading: "現在の警戒レベル",
    alertLevelPrefix: "警戒レベル",
    alertLevelUpdated: "更新",
    quickLinksHeading: "クイックリンク",
    newsHeading: "新着・お知らせ",
    newsUpdated: "更新",
    footerAccessibility: "ウェブアクセシビリティ方針",
    footerTestResults: "試験結果",
    footerPrivacy: "プライバシーポリシー",
    footerLinksLabel: "フッターリンク",
    footerContact: "お問い合わせ",
    footerContactValue: "防災担当: 000-0000-0000",
    comingSoon: "準備中",
    loading: "読み込み中…",
    loadError: "情報を読み込めませんでした。時間をおいて再度お試しください。",
    asOfLabel: "この情報は {time} 時点",
    loadErrorWithLastFetch: "情報を取得できません（最終取得 {time}）",
    bannerLoadingLabel: "緊急情報を読み込み中",
    pushEnableLabel: "通知を受け取る",
    pushEnabledLabel: "通知はオンです",
    pushUnsupportedLabel: "このブラウザでは通知を利用できません",
    pushErrorLabel:
      "通知の設定に失敗しました。時間をおいて再度お試しください。",
    pushBusyLabel: "通知を設定しています…",
    quickLinks: {
      shelters: "避難所を探す",
      hazard: "ハザードマップ",
      evacuation: "避難情報",
      preparedness: "防災の備え",
    },
    bannerVariants: {
      "emergency-safety": "緊急安全確保",
      "evacuation-order": "避難指示",
      "elderly-evacuation": "高齢者等避難",
      advisory: "注意喚起",
      notice: "お知らせ",
    },
    alertLevelMeta: {
      1: { action: "災害への心構えを高める" },
      2: { action: "自らの避難行動を確認" },
      3: { action: "高齢者等は避難、他の人は準備" },
      4: {
        action: "危険な場所から全員避難",
        officialNote: "警戒レベル4までに全員避難",
      },
      5: {
        action: "命の危険。直ちに安全確保",
        officialNote: "レベル5は既に危険な段階に入っている可能性があります",
      },
    },
  },
  en: {
    siteTitle: "Disaster Information",
    municipalityName: "○○ City (Template)",
    langLabel: "Language",
    alertLevelHeading: "Current Alert Level",
    alertLevelPrefix: "Alert level",
    alertLevelUpdated: "Updated",
    quickLinksHeading: "Quick Links",
    newsHeading: "News & Updates",
    newsUpdated: "Updated",
    footerAccessibility: "Web Accessibility Policy",
    footerTestResults: "Test Results",
    footerPrivacy: "Privacy Policy",
    footerLinksLabel: "Footer links",
    footerContact: "Contact",
    footerContactValue: "Disaster Management: 000-0000-0000",
    comingSoon: "Coming soon",
    loading: "Loading…",
    loadError: "Could not load information. Please try again later.",
    asOfLabel: "This information is as of {time}",
    loadErrorWithLastFetch:
      "Unable to retrieve information (last fetched {time})",
    bannerLoadingLabel: "Loading emergency information",
    pushEnableLabel: "Enable notifications",
    pushEnabledLabel: "Notifications are on",
    pushUnsupportedLabel: "Notifications are not supported in this browser",
    pushErrorLabel: "Could not enable notifications. Please try again later.",
    pushBusyLabel: "Enabling notifications…",
    quickLinks: {
      shelters: "Find Shelters",
      hazard: "Hazard Map",
      evacuation: "Evacuation Info",
      preparedness: "Preparedness",
    },
    bannerVariants: {
      "emergency-safety": "Emergency safety alert",
      "evacuation-order": "Evacuation order",
      "elderly-evacuation": "Elderly evacuation",
      advisory: "Advisory",
      notice: "Notice",
    },
    alertLevelMeta: {
      1: { action: "Prepare for disasters" },
      2: { action: "Check your evacuation plan" },
      3: { action: "Elderly should evacuate; others prepare" },
      4: {
        action: "Evacuate immediately from dangerous areas",
        officialNote: "Everyone should evacuate by alert level 4",
      },
      5: {
        action: "Life-threatening. Secure safety immediately",
        officialNote: "Level 5 may mean it is already too late to wait",
      },
    },
  },
  "zh-CN": {
    siteTitle: "防灾信息",
    municipalityName: "○○市（模板）",
    langLabel: "语言",
    alertLevelHeading: "当前警戒级别",
    alertLevelPrefix: "警戒级别",
    alertLevelUpdated: "更新",
    quickLinksHeading: "快捷链接",
    newsHeading: "最新消息",
    newsUpdated: "更新",
    footerAccessibility: "网页无障碍方针",
    footerTestResults: "测试结果",
    footerPrivacy: "隐私政策",
    footerLinksLabel: "页脚链接",
    footerContact: "联系方式",
    footerContactValue: "防灾负责: 000-0000-0000",
    comingSoon: "准备中",
    loading: "加载中…",
    loadError: "无法加载信息。请稍后再试。",
    asOfLabel: "本信息截至 {time}",
    loadErrorWithLastFetch: "无法获取信息（最后获取 {time}）",
    bannerLoadingLabel: "正在加载紧急信息",
    pushEnableLabel: "接收通知",
    pushEnabledLabel: "通知已开启",
    pushUnsupportedLabel: "此浏览器不支持通知",
    pushErrorLabel: "无法开启通知。请稍后再试。",
    pushBusyLabel: "正在设置通知…",
    quickLinks: {
      shelters: "查找避难所",
      hazard: "灾害风险地图",
      evacuation: "避难信息",
      preparedness: "防灾准备",
    },
    bannerVariants: {
      "emergency-safety": "紧急安全确保",
      "evacuation-order": "避难指示",
      "elderly-evacuation": "老年人等避难",
      advisory: "提醒注意",
      notice: "通知",
    },
    alertLevelMeta: {
      1: { action: "提高防灾意识" },
      2: { action: "确认自己的避难行动" },
      3: { action: "老年人等请避难，其他人做好准备" },
      4: {
        action: "所有人立即离开危险场所避难",
        officialNote: "请在警戒级别4之前完成避难",
      },
      5: {
        action: "危及生命。请立即确保安全",
        officialNote: "级别5可能意味着已进入危险阶段",
      },
    },
  },
  vi: {
    siteTitle: "Thông tin phòng chống thiên tai",
    municipalityName: "Thành phố ○○ (Mẫu)",
    langLabel: "Ngôn ngữ",
    alertLevelHeading: "Mức cảnh báo hiện tại",
    alertLevelPrefix: "Mức cảnh báo",
    alertLevelUpdated: "Cập nhật",
    quickLinksHeading: "Liên kết nhanh",
    newsHeading: "Tin tức mới",
    newsUpdated: "Cập nhật",
    footerAccessibility: "Chính sách tiếp cận web",
    footerTestResults: "Kết quả kiểm tra",
    footerPrivacy: "Chính sách quyền riêng tư",
    footerLinksLabel: "Liên kết chân trang",
    footerContact: "Liên hệ",
    footerContactValue: "Bộ phận phòng chống thiên tai: 000-0000-0000",
    comingSoon: "Đang chuẩn bị",
    loading: "Đang tải…",
    loadError: "Không thể tải thông tin. Vui lòng thử lại sau.",
    asOfLabel: "Thông tin này tính đến {time}",
    loadErrorWithLastFetch: "Không thể lấy thông tin (lần lấy cuối {time})",
    bannerLoadingLabel: "Đang tải thông tin khẩn cấp",
    pushEnableLabel: "Nhận thông báo",
    pushEnabledLabel: "Thông báo đang bật",
    pushUnsupportedLabel: "Trình duyệt này không hỗ trợ thông báo",
    pushErrorLabel: "Không thể bật thông báo. Vui lòng thử lại sau.",
    pushBusyLabel: "Đang thiết lập thông báo…",
    quickLinks: {
      shelters: "Tìm nơi sơ tán",
      hazard: "Bản đồ rủi ro",
      evacuation: "Thông tin sơ tán",
      preparedness: "Chuẩn bị phòng tai",
    },
    bannerVariants: {
      "emergency-safety": "Đảm bảo an toàn khẩn cấp",
      "evacuation-order": "Chỉ thị sơ tán",
      "elderly-evacuation": "Người cao tuổi sơ tán",
      advisory: "Cảnh báo",
      notice: "Thông báo",
    },
    alertLevelMeta: {
      1: { action: "Chuẩn bị tinh thần trước thiên tai" },
      2: { action: "Xác nhận hành động sơ tán của bạn" },
      3: {
        action: "Người cao tuổi hãy sơ tán; người khác chuẩn bị",
      },
      4: {
        action: "Mọi người rời nơi nguy hiểm ngay",
        officialNote: "Hãy sơ tán trước mức cảnh báo 4",
      },
      5: {
        action: "Nguy hiểm đến tính mạng. Đảm bảo an toàn ngay",
        officialNote: "Mức 5 có thể đã quá muộn để chờ đợi",
      },
    },
  },
  ko: {
    siteTitle: "방재 정보",
    municipalityName: "○○시(템플릿)",
    langLabel: "언어",
    alertLevelHeading: "현재 경계 수준",
    alertLevelPrefix: "경계 수준",
    alertLevelUpdated: "업데이트",
    quickLinksHeading: "바로가기",
    newsHeading: "새 소식",
    newsUpdated: "업데이트",
    footerAccessibility: "웹 접근성 방침",
    footerTestResults: "시험 결과",
    footerPrivacy: "개인정보 처리방침",
    footerLinksLabel: "바닥글 링크",
    footerContact: "문의",
    footerContactValue: "방재 담당: 000-0000-0000",
    comingSoon: "준비 중",
    loading: "불러오는 중…",
    loadError: "정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    asOfLabel: "이 정보는 {time} 시점입니다",
    loadErrorWithLastFetch: "정보를 가져올 수 없습니다(마지막 취득 {time})",
    bannerLoadingLabel: "긴급 정보를 불러오는 중",
    pushEnableLabel: "알림 받기",
    pushEnabledLabel: "알림이 켜져 있습니다",
    pushUnsupportedLabel: "이 브라우저에서는 알림을 사용할 수 없습니다",
    pushErrorLabel: "알림 설정에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    pushBusyLabel: "알림을 설정하는 중…",
    quickLinks: {
      shelters: "대피소 찾기",
      hazard: "위험 지도",
      evacuation: "대피 정보",
      preparedness: "방재 준비",
    },
    bannerVariants: {
      "emergency-safety": "긴급 안전 확보",
      "evacuation-order": "대피 지시",
      "elderly-evacuation": "고령자 등 대피",
      advisory: "주의 환기",
      notice: "알림",
    },
    alertLevelMeta: {
      1: { action: "재해에 대한 대비 의식을 높이세요" },
      2: { action: "자신의 대피 행동을 확인하세요" },
      3: { action: "고령자 등은 대피, 다른 사람은 준비" },
      4: {
        action: "위험한 곳에서 전원 대피",
        officialNote: "경계 수준 4까지 전원 대피하세요",
      },
      5: {
        action: "생명이 위험합니다. 즉시 안전을 확보하세요",
        officialNote: "수준 5는 이미 위험한 단계일 수 있습니다",
      },
    },
  },
};

export function formatDateTime(iso: string, lang: SiteLanguage): string {
  return new Intl.DateTimeFormat(toDateLocale(lang), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

/** F-45 / as-of 用の HH:MM（Asia/Tokyo、24時間制）。 */
export function formatTimeHHMM(iso: string, lang: SiteLanguage): string {
  return new Intl.DateTimeFormat(toDateLocale(lang), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

export function formatAsOfLabel(
  template: string,
  iso: string,
  lang: SiteLanguage,
): string {
  return template.replace("{time}", formatTimeHHMM(iso, lang));
}

export function formatLoadError(
  strings: UiStrings,
  lastFetchedAt: string | null,
  lang: SiteLanguage,
): string {
  if (!lastFetchedAt) return strings.loadError;
  return formatAsOfLabel(strings.loadErrorWithLastFetch, lastFetchedAt, lang);
}
