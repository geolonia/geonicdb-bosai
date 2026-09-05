import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { BosaiSiteStack } from "./bosai-site-stack";
import { DEFAULT_CSP } from "./csp-policy";
import { WebPushProxyStack } from "./webpush-proxy-stack";

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

  it("adds /api/webpush CloudFront behavior when webPushFunctionUrl is provided", () => {
    const app = new cdk.App();
    const proxy = new WebPushProxyStack(app, "Proxy", {
      env: { account: "111111111111", region: "ap-northeast-1" },
      geonicdbUrl: "https://geonicdb.example.example",
      siteOrigin: "https://bosai.example.example",
    });
    const site = new BosaiSiteStack(app, "Site", {
      env: { account: "111111111111", region: "ap-northeast-1" },
      webPushFunctionUrl: proxy.functionUrl,
      cspExtras: { workerSrc: ["'self'"] },
    });
    const template = Template.fromStack(site);

    // Lambda はサイトスタックに置かない（独立スタック側）
    template.resourceCountIs("AWS::Lambda::Function", 0);
    template.resourceCountIs("AWS::Lambda::Url", 0);
    template.resourceCountIs("AWS::SecretsManager::Secret", 0);

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
    const template = synth({ webAclArn });

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        WebACLId: webAclArn,
      },
    });
  });

  it("does not attach WebACL when webAclArn is omitted", () => {
    const template = synth();
    const dist = template.findResources("AWS::CloudFront::Distribution");
    const config = Object.values(dist)[0].Properties.DistributionConfig;
    expect(config.WebACLId).toBeUndefined();
  });
});
