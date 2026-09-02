#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
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

/**
 * GeonicDB 等の別オリジンを connect-src に足す。
 * 例: cdk deploy -c geonicdbUrl=https://geonicdb.example.jp
 * または環境変数 NEXT_PUBLIC_GEONICDB_URL（サイト build と同じ値）
 */
function originFromUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    throw new Error(
      `Invalid geonicdbUrl / NEXT_PUBLIC_GEONICDB_URL: ${trimmed}`,
    );
  }
}

const geonicdbOrigin = originFromUrl(
  app.node.tryGetContext("geonicdbUrl") ?? process.env.NEXT_PUBLIC_GEONICDB_URL,
);

new BosaiSiteStack(app, "GeonicdbBosaiSite", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
  },
  // 初回デプロイや CSP 変更時は context で report-only に切り替え可能:
  //   cdk deploy -c cspReportOnly=true -c cspReportUri=https://example.com/csp
  cspReportOnly: app.node.tryGetContext("cspReportOnly") === "true",
  cspReportUri: app.node.tryGetContext("cspReportUri"),
  cspExtras: geonicdbOrigin ? { connectSrc: [geonicdbOrigin] } : undefined,
  // SSL Labs A+ 用（ACM は us-east-1）:
  //   cdk deploy -c certificateArn=arn:aws:acm:us-east-1:...:certificate/... -c domainNames=bosai.example.jp
  certificateArn: app.node.tryGetContext("certificateArn"),
  domainNames,
});
