/**
 * CloudFront Response Headers Policy（仕様 5.8.2）とディストリビューションの骨格。
 *
 * 本番想定: S3 オリジン + CloudFront。GitHub Pages はカスタムヘッダ不可のため
 * Observatory A+ の対象外（issue #6 方針）。
 */
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { buildContentSecurityPolicy, type BuildCspOptions } from "./csp-policy";
import { WebPushProxy, type WebPushProxyProps } from "./webpush-proxy";

export type BosaiSiteStackProps = cdk.StackProps & {
  /** サイト用バケット名（未指定時は CDK 生成名） */
  bucketName?: string;
  /**
   * CSP を Report-Only で送出する（既定 false = 強制）。
   * 初回・CSP 変更時（#3 地図ドメイン追加時を含む）は true で違反収集してから flip。
   */
  cspReportOnly?: boolean;
  /** report-uri。収集基盤の実装はテンプレート範囲外 */
  cspReportUri?: string;
  /** CSP に追加するホスト等（script-src 追加は不可・csp-policy.ts 参照） */
  cspExtras?: Omit<BuildCspOptions, "reportOnly" | "reportUri">;
  /**
   * ACM 証明書 ARN（**us-east-1**）。未指定時は CloudFront 既定証明書のままになり、
   * `minimumProtocolVersion`（TLSv1.2_2021）は効かない（CDK 警告どおり）。
   * SSL Labs A+ にはカスタム証明書 + 本 props が必須。
   */
  certificateArn?: string;
  /** ビューワー証明書とセットで指定するドメイン（例: bosai.example.jp） */
  domainNames?: string[];
  /**
   * Web Push 登録プロキシ（#35）。指定時のみ Lambda Function URL + Secrets Manager を追加。
   * `geonicdbUrl` 必須。CSP connect-src / worker-src は呼び出し側で合成すること。
   */
  webPush?: Omit<WebPushProxyProps, "geonicdbUrl"> & {
    geonicdbUrl: string;
  };
  /**
   * WAFv2 WebACL ARN（#36）。CLOUDFRONT scope のため us-east-1 の WebPushWebAclStack から渡し、
   * Distribution の webAclId に設定する。`crossRegionReferences: true` が必要。
   */
  webAclArn?: string;
};

const CUSTOM_SECURITY_HEADERS = [
  {
    header: "Permissions-Policy",
    value:
      "camera=(), microphone=(), payment=(), usb=(), interest-cohort=(), geolocation=(self)",
    override: true,
  },
  {
    header: "Cross-Origin-Resource-Policy",
    value: "same-origin",
    override: true,
  },
  {
    header: "Cross-Origin-Opener-Policy",
    value: "same-origin",
    override: true,
  },
] as const;

/**
 * CloudFront ビューワー証明書用 ACM ARN は us-east-1 のみ。
 * 他リージョンの ARN は Distribution 作成時に失敗する。
 * @returns 前後空白を除いた正規化 ARN
 */
export function assertCloudFrontAcmCertificateArn(arn: string): string {
  const normalized = arn.trim();
  const match = /^arn:aws:acm:([^:]+):\d{12}:certificate\/[\w-]+$/.exec(
    normalized,
  );
  if (!match) {
    throw new Error(
      `BosaiSiteStack: certificateArn must be an ACM certificate ARN (got: ${arn})`,
    );
  }
  if (match[1] !== "us-east-1") {
    throw new Error(
      `BosaiSiteStack: CloudFront viewer certificates must be in us-east-1 (got region ${match[1]})`,
    );
  }
  return normalized;
}

export class BosaiSiteStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly responseHeadersPolicy: cloudfront.ResponseHeadersPolicy;
  public readonly webPushProxy?: WebPushProxy;

  constructor(scope: Construct, id: string, props: BosaiSiteStackProps = {}) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: props.bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const cspValue = buildContentSecurityPolicy({
      ...props.cspExtras,
      reportUri: props.cspReportUri,
    });
    const cspReportOnly = props.cspReportOnly ?? false;

    const baseSecurityHeaders: cloudfront.ResponseSecurityHeadersBehavior = {
      contentTypeOptions: { override: true },
      frameOptions: {
        frameOption: cloudfront.HeadersFrameOption.DENY,
        override: true,
      },
      referrerPolicy: {
        referrerPolicy:
          cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
        override: true,
      },
      strictTransportSecurity: {
        accessControlMaxAge: cdk.Duration.seconds(63_072_000),
        includeSubdomains: true,
        preload: true,
        override: true,
      },
      // X-XSS-Protection は送出しない（仕様 5.8.2 SHOULD・CSP で代替）
    };

    this.responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      cspReportOnly ? "SecurityHeadersReportOnly" : "SecurityHeaders",
      {
        comment: cspReportOnly
          ? "geonicdb-bosai 5.8.2 (CSP Report-Only)"
          : "geonicdb-bosai 5.8.2 security headers",
        securityHeadersBehavior: cspReportOnly
          ? baseSecurityHeaders
          : {
              ...baseSecurityHeaders,
              contentSecurityPolicy: {
                contentSecurityPolicy: cspValue,
                override: true,
              },
            },
        customHeadersBehavior: {
          customHeaders: [
            ...(cspReportOnly
              ? [
                  {
                    header: "Content-Security-Policy-Report-Only",
                    value: cspValue,
                    override: true,
                  },
                ]
              : []),
            ...CUSTOM_SECURITY_HEADERS,
          ],
        },
      },
    );

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "OAI",
    );
    this.bucket.grantRead(originAccessIdentity);

    const hasCert =
      props.certificateArn != null && props.certificateArn.length > 0;
    const hasDomains =
      props.domainNames != null && props.domainNames.length > 0;
    if (hasCert && !hasDomains) {
      throw new Error(
        "BosaiSiteStack: domainNames is required when certificateArn is set",
      );
    }
    if (hasDomains && !hasCert) {
      throw new Error(
        "BosaiSiteStack: certificateArn is required when domainNames is set",
      );
    }

    let certificate: acm.ICertificate | undefined;
    if (hasCert) {
      const normalizedArn = assertCloudFrontAcmCertificateArn(
        props.certificateArn!,
      );
      certificate = acm.Certificate.fromCertificateArn(
        this,
        "ViewerCertificate",
        normalizedArn,
      );
    }

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      // TLS 1.2_2021 はカスタム証明書があるときだけ効く（無ければ CloudFront 既定 TLSv1）。
      ...(certificate
        ? {
            certificate,
            domainNames: props.domainNames,
            minimumProtocolVersion:
              cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
          }
        : {}),
      // #36: WAFv2（us-east-1 WebPushWebAclStack）— /api/webpush* のみ rate-limit
      ...(props.webAclArn ? { webAclId: props.webAclArn } : {}),
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: this.responseHeadersPolicy,
        compress: true,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: cdk.Duration.minutes(1),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: cdk.Duration.minutes(1),
        },
      ],
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
    });
    new cdk.CfnOutput(this, "CspHeaderValue", {
      value: cspValue,
      description: cspReportOnly
        ? "Content-Security-Policy-Report-Only value"
        : "Content-Security-Policy value",
    });

    if (props.webPush) {
      this.webPushProxy = new WebPushProxy(this, "WebPushProxy", props.webPush);
      // 同一オリジン /api/webpush 経由で登録（connect-src 'self' のまま）
      this.distribution.addBehavior(
        "/api/webpush",
        new origins.FunctionUrlOrigin(this.webPushProxy.functionUrl),
        {
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: this.responseHeadersPolicy,
        },
      );
      new cdk.CfnOutput(this, "WebPushSameOriginPath", {
        value: "/api/webpush",
        description:
          "Prefer NEXT_PUBLIC_WEBPUSH_REGISTER_URL=/api/webpush on CloudFront",
      });
    }
  }
}
