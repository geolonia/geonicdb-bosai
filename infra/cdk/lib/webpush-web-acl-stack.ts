/**
 * CloudFront 用 WAFv2 WebACL（#36）。
 *
 * CLOUDFRONT scope の WebACL は **us-east-1 でのみ**作成可能。
 * BosaiSiteStack（ap-northeast-1）へは `crossRegionReferences: true` で ARN を渡し、
 * Distribution の `webAclId` に設定する（ACM 証明書と同型のリージョン分離）。
 */
import * as cdk from "aws-cdk-lib";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";
import {
  WEBPUSH_RATE_LIMIT_EVALUATION_WINDOW_SEC,
  WEBPUSH_RATE_LIMIT_PER_5_MIN,
  WEBPUSH_RATE_LIMIT_URI_PREFIX,
} from "./webpush-limits";

export type WebPushWebAclStackProps = cdk.StackProps;

export class WebPushWebAclStack extends cdk.Stack {
  /** CloudFront Distribution の webAclId に渡す WAFv2 ARN */
  public readonly webAclArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: WebPushWebAclStackProps = {},
  ) {
    super(scope, id, props);

    if (cdk.Stack.of(this).region !== "us-east-1") {
      throw new Error(
        "WebPushWebAclStack: CLOUDFRONT-scoped WAFv2 WebACL must be created in us-east-1",
      );
    }

    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
      name: "geonicdb-bosai-webpush",
      description:
        "geonicdb-bosai rate-limit for /api/webpush path prefix, issue 36",
      defaultAction: { allow: {} },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "GeonicdbBosaiWebAcl",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "WebPushRateLimit",
          priority: 0,
          action: { block: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "WebPushRateLimit",
            sampledRequestsEnabled: true,
          },
          statement: {
            rateBasedStatement: {
              limit: WEBPUSH_RATE_LIMIT_PER_5_MIN,
              evaluationWindowSec: WEBPUSH_RATE_LIMIT_EVALUATION_WINDOW_SEC,
              aggregateKeyType: "IP",
              scopeDownStatement: {
                byteMatchStatement: {
                  fieldToMatch: { uriPath: {} },
                  positionalConstraint: "STARTS_WITH",
                  searchString: WEBPUSH_RATE_LIMIT_URI_PREFIX,
                  textTransformations: [
                    { priority: 0, type: "NORMALIZE_PATH" },
                  ],
                },
              },
            },
          },
        },
      ],
    });

    this.webAclArn = webAcl.attrArn;

    new cdk.CfnOutput(this, "WebAclArn", {
      value: this.webAclArn,
      description:
        "Pass to BosaiSiteStack webAclArn (CloudFront Distribution webAclId)",
    });
  }
}
