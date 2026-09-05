/**
 * Web Push 登録プロキシ（Lambda Function URL + Secrets Manager）。
 * BosaiSiteStack から compose する。
 */
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "node:path";

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
  /** サイト origin（CORS と description 用） */
  siteOrigin?: string;
  /** CORS Allow-Origin。未指定時は siteOrigin、それも無ければ * */
  corsAllowOrigin?: string;
};

export class WebPushProxy extends Construct {
  public readonly function: lambda.Function;
  public readonly functionUrl: lambda.FunctionUrl;
  public readonly apiKeySecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: WebPushProxyProps) {
    super(scope, id);

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

    const corsOrigin =
      props.corsAllowOrigin ?? props.siteOrigin?.replace(/\/+$/, "") ?? "*";

    this.function = new NodejsFunction(this, "Fn", {
      entry: path.join(__dirname, "../lambda/webpush-proxy/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      description: "geonicdb-bosai Web Push subscription proxy",
      environment: {
        GEONICDB_URL: props.geonicdbUrl.replace(/\/+$/, ""),
        GEONICDB_API_KEY_SECRET_ARN: this.apiKeySecret.secretArn,
        ...(props.geonicdbTenant
          ? { GEONICDB_TENANT: props.geonicdbTenant }
          : {}),
        ...(props.bosaiContextUrl
          ? { BOSAI_CONTEXT_URL: props.bosaiContextUrl }
          : {}),
        ...(props.siteOrigin
          ? { SITE_ORIGIN: props.siteOrigin.replace(/\/+$/, "") }
          : {}),
        CORS_ALLOW_ORIGIN: corsOrigin,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node22",
        // aws-sdk v3 はバンドルに含める（Lambda Node に同梱されない）
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

    new cdk.CfnOutput(this, "WebPushRegisterUrl", {
      value: this.functionUrl.url,
      description:
        "NEXT_PUBLIC_WEBPUSH_REGISTER_URL — browser POST/DELETE for PushSubscription",
    });
  }
}
