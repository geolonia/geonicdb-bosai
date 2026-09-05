import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { BosaiSiteStack } from "./bosai-site-stack";
import { DEFAULT_CSP } from "./csp-policy";

function synth(props: ConstructorParameters<typeof BosaiSiteStack>[2] = {}) {
  const app = new cdk.App();
  const stack = new BosaiSiteStack(app, "TestBosaiSite", {
    ...props,
    env: { account: "111111111111", region: "ap-northeast-1" },
  });
  return Template.fromStack(stack);
}

describe("BosaiSiteStack Response Headers Policy", () => {
  it("emits Content-Security-Policy (not Report-Only) by default", () => {
    const template = synth();
    const policies = template.findResources(
      "AWS::CloudFront::ResponseHeadersPolicy",
    );
    expect(Object.keys(policies)).toHaveLength(1);
    const config =
      Object.values(policies)[0].Properties.ResponseHeadersPolicyConfig;

    expect(config.SecurityHeadersConfig.ContentSecurityPolicy).toEqual({
      ContentSecurityPolicy: DEFAULT_CSP,
      Override: true,
    });
    const customHeaders: { Header: string; Value?: string }[] =
      config.CustomHeadersConfig?.Items ?? [];
    expect(
      customHeaders.some(
        (h) => h.Header === "Content-Security-Policy-Report-Only",
      ),
    ).toBe(false);

    expect(config.SecurityHeadersConfig.StrictTransportSecurity).toEqual({
      AccessControlMaxAgeSec: 63_072_000,
      IncludeSubdomains: true,
      Override: true,
      Preload: true,
    });
    expect(config.SecurityHeadersConfig.ContentTypeOptions).toEqual({
      Override: true,
    });
    expect(config.SecurityHeadersConfig.FrameOptions).toEqual({
      FrameOption: "DENY",
      Override: true,
    });
    expect(config.SecurityHeadersConfig.ReferrerPolicy).toEqual({
      ReferrerPolicy: "strict-origin-when-cross-origin",
      Override: true,
    });
    expect(
      customHeaders.some(
        (h) =>
          h.Header === "Permissions-Policy" &&
          (h.Value ?? "").includes("geolocation=(self)"),
      ),
    ).toBe(true);
  });

  it("uses Content-Security-Policy-Report-Only when cspReportOnly is true", () => {
    const template = synth({
      cspReportOnly: true,
      cspReportUri: "https://report.example.example/csp",
    });
    const policies = template.findResources(
      "AWS::CloudFront::ResponseHeadersPolicy",
    );
    expect(Object.keys(policies)).toHaveLength(1);
    const config =
      Object.values(policies)[0].Properties.ResponseHeadersPolicyConfig;

    expect(config.SecurityHeadersConfig.ContentSecurityPolicy).toBeUndefined();
    const customHeaders: { Header: string; Value: string }[] =
      config.CustomHeadersConfig?.Items ?? [];
    const reportOnly = customHeaders.find(
      (h) => h.Header === "Content-Security-Policy-Report-Only",
    );
    expect(reportOnly).toBeDefined();
    expect(reportOnly!.Value).toContain("default-src 'none'");
    expect(reportOnly!.Value).toContain(
      "report-uri https://report.example.example/csp",
    );
    expect(
      customHeaders.some((h) => h.Header === "Content-Security-Policy"),
    ).toBe(false);
  });

  it("sets TLS_V1_2_2021 when ACM certificate and domainNames are provided", () => {
    const certArn =
      "arn:aws:acm:us-east-1:111111111111:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const template = synth({
      certificateArn: certArn,
      domainNames: ["bosai.example.example"],
    });
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        ViewerCertificate: {
          AcmCertificateArn: certArn,
          MinimumProtocolVersion: "TLSv1.2_2021",
          SslSupportMethod: "sni-only",
        },
        Aliases: ["bosai.example.example"],
      },
    });
  });

  it("rejects certificateArn without domainNames", () => {
    expect(() =>
      synth({
        certificateArn:
          "arn:aws:acm:us-east-1:111111111111:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toThrow(/domainNames is required/);
  });

  it("rejects domainNames without certificateArn", () => {
    expect(() => synth({ domainNames: ["bosai.example.example"] })).toThrow(
      /certificateArn is required/,
    );
  });

  it("rejects ACM certificate ARNs outside us-east-1", () => {
    expect(() =>
      synth({
        certificateArn:
          "arn:aws:acm:ap-northeast-1:111111111111:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        domainNames: ["bosai.example.example"],
      }),
    ).toThrow(/us-east-1/);
  });

  it("normalizes surrounding whitespace on certificateArn", () => {
    const certArn =
      "arn:aws:acm:us-east-1:111111111111:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const template = synth({
      certificateArn: `  ${certArn}  `,
      domainNames: ["bosai.example.example"],
    });
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        ViewerCertificate: {
          AcmCertificateArn: certArn,
        },
      },
    });
  });

  it("includes connectSrc extras in the CSP header value", () => {
    const template = synth({
      cspExtras: { connectSrc: ["https://geonicdb.example.example"] },
    });
    const policies = template.findResources(
      "AWS::CloudFront::ResponseHeadersPolicy",
    );
    const config =
      Object.values(policies)[0].Properties.ResponseHeadersPolicyConfig;
    expect(
      config.SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy,
    ).toContain("connect-src 'self' https://geonicdb.example.example");
  });

  it("wires Response Headers Policy onto the default cache behavior", () => {
    const template = synth();
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        DefaultCacheBehavior: {
          ResponseHeadersPolicyId: Match.anyValue(),
          ViewerProtocolPolicy: "redirect-to-https",
        },
      },
    });
  });

  it("adds Web Push proxy Lambda, Function URL, Secret, and /api/webpush behavior", () => {
    const template = synth({
      webPush: {
        geonicdbUrl: "https://geonicdb.example.example",
        geonicdbTenant: "miya",
        siteOrigin: "https://bosai.example.example",
        corsAllowOrigin: "https://bosai.example.example",
      },
      cspExtras: { workerSrc: ["'self'"] },
    });

    template.resourceCountIs("AWS::Lambda::Function", 1);
    template.resourceCountIs("AWS::Lambda::Url", 1);
    template.resourceCountIs("AWS::SecretsManager::Secret", 1);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Timeout: 15,
      ReservedConcurrentExecutions: 5,
      Environment: {
        Variables: Match.objectLike({
          GEONICDB_URL: "https://geonicdb.example.example",
          GEONICDB_TENANT: "miya",
          CORS_ALLOW_ORIGIN: "https://bosai.example.example",
        }),
      },
    });

    const dist = template.findResources("AWS::CloudFront::Distribution");
    const config = Object.values(dist)[0].Properties.DistributionConfig;
    const behaviors = config.CacheBehaviors ?? [];
    expect(
      behaviors.some(
        (b: { PathPattern?: string }) => b.PathPattern === "/api/webpush",
      ),
    ).toBe(true);

    const policies = template.findResources(
      "AWS::CloudFront::ResponseHeadersPolicy",
    );
    const csp =
      Object.values(policies)[0].Properties.ResponseHeadersPolicyConfig
        .SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy;
    expect(csp).toContain("worker-src 'self'");
  });

  it("attaches WAFv2 WebACL ARN to the CloudFront Distribution when webAclArn is set (#36)", () => {
    const webAclArn =
      "arn:aws:wafv2:us-east-1:111111111111:global/webacl/geonicdb-bosai-webpush/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const template = synth({
      webPush: {
        geonicdbUrl: "https://geonicdb.example.example",
      },
      webAclArn,
    });

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        WebACLId: webAclArn,
      },
    });
  });

  it("does not attach WebACL when webAclArn is omitted", () => {
    const template = synth({
      webPush: {
        geonicdbUrl: "https://geonicdb.example.example",
      },
    });
    const dist = template.findResources("AWS::CloudFront::Distribution");
    const config = Object.values(dist)[0].Properties.DistributionConfig;
    expect(config.WebACLId).toBeUndefined();
  });

  it("rejects relative geonicdbUrl on the WebPushProxy construct", () => {
    expect(() =>
      synth({
        webPush: {
          geonicdbUrl: "/not-absolute",
          siteOrigin: "https://bosai.example.example",
        },
      }),
    ).toThrow(/webPush\.geonicdbUrl.*relative path/);
  });

  it("rejects missing CORS origin on the WebPushProxy construct", () => {
    expect(() =>
      synth({
        webPush: {
          geonicdbUrl: "https://geonicdb.example.example",
        },
      }),
    ).toThrow(/siteOrigin or webPush\.corsAllowOrigin is required/);
  });

  it("grants the Web Push Lambda only Secrets Manager read on its own secret (least privilege)", () => {
    const template = synth({
      webPush: {
        geonicdbUrl: "https://geonicdb.example.example",
        siteOrigin: "https://bosai.example.example",
      },
    });

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
