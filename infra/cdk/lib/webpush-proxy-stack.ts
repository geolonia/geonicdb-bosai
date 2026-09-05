/**
 * Web Push 購読プロキシ専用スタック（#35 / #36）。
 *
 * BosaiSiteStack（S3+CloudFront）に依存しない。GitHub Pages 運用でも本スタックだけを
 * デプロイし、Function URL をブラウザから直接呼べば動作する。
 */
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { WebPushProxy, type WebPushProxyProps } from "./webpush-proxy";

export type WebPushProxyStackProps = cdk.StackProps & WebPushProxyProps;

export class WebPushProxyStack extends cdk.Stack {
  public readonly proxy: WebPushProxy;
  public readonly functionUrl: lambda.FunctionUrl;
  public readonly registerUrl: string;

  constructor(scope: Construct, id: string, props: WebPushProxyStackProps) {
    super(scope, id, props);

    this.proxy = new WebPushProxy(this, "WebPushProxy", {
      geonicdbUrl: props.geonicdbUrl,
      geonicdbTenant: props.geonicdbTenant,
      apiKeySecretArn: props.apiKeySecretArn,
      bosaiContextUrl: props.bosaiContextUrl,
      siteOrigin: props.siteOrigin,
      corsAllowOrigin: props.corsAllowOrigin,
    });
    this.functionUrl = this.proxy.functionUrl;
    this.registerUrl = this.functionUrl.url;

    new cdk.CfnOutput(this, "WebPushRegisterUrl", {
      value: this.registerUrl,
      description:
        "NEXT_PUBLIC_WEBPUSH_REGISTER_URL — Function URL for GitHub Pages / direct fetch",
    });
  }
}
