#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { assertAbsoluteHttpOrigin } from "../lib/assert-absolute-http-origin";
import { BosaiSiteStack } from "../lib/bosai-site-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const siteRegion = process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1";

const domainNamesCtx = app.node.tryGetContext("domainNames");
const domainNames =
  typeof domainNamesCtx === "string" && domainNamesCtx.length > 0
    ? domainNamesCtx
        .split(",")
        .map((d: string) => d.trim())
        .filter(Boolean)
    : undefined;

const geonicdbUrlRaw =
  (app.node.tryGetContext("geonicdbUrl") as string | undefined) ??
  process.env.NEXT_PUBLIC_GEONICDB_URL;
const geonicdbOrigin = assertAbsoluteHttpOrigin(
  geonicdbUrlRaw,
  "geonicdbUrl / NEXT_PUBLIC_GEONICDB_URL",
);

const connectSrc = [...(geonicdbOrigin ? [geonicdbOrigin] : [])];

new BosaiSiteStack(app, "GeonicdbBosaiSite", {
  env: {
    account,
    region: siteRegion,
  },
  // 初回デプロイや CSP 変更時は context で report-only に切り替え可能:
  //   cdk deploy -c cspReportOnly=true -c cspReportUri=https://example.com/csp
  cspReportOnly: app.node.tryGetContext("cspReportOnly") === "true",
  cspReportUri: app.node.tryGetContext("cspReportUri"),
  cspExtras: {
    ...(connectSrc.length > 0 ? { connectSrc } : {}),
    // Web Push 受信用 Service Worker（#35/#39）。中間プロキシは不要。
    workerSrc: ["'self'"],
  },
  // SSL Labs A+ 用（ACM は us-east-1）:
  //   cdk deploy -c certificateArn=arn:aws:acm:us-east-1:...:certificate/... -c domainNames=bosai.example.jp
  certificateArn: app.node.tryGetContext("certificateArn"),
  domainNames,
});
