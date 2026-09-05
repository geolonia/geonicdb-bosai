#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { assertAbsoluteHttpOrigin } from "../lib/assert-absolute-http-origin";
import { BosaiSiteStack } from "../lib/bosai-site-stack";

const app = new cdk.App();

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

const siteOriginRaw =
  (app.node.tryGetContext("siteOrigin") as string | undefined) ??
  process.env.NEXT_PUBLIC_SITE_ORIGIN;
const siteOrigin = siteOriginRaw?.trim()
  ? assertAbsoluteHttpOrigin(
      siteOriginRaw,
      "siteOrigin / NEXT_PUBLIC_SITE_ORIGIN",
    )
  : undefined;

const webPushRegisterOrigin = assertAbsoluteHttpOrigin(
  app.node.tryGetContext("webPushRegisterUrl") as string | undefined,
  "webPushRegisterUrl",
);

const enableWebPushCtx = app.node.tryGetContext("enableWebPush");
const enableWebPush = enableWebPushCtx === true || enableWebPushCtx === "true";
const geonicdbTenant =
  (app.node.tryGetContext("geonicdbTenant") as string | undefined) ??
  process.env.NEXT_PUBLIC_GEONICDB_TENANT ??
  process.env.GEONICDB_TENANT;
const apiKeySecretArn = app.node.tryGetContext("geonicdbApiKeySecretArn") as
  string | undefined;
const bosaiContextUrl = app.node.tryGetContext("bosaiContextUrl") as
  string | undefined;

const connectSrc = [
  ...(geonicdbOrigin ? [geonicdbOrigin] : []),
  ...(webPushRegisterOrigin ? [webPushRegisterOrigin] : []),
];

new BosaiSiteStack(app, "GeonicdbBosaiSite", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
  },
  // 初回デプロイや CSP 変更時は context で report-only に切り替え可能:
  //   cdk deploy -c cspReportOnly=true -c cspReportUri=https://example.com/csp
  cspReportOnly: app.node.tryGetContext("cspReportOnly") === "true",
  cspReportUri: app.node.tryGetContext("cspReportUri"),
  cspExtras: {
    ...(connectSrc.length > 0 ? { connectSrc } : {}),
    // #35: Service Worker（push 受信専用）
    workerSrc: ["'self'"],
  },
  // SSL Labs A+ 用（ACM は us-east-1）:
  //   cdk deploy -c certificateArn=arn:aws:acm:us-east-1:...:certificate/... -c domainNames=bosai.example.jp
  certificateArn: app.node.tryGetContext("certificateArn"),
  domainNames,
  ...(enableWebPush && geonicdbUrlRaw
    ? {
        webPush: {
          geonicdbUrl: geonicdbUrlRaw.trim().replace(/\/+$/, ""),
          ...(geonicdbTenant?.trim()
            ? { geonicdbTenant: geonicdbTenant.trim() }
            : {}),
          ...(apiKeySecretArn?.trim()
            ? { apiKeySecretArn: apiKeySecretArn.trim() }
            : {}),
          ...(bosaiContextUrl?.trim()
            ? { bosaiContextUrl: bosaiContextUrl.trim() }
            : {}),
          ...(siteOrigin ? { siteOrigin, corsAllowOrigin: siteOrigin } : {}),
        },
      }
    : {}),
});
