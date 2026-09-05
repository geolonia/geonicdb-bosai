import type { Metadata } from "next";
import { ContentPageChrome } from "@/components/content/ContentPageChrome";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 防災情報",
  description:
    "位置情報・個人情報の取扱い方針の雛形（端末側処理を優先しサーバに保存しない）",
};

/**
 * プライバシーポリシー雛形（N-26）。
 * 導入自治体は組織名・連絡先・取扱い事務を実データに差し替えること。
 */
export default function PrivacyPage() {
  return (
    <ContentPageChrome>
      <main className="content-page">
        <h1>プライバシーポリシー</h1>
        <p>
          本テンプレートは、防災情報サイトにおける位置情報・個人情報の取扱い方針の雛形です。
          実際の公開にあたっては、導入する地方公共団体の規定に合わせて文言を確定してください。
        </p>

        <section aria-labelledby="privacy-location">
          <h2 id="privacy-location">位置情報の取扱い</h2>
          <p>
            現在地を用いた表示（例:
            避難所までの距離、ハザードマップ上の現在地）を提供する場合、
            位置情報は利用者の端末内でのみ処理し、サーバや外部サービスへ送信・保存しません。
            位置情報の取得は、ページ読み込み時に自動では行わず、利用者の操作を契機とします。
          </p>
        </section>

        <section aria-labelledby="privacy-pii">
          <h2 id="privacy-pii">個人情報の取扱い</h2>
          <p>
            住民向け公開ページは静的ファイルと公開防災データの閲覧を主とし、利用者の氏名・住所・連絡先等の個人情報を収集・保存しません。
            問い合わせ等で個人情報を受け取る場合は、各団体の個人情報保護条例および関連法令に従い取り扱います。
          </p>
        </section>

        <section aria-labelledby="privacy-push">
          <h2 id="privacy-push">ブラウザ通知（Web Push）</h2>
          <p>
            利用者が「通知を受け取る」を選択した場合に限り、ブラウザの通知許可を求めます。
            許可後、端末の PushSubscription（endpoint
            と暗号化鍵）を登録用プロキシへ送信し、 GeonicDB 上の Web Push
            サブスクリプション作成に利用します。
            氏名・住所などの個人情報は含みません。通知の許可要求はページ読み込み時に自動では行いません。
          </p>
        </section>

        <section aria-labelledby="privacy-access">
          <h2 id="privacy-access">アクセス情報</h2>
          <p>
            配信基盤やアクセス解析を利用する場合は、IP
            アドレスの匿名化などプライバシーに配慮した設定を行い、利用目的を本方針または関連文書に明記します。
          </p>
        </section>

        <section aria-labelledby="privacy-contact">
          <h2 id="privacy-contact">お問い合わせ</h2>
          <p>
            本方針に関するお問い合わせは、サイトフッターに記載のお問い合わせ先までご連絡ください。
          </p>
        </section>
      </main>
    </ContentPageChrome>
  );
}
