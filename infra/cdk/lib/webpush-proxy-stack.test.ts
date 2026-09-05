import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { WebPushProxyStack } from "./webpush-proxy-stack";

function synth(
  props: Omit<ConstructorParameters<typeof WebPushProxyStack>[2], "env"> = {
    geonicdbUrl: "https://geonicdb.example.example",
    siteOrigin: "https://pages.example.example",
  },
) {
  const app = new cdk.App();
  const stack = new WebPushProxyStack(app, "TestWebPushProxy", {
    ...props,
    env: { account: "111111111111", region: "ap-northeast-1" },
  });
  return Template.fromStack(stack);
}

describe("WebPushProxyStack (standalone, no CloudFront)", () => {
  it("creates Lambda, Function URL, and Secret without depending on BosaiSiteStack", () => {
    const template = synth({
      geonicdbUrl: "https://geonicdb.example.example",
      geonicdbTenant: "miya",
      siteOrigin: "https://geolonia.github.io",
    });

    template.resourceCountIs("AWS::Lambda::Function", 1);
    template.resourceCountIs("AWS::Lambda::Url", 1);
    template.resourceCountIs("AWS::SecretsManager::Secret", 1);
    template.resourceCountIs("AWS::CloudFront::Distribution", 0);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Timeout: 15,
      ReservedConcurrentExecutions: 50,
      Environment: {
        Variables: Match.objectLike({
          GEONICDB_URL: "https://geonicdb.example.example",
          GEONICDB_TENANT: "miya",
          CORS_ALLOW_ORIGIN: "https://geolonia.github.io",
        }),
      },
    });
  });

  it("rejects relative geonicdbUrl", () => {
    expect(() =>
      synth({
        geonicdbUrl: "/not-absolute",
        siteOrigin: "https://bosai.example.example",
      }),
    ).toThrow(/webPush\.geonicdbUrl.*relative path/);
  });

  it("rejects missing CORS origin", () => {
    expect(() =>
      synth({
        geonicdbUrl: "https://geonicdb.example.example",
      } as ConstructorParameters<typeof WebPushProxyStack>[2]),
    ).toThrow(/siteOrigin or webPush\.corsAllowOrigin is required/);
  });

  it("grants the Lambda only Secrets Manager read on its own secret (least privilege)", () => {
    const template = synth();

    const secrets = template.findResources("AWS::SecretsManager::Secret");
    expect(Object.keys(secrets)).toHaveLength(1);
    const secretLogicalId = Object.keys(secrets)[0];

    const iamPolicies = template.findResources("AWS::IAM::Policy");
    const statements: Array<{
      Action?: string | string[];
      Resource?: string | string[] | Record<string, unknown>;
      Effect?: string;
    }> = [];
    for (const policy of Object.values(iamPolicies)) {
      const doc = policy.Properties.PolicyDocument;
      for (const stmt of doc.Statement ?? []) {
        statements.push(stmt);
      }
    }

    const secretActions = statements.filter((s) => {
      const actions = Array.isArray(s.Action)
        ? s.Action
        : s.Action
          ? [s.Action]
          : [];
      return actions.some(
        (a) => typeof a === "string" && a.startsWith("secretsmanager:"),
      );
    });
    expect(secretActions.length).toBeGreaterThan(0);

    for (const stmt of secretActions) {
      expect(stmt.Effect).toBe("Allow");
      const actions = (
        Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action]
      ).filter((a): a is string => typeof a === "string");
      for (const action of actions) {
        expect(action).toMatch(
          /^secretsmanager:(GetSecretValue|DescribeSecret)$/,
        );
      }

      const resources = Array.isArray(stmt.Resource)
        ? stmt.Resource
        : [stmt.Resource];
      for (const resource of resources) {
        expect(resource).not.toBe("*");
        const serialized = JSON.stringify(resource);
        expect(serialized).toContain(secretLogicalId);
        expect(serialized).not.toMatch(/"\*"/);
      }
    }

    for (const stmt of statements) {
      const actions = (
        Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action]
      ).filter((a): a is string => typeof a === "string");
      for (const action of actions) {
        expect(action).not.toMatch(/^(s3|dynamodb|sns|sqs|kms):\*/);
        expect(action).not.toBe("secretsmanager:*");
      }
    }
  });
});
