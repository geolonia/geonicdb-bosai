/**
 * Web Push 登録プロキシ（Lambda Function URL + Secrets Manager）。
 * WebPushProxyStack から compose する。BosaiSiteStack には依存しない。
 */
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "node:path";
import {
  assertAbsoluteHttpOrigin,
  assertAbsoluteHttpUrl,
} from "./assert-absolute-http-origin";
import { WEBPUSH_LAMBDA_RESERVED_CONCURRENCY } from "./webpush-limits";

export type WebPushProxyProps = {
  /** GeonicDB base URL（例: https://geonicdb.geolonia.com） */
  geonicdbUrl: string;
  /** Fiware-Service / tenant（任意） */
  geonicdbTenant?: string;
  /**
   * 既存 Secrets Manager シークレット ARN。
   * 未指定時は空のシークレットを新規作成（値はデプロイ後に投入）。
   */
  apiKeySecretArn?: string;
  /** bosai-context.jsonld の絶対 URL（任意。型名解決用 Link ヘッダ） */
  bosaiContextUrl?: string;
  /** サイト origin（CORS と description 用）。corsAllowOrigin 未指定時は必須 */
  siteOrigin?: string;
  /** CORS Allow-Origin。未指定時は siteOrigin の origin。`*` は禁止 */
  corsAllowOrigin?: string;
};

export class WebPushProxy extends Construct {
  public readonly function: lambda.Function;
  public readonly functionUrl: lambda.FunctionUrl;
  public readonly apiKeySecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: WebPushProxyProps) {
    super(scope, id);

    const geonicdbUrl = assertAbsoluteHttpUrl(
      props.geonicdbUrl,
      "webPush.geonicdbUrl",
    );
    if (!geonicdbUrl) {
      throw new Error("webPush.geonicdbUrl is required");
    }

    const corsSource = props.corsAllowOrigin ?? props.siteOrigin;
    if (!corsSource || corsSource.trim() === "*") {
      throw new Error(
        "webPush.siteOrigin or webPush.corsAllowOrigin is required (absolute http(s) origin; * is not allowed)",
      );
    }
    const corsOrigin = assertAbsoluteHttpOrigin(
      corsSource,
      "webPush.corsAllowOrigin",
    );
    if (!corsOrigin) {
      throw new Error(
        "webPush.siteOrigin or webPush.corsAllowOrigin is required",
      );
    }

    const siteOrigin = props.siteOrigin
      ? assertAbsoluteHttpOrigin(props.siteOrigin, "webPush.siteOrigin")
      : corsOrigin;

    if (props.apiKeySecretArn) {
      this.apiKeySecret = secretsmanager.Secret.fromSecretCompleteArn(
        this,
        "GeonicdbApiKeySecret",
        props.apiKeySecretArn,
      );
    } else {
      this.apiKeySecret = new secretsmanager.Secret(
        this,
        "GeonicdbApiKeySecret",
        {
          description:
            "geonicdb-bosai Web Push proxy: GEONICDB_API_KEY (plain or JSON {apiKey})",
          secretName: undefined,
          removalPolicy: cdk.RemovalPolicy.RETAIN,
        },
      );
    }

    this.function = new NodejsFunction(this, "Fn", {
      entry: path.join(__dirname, "../lambda/webpush-proxy/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      // #36: 粗いコスト上限。GitHub Pages + Function URL 単体運用では主たる防御。
      // CloudFront フルデプロイ時の主防御は WAF。直叩きの完全分離はスコープ外。
      reservedConcurrentExecutions: WEBPUSH_LAMBDA_RESERVED_CONCURRENCY,
      description: "geonicdb-bosai Web Push subscription proxy",
      environment: {
        GEONICDB_URL: geonicdbUrl,
        GEONICDB_API_KEY_SECRET_ARN: this.apiKeySecret.secretArn,
        ...(props.geonicdbTenant
          ? { GEONICDB_TENANT: props.geonicdbTenant }
          : {}),
        ...(props.bosaiContextUrl
          ? { BOSAI_CONTEXT_URL: props.bosaiContextUrl }
          : {}),
        ...(siteOrigin ? { SITE_ORIGIN: siteOrigin } : {}),
        CORS_ALLOW_ORIGIN: corsOrigin,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node22",
        externalModules: [],
      },
    });

    // 最小権限: 当該シークレットの GetSecretValue のみ
    this.apiKeySecret.grantRead(this.function);

    this.functionUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: [corsOrigin],
        allowedMethods: [lambda.HttpMethod.POST, lambda.HttpMethod.DELETE],
        allowedHeaders: ["content-type"],
        maxAge: cdk.Duration.days(1),
      },
    });
  }
}
