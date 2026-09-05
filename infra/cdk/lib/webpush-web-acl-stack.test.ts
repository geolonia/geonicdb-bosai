import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import {
  WEBPUSH_LAMBDA_RESERVED_CONCURRENCY,
  WEBPUSH_RATE_LIMIT_EVALUATION_WINDOW_SEC,
  WEBPUSH_RATE_LIMIT_PER_5_MIN,
  WEBPUSH_RATE_LIMIT_URI_PREFIX,
} from "./webpush-limits";
import { WebPushWebAclStack } from "./webpush-web-acl-stack";

function synthWebAcl(region = "us-east-1") {
  const app = new cdk.App();
  const stack = new WebPushWebAclStack(app, "TestWebAcl", {
    env: { account: "111111111111", region },
  });
  return { stack, template: Template.fromStack(stack) };
}

describe("WebPushWebAclStack", () => {
  it("creates a CLOUDFRONT WebACL with rate-based rule scoped to /api/webpush", () => {
    const { template } = synthWebAcl();

    template.resourceCountIs("AWS::WAFv2::WebACL", 1);
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Scope: "CLOUDFRONT",
      DefaultAction: { Allow: {} },
      Rules: [
        {
          Name: "WebPushRateLimit",
          Priority: 0,
          Action: { Block: {} },
          Statement: {
            RateBasedStatement: {
              Limit: WEBPUSH_RATE_LIMIT_PER_5_MIN,
              EvaluationWindowSec: WEBPUSH_RATE_LIMIT_EVALUATION_WINDOW_SEC,
              AggregateKeyType: "IP",
              ScopeDownStatement: {
                ByteMatchStatement: {
                  FieldToMatch: { UriPath: {} },
                  PositionalConstraint: "STARTS_WITH",
                  SearchString: WEBPUSH_RATE_LIMIT_URI_PREFIX,
                  TextTransformations: [
                    { Priority: 0, Type: "NORMALIZE_PATH" },
                  ],
                },
              },
            },
          },
        },
      ],
    });
  });

  it("rejects creation outside us-east-1", () => {
    expect(() => synthWebAcl("ap-northeast-1")).toThrow(/us-east-1/);
  });

  it("near-miss: ScopeDown searchString is /api/webpush (not a broader /api/ prefix)", () => {
    const { template } = synthWebAcl();
    const acls = template.findResources("AWS::WAFv2::WebACL");
    const rules = Object.values(acls)[0].Properties.Rules as Array<{
      Statement?: {
        RateBasedStatement?: {
          ScopeDownStatement?: {
            ByteMatchStatement?: {
              SearchString?: string;
              TextTransformations?: Array<{ Type?: string }>;
            };
          };
        };
      };
    }>;
    const byte =
      rules[0]?.Statement?.RateBasedStatement?.ScopeDownStatement
        ?.ByteMatchStatement;
    const search = byte?.SearchString;
    expect(search).toBe("/api/webpush");
    // 通ってはいけない: 静的アセット全体をレート制限する広いプレフィックス
    expect(search).not.toBe("/");
    expect(search).not.toBe("/api/");
    expect(search).not.toBe("/api");
    // STARTS_WITH なので /api/webpush は /api/webpush* をカバー（指令どおり）
    expect("/api/webpush/extra".startsWith(search!)).toBe(true);
    expect("/api/other".startsWith(search!)).toBe(false);
    // /api/x/../webpush 回避を防ぐため NORMALIZE_PATH（NONE は不可）
    expect(byte?.TextTransformations?.map((t) => t.Type)).toEqual([
      "NORMALIZE_PATH",
    ]);
  });

  it("rate limit threshold and evaluation window are explicit (not CFN-default-only)", () => {
    expect(WEBPUSH_RATE_LIMIT_PER_5_MIN).toBe(120);
    expect(WEBPUSH_RATE_LIMIT_PER_5_MIN).toBeLessThan(10_000);
    expect(WEBPUSH_RATE_LIMIT_EVALUATION_WINDOW_SEC).toBe(300);
    const { template } = synthWebAcl();
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Rules: Match.arrayWith([
        Match.objectLike({
          Statement: {
            RateBasedStatement: Match.objectLike({
              Limit: 120,
              EvaluationWindowSec: 300,
            }),
          },
        }),
      ]),
    });
  });
});

describe("Web Push rate-limit constants (regression vs #36)", () => {
  it("reserved concurrency is a coarse cost backstop (~50), not a tight throttle", () => {
    expect(WEBPUSH_LAMBDA_RESERVED_CONCURRENCY).toBe(50);
    // 災害時の正規急増で締め出さない余裕。過度に小さくしない。
    expect(WEBPUSH_LAMBDA_RESERVED_CONCURRENCY).toBeGreaterThanOrEqual(40);
    expect(WEBPUSH_LAMBDA_RESERVED_CONCURRENCY).toBeLessThanOrEqual(100);
  });
});
