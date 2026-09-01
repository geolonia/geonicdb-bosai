# 自治体向け防災サイト ガイドライン調査

作成日: 2026-09-01 / 対象: `geonicdb-bosai`（自治体向け防災サイトテンプレート）の要件定義インプット

本書は、国内外の防災サイトに関する公的ガイドライン・基準・ベストプラクティスを調査し、テンプレート実装に落とすべき要件を整理したものである。

> **注意**: 制度・ガイドラインは改定頻度が高い（特に気象庁の防災気象情報体系は 2026-05-29 に大改定済み、JIS X 8341-3 は WCAG 2.2 整合に向けた改正審議中）。実装時は必ず各一次情報の最新版を確認すること。

---

## 目次

1. [国内ガイドライン](#1-国内ガイドライン)
2. [海外ガイドライン・国際規格](#2-海外ガイドライン国際規格)
3. [要件へのまとめ（チェックリスト）](#3-要件へのまとめチェックリスト)
4. [一次情報 URL リスト](#4-一次情報-url-リスト)

---

## 1. 国内ガイドライン

### 1.1 内閣府（防災担当）— 避難情報に関するガイドライン

自治体防災サイトの**情報設計の背骨**となる文書。市町村が発令する避難情報と、警戒レベル 1〜5 の対応関係を定めている。

- **最新版: 令和 8 年（2026 年）3 月改定**。本編・別冊・スライド版の 3 部構成で公開されている。
- 市町村は地域防災計画に避難情報の発令基準を記載する責務を負う。
- 警戒レベルと避難情報の対応:

| 警戒レベル | 住民が取るべき行動 | 対応する避難情報（市町村発令） | 発表主体 |
|---|---|---|---|
| 5 | 命の危険。直ちに安全確保 | **緊急安全確保** | 市町村 |
| 4 | 危険な場所から**全員避難** | **避難指示** | 市町村 |
| 3 | 高齢者等は避難、他の人は準備 | **高齢者等避難** | 市町村 |
| 2 | 自らの避難行動を確認 | （気象庁の注意報等） | 気象庁 |
| 1 | 災害への心構えを高める | （早期注意情報） | 気象庁 |

- **重要**: 「警戒レベル 4 までに全員避難」「レベル 5 はレベル 4 までとは異なる段階（すでに手遅れになりうる）」というメッセージングが公式に強調されている。サイト上の文言はこれに揃える必要がある。
- 令和 8 年 7 月 21 日付で津波関連の情報発令に関する通知が追加されている。

出典:
- https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/
- 本編 PDF: https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/pdf/hinan_guideline_r8_1.pdf
- 別冊 PDF: https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/pdf/hinan_guideline_r8_2.pdf
- スライド版 PDF: https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/pdf/hinan_guideline_r8_3.pdf

### 1.2 内閣府 — 警戒レベルの配色（実装必須の色仕様）

内閣府（防災担当）が 2020-05-29 に RGB 値、2021-03-05 に CMYK 値を公表した**公式配色**。色覚の多様性（1 型・2 型色覚、ロービジョン）に配慮して選定されており、防災サイトの UI カラーは原則これに従う。

| 区分 | 色 | RGB |
|---|---|---|
| 警戒レベル 5 / 相当情報 / 災害発生情報 | 黒 | `rgb(12, 0, 12)` = `#0C000C` |
| 警戒レベル 4 / 相当情報 | 紫 | `rgb(170, 0, 170)` = `#AA00AA` |
| 警戒レベル 3 / 相当情報 | 赤 | `rgb(255, 40, 0)` = `#FF2800` |
| 警戒レベル 2 / 相当情報 | 黄 | `rgb(242, 231, 0)` = `#F2E700` |
| 警戒レベル 1 | 白 | `rgb(255, 255, 255)` = `#FFFFFF` |

- 赤は黒・紫と区別しやすいよう**やや橙寄り**に振ってある。
- 紫は 1 型／2 型色覚双方が識別できる中間色。**微調整で青や赤に寄せてはならない**と明記されている。
- 気象庁も「気象庁ホームページにおける気象情報の配色に関する設定指針」（平成 24 年 5 月制定、令和 2 年 7 月一部改訂）で同系統の配色を定めており、注意喚起を要しないレベルは青系の濃淡、特に警戒すべきレベルは赤紫を用いる。RGB 値は sRGB（色温度 6500K・ガンマ 2.2）および BT.709 を想定。

出典:
- https://www.bousai.go.jp/pdf/200529_haishoku.pdf （RGB 値公表）
- https://www.bousai.go.jp/pdf/210305_color.pdf （RGB + CMYK 一覧）
- https://www.jma.go.jp/jma/kishou/info/colorguide/HPColorGuide_202007.pdf （気象庁 配色指針 令和2年7月改訂版）

### 1.3 気象庁 — 防災気象情報の体系整理（2026 年 5 月 29 日運用開始）

**本テンプレートの設計に直接影響する最重要の制度変更。**

- 従来の警報・注意報の名称に**警戒レベルの数字を冠する**方式へ変更。例: 「大雨警報」→「**レベル 3 大雨警報**」。
- 対象は「河川氾濫」「大雨」「土砂災害」「高潮」に関する情報。
- 目的は、警戒レベルと個々の情報名の対応が複雑で分かりにくかった課題の解消。
- 施行日: **2026-05-29**。既存の自治体サイトには旧名称が残っている可能性が高く、テンプレートは新体系を前提にすべき。

また、キキクル（危険度分布）や特別警報も含め、気象庁は防災情報を XML 電文（気象庁防災情報 XML フォーマット）で配信しており、国際的には CAP（Common Alerting Protocol）プロファイル（CAP-RSMCTK 等）も提供している。

出典:
- https://www.jma.go.jp/jma/kishou/know/bosai/keiho-update2026/
- https://www.kantei.go.jp/jp/headline/bousai/keihou.html
- https://www.jma.go.jp/jma/jma-eng/jma-center/rsmc-hp-pub-eg/cap-rsmctk.pdf

### 1.4 総務省消防庁 — L アラート / 災害情報伝達手段

#### L アラート（災害情報共有システム）

自治体が避難情報等を入力すると、放送事業者・ネット事業者・アプリ等へ**一斉配信**される全国共通の情報基盤。防災サイトは L アラートの受信側になりうるし、自治体の入力業務と二重入力にならない設計が望ましい。

- 現在は一般社団法人マルチメディア振興センターが運営、総務省が普及促進。
- **2026-12-01 から総務省が運営主体となり**、新しい基本要綱・サービス利用規約等が施行される予定。
- 情報の種別・データ形式に関する細則（CMNS-A20-010 等）が定義されている。

#### 災害情報伝達手段の整備等に関する手引き（消防庁防災情報室）

- 最新: **令和 7 年（2025 年）3 月版**。
- 中核概念は「**災害情報伝達手段の多重化**」。防災行政無線（同報系）に加え、戸別受信機、電話一斉送信、登録制メール、SNS、ウェブサイト等を組み合わせることを求める。
- **Web サイトは多重化された伝達手段の 1 つ**であり、単独で完結させず他手段との整合（同じ文言・同じ発令時刻）が取れることが要件になる。

出典:
- https://www.soumu.go.jp/menu_seisaku/ictseisaku/ictriyou/02ryutsu06_03000032.html
- https://www.fdma.go.jp/mission/prepare/transmission/transmission001.html
- https://www.fdma.go.jp/mission/prepare/transmission/items/honpen.pdf （令和7年3月版 手引き）
- https://www.fdma.go.jp/mission/prepare/transmission/items/0203_soukoujirei.pdf （奏功事例集）

### 1.5 デジタル庁 — 防災 DX

#### 防災 DX サービスマップ / サービスカタログ

自治体が防災分野のデジタルサービスを検索・調達できるようデジタル庁が整備したカタログ（2023-03-10 公開）。「**平時 / 切迫時 / 応急対応 / 復旧・復興**」の 4 局面で分類されている。**この 4 局面はサイトの情報アーキテクチャの分類軸としてそのまま使える。**

#### 防災 DX 官民共創協議会（BDX）

2022 年 12 月発足。2024-05-30 時点で 438 者（民間 339・自治体 99）が参画。データ連携の促進を議論。

#### 防災分野のデータ連携基盤

マイナンバーカード／マイナポータルを活用したワンスオンリー、国保有データの民間提供を目指すプロトタイプを実証中。2026 年時点では、モデル仕様書の拡充と、防災アプリ・サービス間および **SOBO-WEB とのデータ連携**の促進が進行中。

#### 自治体標準オープンデータセット / 推奨データセット

**避難所データの標準スキーマとして最優先で参照すべき。**

- 「指定緊急避難場所一覧」「指定避難所一覧」が推奨データセットに含まれ、名称・所在地・緯度経度・対応災害種別等の項目とフォーマットが定義されている（XLSX/CSV）。
- テンプレートは、この標準データセットをそのまま取り込めるインポート仕様を持つべき。

出典:
- https://bosai-dx.jp/ （防災 DX サービスマップ）
- https://bosai-dx.jp/catalog/
- https://www.digital.go.jp/resources/data_dataset （推奨データセット）
- https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test （自治体標準オープンデータセット）
- https://data.e-gov.go.jp/data/dataset/digi_20220315_0075
- https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/f7339476-4afc-42d8-a574-a06bb8843fb5/2acb0613/20260216_policies_disaster-prevention_outline_01.pdf （デジタル庁 防災DX の取組）

### 1.6 内閣府 — 新総合防災情報システム（SOBO-WEB）/ SIP4D

- **SOBO-WEB**: 2024 年 4 月運用開始。災害情報を**地理空間情報として共有**し、被害状況の早期把握・推計を支援。府省庁・自治体など約 1,900 機関が利用。
- **SIP4D**（基盤的防災情報流通ネットワーク、防災科研開発）の仕組みを取り込み、機能を追加したもの。自治体から省庁への報告はシステム連携で収集される方向。
- 自治体防災サイトが扱うデータ（避難所開設状況、被害情報等）は、将来的に SOBO-WEB 側と整合する形式で持つのが望ましい。

出典:
- https://www.bousai.go.jp/taisaku/soboweb/index.html
- https://www.sip4d.jp/

### 1.7 国土交通省 / 国土地理院 — ハザードマップポータルサイト

- **重ねるハザードマップ**: 洪水・土砂災害・高潮・津波等のリスク情報を地図・写真に重ねて表示。**データ仕様は地理院タイル**（XYZ タイル）で、外部サイトからのタイル利用が可能。
- **わがまちハザードマップ**: 市区町村が作成したハザードマップへのリンク集。**リンク先情報は CSV 形式でダウンロード可能**。
- 自治体サイトでハザードマップを自前実装するより、地理院タイルをレイヤとして重ねる方が更新性・正確性の面で有利。
- 避難施設データは国土数値情報（P20 避難施設データ）、国土地理院「指定緊急避難場所データ」も利用可能。

出典:
- https://disaportal.gsi.go.jp/
- https://disaportal.gsi.go.jp/hazardmap/maps/index.html
- https://www.gsi.go.jp/bousaichiri/hinanbasho-menseki.html
- https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P20.html

### 1.8 総務省 — みんなの公共サイト運用ガイドライン（2024 年版）

公的機関のウェブアクセシビリティ対応の**国内標準手順書**。

- 根拠規格は **JIS X 8341-3:2016**（WCAG 2.0 と一致規格）。公的機関は原則**適合レベル AA に準拠**することが求められる。
- 求められる取組: ①ウェブアクセシビリティ方針の策定・公開 → ②試験の実施 → ③**試験結果の公開** → ④継続的な維持。
- 対象範囲はウェブサイト全体（PDF 等の文書、外部委託して構築したサイトも含む）。
- 2024 年版の更新点: (1) JIS 改正に向けた動向と求められる取組の解説、(2) 公的機関の取組事例の刷新、(3) 関連法令・参照文書の最新化。
- **JIS X 8341-3 は WCAG 2.2 との整合を目標に改正審議中**で、順調に進めば 2026 年度中に改正公示の見込み。テンプレートは先回りして **WCAG 2.2 AA** を狙うべき。

出典:
- https://www.soumu.go.jp/info-accessibility-portal/webaccessibility/guideline/
- https://www.soumu.go.jp/main_sosiki/joho_tsusin/b_free/guideline_past.html
- https://www.soumu.go.jp/info-accessibility-portal/assets/documents/webaccessibility/guideline/guideline_2024.pdf

### 1.9 デジタル庁 — ウェブアクセシビリティ導入ガイドブック

- 2022 年 12 月公開。デジタル社会推進標準ガイドライン群の **DS-671.2** として位置づけられる。
- ウェブアクセシビリティに初めて取り組む行政官・事業者向けの入門書。基礎知識から対応手順、試験の実施方法、結果の公開方法までを実務レベルで解説。
- 「誰一人取り残されない、人に優しいデジタル化」の実現手段として政府全体で標準化されている。

出典:
- https://www.digital.go.jp/resources/introduction-to-web-accessibility-guidebook
- https://waic.jp/news/ciaj-column-26/

### 1.10 出入国在留管理庁・文化庁 — 在留支援のためのやさしい日本語ガイドライン

多言語対応の設計根拠として重要。

- 調査によれば、在留外国人のうち「日本語」を日常生活に困らない言語とする人は約 **63%**、希望する情報発信言語として「**やさしい日本語**」を選ぶ人は **76%**。
- つまり、**多言語翻訳よりもやさしい日本語のほうが到達率が高い場面がある**。翻訳言語数を増やすことだけを多言語対応と考えてはならない。
- 災害・避難情報は、外国人が正しく理解すべき情報として明示的に例示されている。
- 書き言葉版に加えて「話し言葉のポイント」も公開されている（音声読み上げ・防災無線文言に関係）。

出典:
- https://www.moj.go.jp/isa/support/portal/plainjapanese_guideline.html
- https://www.bunka.go.jp/seisaku/kokugo_nihongo/kyoiku/92484001.html
- https://www.clair.or.jp/tabunka/portal/info/contents/116393.php

### 1.11 国内自治体の実装事例（災害時モード・輻輳対策）

ガイドラインではないが、**非機能要件の実証的根拠**として重要。

| 自治体 | 対策 | 学び |
|---|---|---|
| 仙台市 | 簡易版サイトへの自動切替を用意していたが、平成 27 年関東・東北豪雨でアクセス集中により繋がりにくくなった。→ データ処理容量を大幅増強し、平成 28 年 6 月から**本体サイトとは別 URL** の「避難情報ウェブサイト」を運用開始 | **簡易版切替だけでは不十分**。別ドメイン／別基盤への分離が効く |
| 那覇市 | 令和元年リニューアルで大規模災害時専用トップページを新設。**どの部署の職員でも切替可能**な仕様。図や写真を省略してデータサイズを軽量化 | 切替の**運用ハードルを下げる**ことが実効性を決める |
| 千葉市 | 「災害時モード」でページ全体を簡易表示に切替え、重要情報のみ掲載 | 平時／災害時の**二系統の情報設計**が標準的 |
| 東日本大震災時（総務省事例集） | 自治体公式サイトの負荷軽減のためミラーサイトを提供 | CDN／ミラーは有効な緩和策 |

出典:
- https://www.city.chiba.jp/shimin/shimin/kohokocho/saigaimode.html
- https://www.city.fussa.tokyo.jp/about/1004770/1004774.html
- https://www.soumu.go.jp/main_content/000173744.pdf （事例11 自治体の公式Webサイト等の負荷軽減）
- https://www.stream.co.jp/resources/blog/2020/03/26/3942/

### 1.12 参考にできる既存の防災サイト（ベンチマーク）

テンプレート設計時に実物を見て参考にすべきサイト。**「何を真似るか」を明示**した。

#### 総合力・アクセシビリティ — 東京都防災ホームページ

https://www.bousai.metro.tokyo.lg.jp/

- **11 言語 +「やさしいにほんご」**を提供。やさしい日本語を言語切替の並びに一級市民として置いている点が、1.10 の調査結果（希望率 76%）と整合する数少ない実例
- **ReadSpeaker による音声読み上げ**、文字サイズ・色合い（コントラスト）変更を標準搭載
- ナビゲーションは「トップ / 避難情報 / 知ろう・学ぼう・防災知識 / 東京都の取組・対応 / 防災関連リンク集」。**平時学習と緊急情報が同列に並ぶ構成**
- 関連: 東京都防災マップ https://map.bosai.metro.tokyo.lg.jp/ （観測情報の概況マップ、レイヤ切替）
- 関連: 東京都被害想定ホームページ https://www.higaisoutei.metro.tokyo.lg.jp/ — **「マイ・被害想定」**として住所ベースのパーソナライズを実装

#### 災害時の別系統サイト — 神戸市リアルタイム防災情報

https://city-kobe.my.salesforce-sites.com/

- 市の本体 CMS とは**完全に別基盤（Salesforce Sites）・別ドメイン**で運用。3.2 の「本体サイトと分離せよ」という非機能要件の実装例
- 警報・注意報、地震・津波、避難情報、避難所情報を 1 画面に集約
- 避難所の**開設状況・混雑状況は VACAN（外部混雑可視化サービス）と連携**して配信。自前実装せず外部サービスに寄せる選択
- 入口: https://www.city.kobe.lg.jp/a46152/bosai/emergency/index.html

#### 情報アーキテクチャ — 国土交通省 防災ポータル

https://www.mlit.go.jp/river/bousai/bousai-portal/index.html

- **「日頃から知ってほしい情報」/「災害時、見てほしい情報」の 2 分割**という極めて単純明快な IA。デジタル庁の 4 局面より粒度が粗いぶん、住民には分かりやすい
- 気象・河川水位、道路交通、鉄道・航空の運行、物流、ライフライン（電気・水道・ガス・通信）、災害用伝言サービス、医療機関・宿泊・無料 Wi-Fi、**外国人向け情報**まで横断的にリンク
- スマートフォン最適化・多言語対応

#### 都道府県横断・二面設計 — 広島県・鳥取県共同運用型防災情報システム

- **2025 年度グッドデザイン賞受賞**（都道府県の防災情報システムとしては初）
- 複数県が**共同運用**する国内初のプラットフォーム。県ごとに個別システムを持つと情報共有できない、という課題への回答
- **防災担当職員向けと、防災に不慣れな住民向けの二面を作り分けている**。職員側は柔軟なパーソナライズで迅速な状況把握・意思決定を支援、住民側は避難行動に必要な情報へ誘導するナビゲーション
- 審査委員評価: 「今後の防災 DX のスタンダードになりうる」
- https://www.g-mark.org/gallery/winners/33277

#### パーソナライズされた行動計画 — 静岡県「わたしの避難計画」

https://www.pref.shizuoka.jp/bosaikinkyu/sonae/1040812/1029856.html

- 画面上で自宅周辺の津波・水害・土砂災害リスクを確認しながら、**「はい / いいえ」の簡単な質問に答えるだけで個別の避難計画が完成**する
- 「ハザードマップを見せる」で終わらせず、**「あなたはいつ・どこへ逃げるか」まで落とす**設計。マイ・タイムラインの実装として最も敷居が低い部類
- 市町村版の例: https://www.city.shizuoka.lg.jp/s4268/s000316.html

#### 災害時モード — 千葉市 / 那覇市 / 仙台市

1.11 参照。**切替の運用しやすさ（那覇市）と、別基盤分離の必要性（仙台市）**が学びどころ。

- 千葉市: https://www.city.chiba.jp/shimin/shimin/kohokocho/saigaimode.html
- 福生市: https://www.city.fussa.tokyo.jp/about/1004770/1004774.html

#### 全国横断の実態調査 — 自治体サイト Web アクセシビリティ調査（ユニバーサルワークス）

https://www.u-works.co.jp/jichitai/

毎年 9 月 1 日実施。**2025 年（第 23 回）のテーマがまさに「防災・災害情報とアクセシビリティ」**で、本テンプレートの直接の参考になる。

- 調査内容: 各自治体公式サイトにおける**防災・災害情報への導線と構成**、防災コンテンツのアクセシビリティ実装を「見つけやすさ / 操作しやすさ / 読みやすさ」で点検
- 評価に用いた WCAG 2.1 の 4 項目: **1.4.2（音声制御）/ 2.1.2（キーボードトラップ）/ 2.2.2（一時停止・停止・非表示）/ 2.3.1（3 回のフラッシュ以下）**
- 結果: ほぼ全ての都道府県・政令市が「適」。ただし **2.2.2 で青森県・富山県・静岡県・高知県が「否」**
- **示唆: 防災サイトの典型的なアクセシビリティ欠陥は「自動で動くカルーセル／スライダーを止められないこと」**。テンプレートでは自動再生するカルーセルを採用しない、または停止ボタンを必須にする
- 過去テーマ（傾向把握に有用）: 2024 年 JIS 試験の正確な実施 / 2023 年 チェックツール比較 / 2022・2021 年 みんなの公共サイト運用ガイドライン対応 / 2020 年 COVID-19 情報発信 / 2019 年 404 エラーページ / 2018 年 代替テキスト

#### 他のランキング・調査

- トライベック・ブランド戦略研究所 Web ユーザビリティランキング: https://brand.tribeck.jp/usability/
- Gomez 自治体サイトランキング: https://www.gomez.co.jp/ranking/government/usability.html
- 47 都道府県の防災ポータルサイトまとめ: https://clip.zaigenkakuho.com/bosai_site_pref/

### 1.12 可用性・輻輳耐性に関する公的ガイドライン（追加調査）

1.11 の実装事例に対して、こちらは**具体的な数値基準・技術対策を示す一次情報**。

#### (a) デジタル庁・総務省「地方公共団体情報システム非機能要件の標準」第1.2版（令和7年9月）

- 位置づけ: 標準化法に基づく**標準化対象20業務**（住民基本台帳・戸籍・固定資産税等）向けの非機能要件標準。**防災サイトはこの20業務に含まれず直接の適用対象ではない**が、自治体システムの可用性基準として国が示す唯一の定量的な参照値であり、テンプレートの目標値設計の土台にできる。
- **稼働率（A.1.5.1）**: 選択肢は 95% / 99% / 99.5% / 99.9% / 99.99%。年間累計停止時間は それぞれ 145時間 / 29時間 / 14.5時間 / 2.9時間 / 17分。基幹系の標準的な選択レベルは 99.5%。
- **RTO（目標復旧時間・A.1.3.2）**: 標準選択レベルは **12時間以内**（選択肢: 1営業日以上〜2時間以内）。
- **RPO（目標復旧地点・A.1.3.1）**: 標準選択レベルは **1営業日前の時点**（日次バックアップからの復旧）。
- **大規模災害時のシステム再開目標（A.1.4.1）**: 標準選択レベルは **1ヶ月以内に、遠隔地の予備機とバックアップデータを用いて縮退復旧**。
  - **重要**: 「**住民記録システム等、住民の安否確認等に必要なデータを持つシステムは、発災後72時間以内に、必要なデータを自治体が利用できる形式で提供すること**」という明示規定がある。防災サイト（避難所開設状況・安否情報等を扱いうる）はこの規定の趣旨に最も近い性質を持つため、**「発災後72時間以内のデータ提供」をテンプレートの最低ラインとして採用すべき**。
  - この 72 時間という数字は、後述 (c) の総務省 ICT-BCP ガイドラインの「発災後概ね72時間を目安にした初動業務」とも一致しており、**自治体防災システム全体で共通の初動目標時間**と見てよい。
- **外部保管データの分散（A.3.2.1）**: 標準選択レベルは **遠隔地1ヶ所**へのバックアップ保管。
- **災害対策の復旧方針（A.3.1.1）**: 標準選択レベルは **限定された構成での情報システム再構築**（DRサイトでのフル構成再構築は上位レベル）。

出典:
- https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/c58162cb-92e5-4a43-9ad5-095b7c45100c/25b8cd21/20250916_local_goverments_common_standards_non-functional_requirement_01.pdf

#### (b) 東京都「アクセス集中対応のためのガイドライン」（令和2年2月、東京都戦略政策情報推進本部）

令和元年台風19号での自治体サイト閲覧障害を受けて策定。**災害時アクセス集中への技術対策を具体的に示す、国内で最も実務的なガイドライン**。対策を「①アクセス負荷の分散」「②アクセス負荷の軽減」の2軸に整理している。

**① 負荷分散**
- **CDN導入**: TTL（キャッシュ有効期限）はコンテンツ特性で使い分ける。html/CSS等サイズが小さく更新頻度が高いものは**短め**、PDF・画像等サイズが大きく更新頻度が低いものは**長め**に設定。ただし**避難情報のように速報性が求められるコンテンツは、この一般則と衝突するため、意図的に軽量な専用ページとして作り直し、短いTTLで配信する**という設計思想が示されている。
- **Yahooキャッシュサイト**: Yahoo! Japanと災害協定を締結した自治体向けの無償CDN類似サービス。`(自治体ドメイン).cache.yimg.jp` で提供され、**CDNを未導入の自治体でも使える緩和策**。
- **SNS（Twitter/X）の活用**: 文字数制限内に要点を書き、詳細ページへのリンクを添える形が推奨。輻輳時の代替情報源として既に多くの自治体が活用。

**② 負荷軽減（コンテンツ軽量化）**
- **非常時用コンテンツはテキスト主体の軽量ページとして別途用意**し、画像ファイル数を制限、通常ページより厳しいデータサイズ上限を設ける。
- **1ページあたりの推奨データサイズ**: Google推奨の**1.6MB程度**を目安、一般的な許容上限は**2〜3MB程度**。
- **随時更新される避難所情報等は PDF/Word ではなくテキスト形式で提供**し、`iframe` 等で防災ページやトップページから呼び出す構成にする（テンプレートの実装方針と直結）。
- **防災ページは平時から常時閲覧可能にしておく**（非常時専用URLに切り替える方式ではなく）。理由は、事前にブックマークされ、検索エンジンにインデックスされることで**アクセスが自然に分散する**ため。
- 画像は PNG/JPG を用途に応じ使い分け、html指定サイズに合わせて事前に縮小・トリミングしてから配信。PDFはOffice文書からの書き出し時に「最小サイズ（オンライン発行）」オプションを使用して軽量化。

出典:
- https://www.digitalservice.metro.tokyo.lg.jp/business/kushichoson-dx/access-guideline
- https://www.digitalservice.metro.tokyo.lg.jp/documents/d/digitalservice/guideline （原文PDF、月刊J-LIS 2020年8月号）

#### (c) 総務省「地方公共団体におけるICT部門の業務継続計画（BCP）策定に関するガイドライン」（令和6年3月29日改定）

- 平成20年度に初版策定、令和6年に最新のICT環境を踏まえて改定。**発災後概ね72時間を目安にした初動業務**に焦点を当てた計画策定を求める（(a) の72時間規定と整合）。
- 策定状況の格差が明示されている: 都道府県は97.9%が策定済みだが、**市区町村は50.0%にとどまる**。→ 防災サイトテンプレートを配布する際、BCP未策定の小規模自治体でも導入できるよう、**運用負荷の低いデフォルト構成**を用意する意義が大きい。
- 令和6年版で小規模団体向けの「ICT-BCPチェックリスト」を新設。テンプレートのドキュメントもこの水準（専門知識がなくても使える）に合わせるのが妥当。

出典:
- https://www.soumu.go.jp/main_content/000941950.pdf（本編）
- https://www.soumu.go.jp/main_content/000944535.pdf（ICT-BCPチェックリスト概要）
- https://cio.go.jp/node/2060/index.html

---

## 2. 海外ガイドライン・国際規格

### 2.1 米国 FEMA / Ready.gov

- **3 つの行動喚起に構造を絞っている**: (1) 非常持出袋を作る、(2) 家族の緊急時計画を作る、(3) 起こりうる災害の種類と適切な対応を知る。情報を網羅的に並べるのではなく、**取るべき行動から逆算した IA**。
- 多言語: スペイン語版「Listo」を筆頭に、アラビア語・フランス語・ハイチクレオール語・ヒンディー語・**日本語**・韓国語・ポルトガル語・ロシア語・タガログ語・ベトナム語・簡体中国語で一部コンテンツを提供。
- 対象別のサブサイト（Ready Kids など、8〜12 歳向け）を用意し、**受け手のセグメント別に読める文体を分けている**。
- FEMA の緊急コミュニケーション指針は「**シンプルで行動指向（action-oriented）の言語**でメッセージを作る」「技術的正確性を保ちつつ防護行動メッセージを平易化する」ことを求める。
- 米国連邦政府の Plain Language 方針: 「**受け手が最初に接したときに理解できる**コミュニケーション」と定義される。

出典:
- https://www.ready.gov/
- https://digital.gov/topics/plain-language
- https://www.fema.gov/cbrn-tools/key-planning-factors-chemical-incident/kpf3/5/5-2
- https://www.fcc.gov/emergency

### 2.2 米国 ADA Title II ウェブアクセシビリティ最終規則（法的要件）

海外の「州・地方政府サイト」に対する強制力ある要件で、日本の自治体サイト要件を考える上での有力な参照点。

- 2024-04-24 に司法省（DOJ）が最終規則を公布。州・地方政府のウェブコンテンツとモバイルアプリを **WCAG 2.1 レベル AA** に適合させることを義務づけ。
- **PDF、オンラインフォーム、行政サービス提供に用いるサードパーティ製プラットフォームも対象**。
- 遵守期限は 2026-04-17 に 1 年延長され、人口 5 万人以上の団体は **2027-04-26**、それ以外（特別区含む）は **2028-04-26**。
- 示唆: **PDF ハザードマップの貼り付けだけでは不十分**、埋め込み地図やサードパーティ通知ウィジェットもアクセシビリティ責任の範囲に入る。

出典:
- https://www.ada.gov/resources/2024-03-08-web-rule/
- https://titleii.org/title-ii-web-accessibility
- https://www.venable.com/insights/publications/2026/04/ada-title-ii-website-accessibility-regulations

### 2.3 英国 GOV.UK — Emergency banner / Notification banner

GOV.UK は「緊急時にサイト全体をどう変えるか」を**コンポーネントと運用手順の両方**で標準化している点が優れている。

#### Emergency banner コンポーネント

- 全ページ最上部に表示されるサイト全体バナー。発動条件は 3 種類に限定:
  1. **notable death**（著名人の逝去）
  2. **national emergency**（レベル 1 インシデント）
  3. **local emergency**（レベル 2 の広域地域インシデント）
- スタイルは `campaign_class`（`notable-death` / `national-emergency` / `local-emergency`）で切り替わる。トップページ用の別バリアント（`homepage: true`）を持つ。
- 必須コンテンツ項目: **heading（見出し）/ short description（補足）/ link（詳細への導線）**。`link_text` は省略可で既定は "More information"。
  - → **緊急バナーのデータモデルは「見出し・短い説明・1 本のリンク」の 3 項目に絞る**という設計判断がそのまま参考になる。
- アクセシビリティ要件: リンクはキーボードでフォーカス可能・可視フォーカス状態を持つ、タッチ／ホバーで外観が変化する、音声コマンドで操作可能、意味のあるラベルを持つこと。

#### 運用（Emergency publishing）

- バナーを出すかどうかの判断は **GOV.UK Programme Team on-call（上級管理職エスカレーション担当）**が行う。→ **誰が発動権限を持つかを事前に決めておく**運用設計が明文化されている。
- サービスへの影響を伝える場合は、緊急バナーではなく「中立的な notification banner」を使い分ける（例: 緊急事態による処理遅延の告知）。

出典:
- https://components.publishing.service.gov.uk/component-guide/emergency_banner
- https://docs.publishing.service.gov.uk/manual/emergency-publishing.html
- https://design-system.service.gov.uk/components/notification-banner/

### 2.4 UNDRR / WMO — 仙台防災枠組と多重ハザード早期警戒システム（MHEWS）

#### 仙台防災枠組 ターゲット G

「**2030 年までに、多重ハザード早期警戒システムおよび災害リスク情報・評価の人々への利用可能性とアクセスを大幅に向上させる**」ことを掲げる。人間中心（people-centred）・参加型・ジェンダー包摂的アプローチを重視。

#### MHEWS の 4 要素（チェックリスト）

WMO/UNDRR の「Multi-hazard Early Warning Systems: A Checklist」が定める 4 本柱。**Early Warnings for All (EW4All) イニシアチブの 4 つの柱でもある。**

| 要素 | 内容 | 主管 |
|---|---|---|
| 1. 災害リスクの知識 | ハザード・曝露・脆弱性の把握と管理 | UNDRR |
| 2. 探知・観測・監視・分析・予測 | ハザードとその影響の検知と予報 | WMO |
| 3. **警報の伝達とコミュニケーション** | 警報の効率的な配信 | ITU |
| 4. 備えと対応能力 | 早期行動を可能にする準備 | IFRC |

- **防災サイトは主に要素 1（リスク知識＝ハザードマップ・平時の学習）と要素 3（警報の伝達）を担う**。テンプレートの機能は 4 要素のどこに位置するかを明示できると設計の根拠が強くなる。
- 指摘されている主要ギャップ: 警報プロセスと**用語の共通理解の欠如**、脆弱な文脈での既存 EWS の強化、多様性と包摂性に対応する人間中心の警報とトップダウン／ボトムアップの統合。
- 「シンプルで低コストな早期警戒設備の適用促進」「早期行動を促す**伝達チャネルの多様化**」が繰り返し要請されている。

出典:
- https://www.undrr.org/implementing-sendai-framework/sendai-framework-action/early-warnings-for-all
- https://community.wmo.int/sites/default/files/EWS_Checklist_0.pdf
- https://www.undrr.org/words-into-action/guide-multi-hazard-early-warning
- https://www.undrr.org/publication/handbook-use-risk-knowledge-multi-hazard-early-warning-systems-2024
- https://www.un.org/en/climatechange/early-warnings-for-all

### 2.5 ISO 規格（ISO/TC 292 Security and resilience）

| 規格 | 正式名称 | 要点 |
|---|---|---|
| **ISO 22322:2022** | Emergency management — Guidelines for public warning | 事象の前・中・後を通じた**公衆警報の開発・管理・実施**のガイドライン。地方から国際レベルまで適用可能。TV・ラジオ・電話・新聞・拡声器など**警報チャネルの選定**に関する助言を含む。パニック反応を防ぎ、公衆が必要な行動を取れるようにすることが目的。主要な機能構成は **hazard monitoring（ハザード監視）** と **warning dissemination（警報伝達）** の 2 系統。EN ISO 22322:2026 として欧州規格化も進行 |
| **ISO 22320:2018** | Emergency management — Guidelines for incident management | インシデント発生時の**リアルタイム対応と調整**を支える。ISO 22301（事業継続）が「何を備えるか」を規定するのに対し、22320 は「発生時にどう動くか」 |
| **ISO 22324:2015** | Guidelines for colour-coded alerts | 警報の**色分けの国際ガイドライン**。赤＝危険、黄＝注意、緑＝安全。日本の警戒レベル配色（黒・紫・赤・黄・白）は国内独自であり、**外国人向け表示では ISO 22324 との齟齬が起きうる**点に注意が必要 |

出典:
- https://www.iso.org/standard/53335.html （ISO 22322）
- https://www.iso.org/news/2015/11/Ref2022.html
- https://www.oasis-open.org/standard/cap/ （CAP v1.2 — 警報データ交換の事実上の国際標準）
- https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html
- https://wmo.int/activities/common-alerting-protocol-cap

### 2.6 W3C WCAG 2.1 / 2.2 — 緊急情報コンテンツへの適用

WCAG 2.2 は 2023-10-05 に W3C 勧告となり、2.1 に 9 個の達成基準を追加。緊急情報の文脈で特に効くのは以下。

| 達成基準 | レベル | 緊急情報での意味 |
|---|---|---|
| **4.1.3 Status Messages** | AA | 避難情報の更新や「新着あり」をフォーカス移動なしで表示する場合、**ARIA live region / role="alert"** で支援技術に伝わるようにする。防災サイトでの自動更新表示に直結 |
| **1.4.1 Use of Color** | A | 警戒レベルを**色だけで伝えてはならない**。数字・テキストラベルを併記する（内閣府配色の運用でも同旨） |
| **1.4.3 Contrast (Minimum)** | AA | 黄 `#F2E700` は白背景に対しコントラスト比が極端に低い。**黄色の警戒レベル表示は文字色・背景の組み合わせに特別な注意が必要** |
| **2.4.7 / 2.4.11 Focus** | AA | 緊急バナー内リンクのフォーカス可視性 |
| **3.1.1 / 3.1.2 Language** | A | 多言語ページで `lang` 属性を正しく設定。読み上げの発音に直結 |
| **1.4.10 Reflow** | AA | 320px 幅で横スクロールなしに読めること。**災害時はスマートフォンが主デバイス** |
| **3.3.1 Error Identification** | A | 安否登録・避難所検索フォームでのエラー提示 |

- WCAG は「緊急情報」専用の達成基準を持たないが、`role="alert"` / `aria-live="assertive"` の使い分けは緊急情報 UI の中核テクニック。
- 重要な状態メッセージにフォーカスを移さない場合、ARIA alert または live region で読み上げられる必要がある。

出典:
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- https://webaim.org/standards/wcag/checklist

---

## 3. 要件へのまとめ（チェックリスト）

`geonicdb-bosai` テンプレートが満たすべき要件を、上記調査から抽出したもの。優先度は **[必須] / [推奨] / [任意]** で示す。

### 3.1 機能要件

#### A. 緊急情報の発信

- [ ] **[必須]** サイト全体に表示される緊急バナー。データモデルは GOV.UK 方式で **`見出し` / `短い説明` / `リンク 1 本`** に絞る
- [ ] **[必須]** 緊急バナーの重大度バリアント（`緊急安全確保` / `避難指示` / `高齢者等避難` / `注意喚起` / `お知らせ`）を持ち、内閣府公式配色にマッピングされること
- [ ] **[必須]** 警戒レベル 1〜5 の表示コンポーネント。**色だけでなく数字＋文言を必ず併記**（WCAG 1.4.1）
- [ ] **[必須]** 避難情報（緊急安全確保／避難指示／高齢者等避難）の発令・解除を、**対象地区・発令日時・対象世帯数／人数**とともに掲載できること
- [ ] **[必須]** 「警戒レベル 4 までに全員避難」「レベル 5 は既に危険」という内閣府の公式メッセージングに文言を揃える
- [ ] **[推奨]** 2026-05-29 以降の**新しい防災気象情報の名称**（「レベル 3 大雨警報」等）に対応した表記
- [ ] **[推奨]** 発令情報の履歴・タイムライン表示（いつ何が出て、いつ解除されたか）
- [ ] **[任意]** L アラート への入力連携、または L アラート受信データの取り込み（**二重入力の回避**）
- [ ] **[任意]** CAP (OASIS CAP 1.2) 形式でのフィード出力 — 他システムへの再配信性を担保

#### B. 避難所・避難場所

- [ ] **[必須]** 指定緊急避難場所・指定避難所の一覧と地図表示。**デジタル庁「自治体標準オープンデータセット」のスキーマをそのまま取り込めるインポート機能**
- [ ] **[必須]** **開設状況のリアルタイム表示**（開設前／開設中／満員／閉鎖）。災害時に最も需要が高い情報
- [ ] **[必須]** 対応災害種別（洪水・崖崩れ・高潮・地震・津波・大規模火災・内水氾濫・火山）ごとの絞り込み。**「どの災害で使えるか」は避難場所ごとに異なる**
- [ ] **[推奨]** 現在地からの距離順表示・経路案内リンク
- [ ] **[推奨]** バリアフリー情報（車椅子対応、多目的トイレ、福祉避難所か否か）、ペット同行可否
- [ ] **[推奨]** 避難所の混雑状況・受入可能人数
- [ ] **[任意]** 避難所データのオープンデータ出力（CSV/GeoJSON）

#### C. ハザードマップ

- [ ] **[必須]** **国土地理院の重ねるハザードマップの地理院タイルをレイヤとして重畳**（自前でラスタ画像を持たない）
- [ ] **[必須]** 洪水・土砂災害・高潮・津波の 4 レイヤ以上に対応
- [ ] **[推奨]** 住所・現在地からのリスク判定（「あなたの場所は浸水想定 3m」）
- [ ] **[推奨]** 「わがまちハザードマップ」CSV を用いた自治体独自ハザードマップへのリンク
- [ ] **[必須]** **PDF のみでの提供にしない**（ADA Title II 規則で PDF もアクセシビリティ対象。日本でも JIS の対象範囲に含まれる）

#### D. 多言語・やさしい日本語

- [ ] **[必須]** **やさしい日本語版を第一級の機能として実装**（希望率 76% > 多言語翻訳）。「翻訳言語数」だけを KPI にしない
- [ ] **[必須]** `lang` 属性の正しい設定（WCAG 3.1.1/3.1.2）
- [ ] **[推奨]** 最低限の多言語（英・中簡体・中繁体・韓・ベトナム・ポルトガル・ネパール等、自治体の在留外国人構成に応じて）
- [ ] **[推奨]** 緊急情報の定型文テンプレート（発令情報は文型が限られるため、事前翻訳済みテンプレートで即時多言語化が可能）
- [ ] **[任意]** 外国人向け表示では **ISO 22324（赤＝危険／黄＝注意／緑＝安全）**との齟齬に配慮した補助表現

#### E. アクセシビリティ

- [ ] **[必須]** **JIS X 8341-3:2016 適合レベル AA 準拠**を初期状態で満たすマークアップ
- [ ] **[推奨]** **WCAG 2.2 レベル AA** を目標に実装（JIS 改正が 2026 年度中に WCAG 2.2 整合で公示される見込みのため先回りする）
- [ ] **[必須]** ウェブアクセシビリティ方針・試験結果を公開するためのページテンプレートを同梱（総務省ガイドラインの必須手順）
- [ ] **[必須]** 緊急情報の動的更新に `role="alert"` / `aria-live` を適用（WCAG 4.1.3）
- [ ] **[必須]** 内閣府配色の**黄 `#F2E700` は白背景でコントラスト不足**になるため、文字色・縁取りの組み合わせを規定
- [ ] **[必須]** キーボード操作のみで全機能が利用可能、フォーカス可視
- [ ] **[推奨]** 音声読み上げ前提の見出し構造、地図の代替テキスト情報（地図が読めない人向けのテキスト一覧を必ず併置）

#### F. 平時コンテンツ

- [ ] **[推奨]** デジタル庁の 4 局面（**平時 / 切迫時 / 応急対応 / 復旧・復興**）を情報アーキテクチャの分類軸に採用
- [ ] **[推奨]** FEMA/Ready.gov 型の**行動指向 IA**: 「備蓄品を用意する」「家族の避難計画を作る」「災害種別ごとの行動を知る」
- [ ] **[任意]** 対象者別コンテンツ（子ども向け、高齢者向け、外国人向け、要配慮者向け）

#### G. 運用・更新性

- [ ] **[必須]** **災害時モードへの切替が、専門知識のない職員でもワンアクションで可能**（那覇市の教訓）
- [ ] **[必須]** 緊急バナーの発動権限者を定義できること（GOV.UK の on-call 判断モデル）
- [ ] **[必須]** 発令情報の掲載が、防災行政無線・L アラート等の**他の伝達手段と同一文言・同一時刻**で整合すること（消防庁「多重化」要件）
- [ ] **[推奨]** 平時から災害時モードの表示確認・訓練ができるプレビュー機能
- [ ] **[推奨]** 更新履歴・最終更新時刻の明示（災害時は「この情報はいつ時点か」が決定的に重要）

### 3.2 非機能要件

#### H. 可用性・輻輳耐性

- [ ] **[必須]** **静的サイト生成 + CDN 配信を基本構成とする**。動的レンダリングをクリティカルパスに置かない
- [ ] **[必須]** **災害時モードでのペイロード軽量化**（画像・装飾の省略、CSS/JS 最小化）。那覇市・千葉市の実装パターン、および東京都ガイドラインの**1ページあたり1.6〜3MB以内**を目安値とする
- [ ] **[必須]** **避難情報・避難所開設状況等の随時更新コンテンツは PDF/Word ではなくテキスト形式で提供**し、`iframe` 等でトップページ・防災ページから呼び出す（東京都ガイドライン）
- [ ] **[必須]** **防災ページは非常時専用URLへの切替ではなく平時から常時公開**し、事前のブックマーク・検索エンジンインデックスによるアクセス分散を狙う（東京都ガイドライン）
- [ ] **[必須]** **発災後72時間以内に主要情報（避難所開設状況等）を提供可能な構成**を最低ラインとする（デジタル庁・総務省「非機能要件の標準」の住民安否確認系システム規定、総務省ICT-BCPガイドラインの初動72時間目安と整合）
- [ ] **[推奨]** **本体サイトとは別基盤・別 URL での配信を可能にする**（仙台市の教訓 — 簡易版切替だけでは落ちた）
- [ ] **[推奨]** CDNのTTL設計を通常ページと分離する — html/CSS等は短TTL、更新頻度の低い画像/PDFは長TTLが原則だが、**避難情報ページは速報性のため意図的に短TTL・軽量専用ページとする**（東京都ガイドライン）
- [ ] **[推奨]** オリジン障害時のフェイルオーバー（CDN のステイル配信、静的フォールバックページ）。Yahooキャッシュサイト等、CDN未導入自治体でも使える災害協定ベースの緩和策も選択肢に含める
- [ ] **[推奨]** 平時比 100〜1000 倍のアクセス集中を想定した負荷試験の手順を同梱
- [ ] **[推奨]** 稼働率・RTO/RPOの目標値は国の「地方公共団体情報システム非機能要件の標準」を参考値とする（稼働率 99.5%＝年間停止14.5時間、RTO 12時間以内、RPO 1営業日前時点が標準的な選択レベル）。ただし本標準は防災サイトを直接の適用対象としないため、あくまで参考値としての採用に留める
- [ ] **[任意]** ミラーサイト提供の仕組み

#### I. 回線・デバイス

- [ ] **[必須]** **モバイルファースト**。災害時の主デバイスはスマートフォン
- [ ] **[必須]** レスポンシブ、320px 幅で横スクロールなし（WCAG 1.4.10 Reflow）
- [ ] **[必須]** **低速回線での実用性** — 初期表示のクリティカルリソースを厳格に予算管理（例: 災害時モードで 100KB 以下）
- [ ] **[推奨]** **オフライン対応**（Service Worker）— 避難所一覧・ハザードマップ・行動指針は電波途絶時こそ必要
- [ ] **[推奨]** JavaScript 無効／失敗時でも避難情報と避難所一覧が読める（プログレッシブエンハンスメント）
- [ ] **[任意]** テキストのみの超軽量版 URL

#### J. その他

- [ ] **[推奨]** **印刷対応 CSS** — 避難所一覧・ハザードマップ・持出品リストは紙で持ち出される。停電時に紙は最後の砦
- [ ] **[推奨]** SEO / 構造化データ — 災害時は検索エンジン経由の流入が支配的。避難所は `Place`、緊急情報は `SpecialAnnouncement`（COVID-19 で導入されたが災害一般に適用可）schema.org を検討
- [ ] **[推奨]** OGP — SNS でのシェアが主要な伝達経路
- [ ] **[必須]** HTTPS、HSTS（なりすまし防災情報サイトの防止）
- [ ] **[推奨]** 情報の機械可読出力（RSS / JSON / CAP）— 報道機関・防災アプリ・音声アシスタントへの再配信を可能にする
- [ ] **[任意]** SOBO-WEB / 防災 DX データ連携基盤との連携を見据えたデータ形式（地理空間情報としての表現）

### 3.3 設計上の重要な緊張点

要件定義で必ず判断が必要になる論点。

1. **色の二重規格**: 日本の警戒レベル配色（黒・紫・赤・黄・白）と ISO 22324（赤・黄・緑）は非互換。国内住民向けには前者が必須だが、外国人向け表示で誤解を生む可能性がある。テキストラベル併記で緩和する。
2. **災害時モードの軽量化 vs 地図機能**: ハザードマップや避難所地図は重い。災害時モードで地図をどう扱うか（静的画像への差し替え／テキスト一覧へのフォールバック）を明示的に設計する。
3. **JIS X 8341-3 の改正待ち**: 現行 JIS は WCAG 2.0 相当。2026 年度中に WCAG 2.2 整合へ改正見込み。テンプレートは WCAG 2.2 AA を先取りするのが合理的（後追い改修コストの回避）。
4. **L アラートとの二重入力**: 自治体職員が同じ避難情報を L アラートとサイトの両方に入力する運用は災害時に破綻する。連携か、少なくとも入力の一本化が必要。
5. **災害時モード切替の権限設計**: GOV.UK は発動権限者を明文化している。誰が押せるボタンなのかを決めないと、実際の災害時に押されない。

---

## 4. 一次情報 URL リスト

### 国内 — 内閣府（防災担当）

- 避難情報に関するガイドライン（令和8年3月改定）: https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/
- 警戒レベル配色（RGB 値公表）: https://www.bousai.go.jp/pdf/200529_haishoku.pdf
- 警戒レベル配色（RGB + CMYK 一覧）: https://www.bousai.go.jp/pdf/210305_color.pdf
- 新総合防災情報システム SOBO-WEB: https://www.bousai.go.jp/taisaku/soboweb/index.html
- お役立ち情報（地方自治体向け）: https://www.bousai.go.jp/oyakudachi/info_jichitai.html
- 避難情報の判断・伝達: https://www.bousai.go.jp/oukyu/hinankankoku/index.html

### 国内 — 気象庁

- 2026年 防災気象情報の体系整理: https://www.jma.go.jp/jma/kishou/know/bosai/keiho-update2026/
- ホームページにおける気象情報の配色に関する設定指針（令和2年7月改訂）: https://www.jma.go.jp/jma/kishou/info/colorguide/HPColorGuide_202007.pdf
- 同（平成24年5月 制定版）: https://www.jma.go.jp/jma/kishou/info/colorguide/120524_hpcolorguide.pdf
- CAP-RSMCTK プロファイル: https://www.jma.go.jp/jma/jma-eng/jma-center/rsmc-hp-pub-eg/cap-rsmctk.pdf
- 防災気象情報と警戒レベル（首相官邸）: https://www.kantei.go.jp/jp/headline/bousai/keihou.html

### 国内 — 総務省 / 消防庁

- L アラートの普及促進: https://www.soumu.go.jp/menu_seisaku/ictseisaku/ictriyou/02ryutsu06_03000032.html
- 住民への災害情報伝達手段: https://www.fdma.go.jp/mission/prepare/transmission/transmission001.html
- 災害情報伝達手段の整備等に関する手引き（令和7年3月）: https://www.fdma.go.jp/mission/prepare/transmission/items/honpen.pdf
- 災害情報伝達手段の奏功事例集: https://www.fdma.go.jp/mission/prepare/transmission/items/0203_soukoujirei.pdf
- みんなの公共サイト運用ガイドライン: https://www.soumu.go.jp/info-accessibility-portal/webaccessibility/guideline/
- 同 2024年版 PDF: https://www.soumu.go.jp/info-accessibility-portal/assets/documents/webaccessibility/guideline/guideline_2024.pdf
- これまでの取組（改定履歴）: https://www.soumu.go.jp/main_sosiki/joho_tsusin/b_free/guideline_past.html
- 東日本大震災 事例11 自治体公式Webサイトの負荷軽減: https://www.soumu.go.jp/main_content/000173744.pdf

### 国内 — デジタル庁

- ウェブアクセシビリティ導入ガイドブック（DS-671.2）: https://www.digital.go.jp/resources/introduction-to-web-accessibility-guidebook
- 推奨データセット: https://www.digital.go.jp/resources/data_dataset
- 自治体標準オープンデータセット: https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test
- 防災DXの取組（2026-02-16）: https://www.digital.go.jp/assets/contents/node/basic_page/field_ref_resources/f7339476-4afc-42d8-a574-a06bb8843fb5/2acb0613/20260216_policies_disaster-prevention_outline_01.pdf
- 防災DXサービスマップ: https://bosai-dx.jp/
- 防災DXサービスカタログ: https://bosai-dx.jp/catalog/

### 国内 — 国土交通省 / 国土地理院

- ハザードマップポータルサイト: https://disaportal.gsi.go.jp/
- 重ねるハザードマップ: https://disaportal.gsi.go.jp/hazardmap/maps/index.html
- 指定緊急避難場所・指定避難所データ: https://www.gsi.go.jp/bousaichiri/hinanbasho-menseki.html
- 国土数値情報 避難施設データ (P20): https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P20.html

### 国内 — 多言語・やさしい日本語

- 在留支援のためのやさしい日本語ガイドライン（出入国在留管理庁）: https://www.moj.go.jp/isa/support/portal/plainjapanese_guideline.html
- 同（文化庁）: https://www.bunka.go.jp/seisaku/kokugo_nihongo/kyoiku/92484001.html
- 多文化共生ポータルサイト（CLAIR）: https://www.clair.or.jp/tabunka/portal/info/contents/116393.php

### 国内 — 実装事例・ベンチマークサイト

- 東京都防災ホームページ: https://www.bousai.metro.tokyo.lg.jp/
- 東京都防災マップ: https://map.bosai.metro.tokyo.lg.jp/
- 東京都被害想定ホームページ（マイ・被害想定）: https://www.higaisoutei.metro.tokyo.lg.jp/
- 神戸市 リアルタイム防災情報: https://city-kobe.my.salesforce-sites.com/
- 神戸市 防災情報入口: https://www.city.kobe.lg.jp/a46152/bosai/emergency/index.html
- 国土交通省 防災ポータル: https://www.mlit.go.jp/river/bousai/bousai-portal/index.html
- 広島県・鳥取県共同運用型防災情報システム（2025年度グッドデザイン賞）: https://www.g-mark.org/gallery/winners/33277
- 静岡県 わたしの避難計画: https://www.pref.shizuoka.jp/bosaikinkyu/sonae/1040812/1029856.html
- 千葉市 災害時モード: https://www.city.chiba.jp/shimin/shimin/kohokocho/saigaimode.html
- 福生市 トップページ（災害モード）: https://www.city.fussa.tokyo.jp/about/1004770/1004774.html
- SIP4D 情報公開サイト: https://www.sip4d.jp/

### 国内 — 実態調査・ランキング

- 自治体サイト Web アクセシビリティ調査（2025年テーマ「防災・災害情報とアクセシビリティ」）: https://www.u-works.co.jp/jichitai/
- トライベック Web ユーザビリティランキング: https://brand.tribeck.jp/usability/
- Gomez 自治体サイトランキング: https://www.gomez.co.jp/ranking/government/usability.html
- 47都道府県の防災ポータルサイトまとめ: https://clip.zaigenkakuho.com/bosai_site_pref/

### 海外 — 米国

- Ready.gov: https://www.ready.gov/
- Digital.gov Plain Language: https://digital.gov/topics/plain-language
- FEMA Response Communication Guidelines: https://www.fema.gov/cbrn-tools/key-planning-factors-chemical-incident/kpf3/5/5-2
- FCC/FEMA Emergency Communications: https://www.fcc.gov/emergency
- ADA Title II Web Rule: https://www.ada.gov/resources/2024-03-08-web-rule/
- Title II Web Accessibility 解説: https://titleii.org/title-ii-web-accessibility

### 海外 — 英国

- GOV.UK Emergency banner component: https://components.publishing.service.gov.uk/component-guide/emergency_banner
- GOV.UK Emergency publishing manual: https://docs.publishing.service.gov.uk/manual/emergency-publishing.html
- GOV.UK Design System Notification banner: https://design-system.service.gov.uk/components/notification-banner/

### 国際機関・規格

- UNDRR Early Warnings for All: https://www.undrr.org/implementing-sendai-framework/sendai-framework-action/early-warnings-for-all
- WMO/UNDRR MHEWS Checklist: https://community.wmo.int/sites/default/files/EWS_Checklist_0.pdf
- UNDRR Words into Action: MHEWS: https://www.undrr.org/words-into-action/guide-multi-hazard-early-warning
- Handbook on the use of Risk Knowledge for MHEWS (2024): https://www.undrr.org/publication/handbook-use-risk-knowledge-multi-hazard-early-warning-systems-2024
- UN Early Warnings for All: https://www.un.org/en/climatechange/early-warnings-for-all
- ISO 22322 (public warning): https://www.iso.org/standard/53335.html
- ISO 22322 解説記事: https://www.iso.org/news/2015/11/Ref2022.html
- OASIS Common Alerting Protocol v1.2: https://www.oasis-open.org/standard/cap/
- CAP v1.2 仕様書: https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html
- WMO CAP: https://wmo.int/activities/common-alerting-protocol-cap

### W3C アクセシビリティ

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Understanding SC 4.1.3 Status Messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- Understanding SC 3.3.1 Error Identification: https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- WebAIM WCAG 2 Checklist: https://webaim.org/standards/wcag/checklist
- WAIC（ウェブアクセシビリティ基盤委員会）: https://waic.jp/
