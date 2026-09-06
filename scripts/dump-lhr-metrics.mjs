/**
 * Lighthouse CI 失敗時に減点監査を標準出力へ出す（推測防止）。
 * exit code は変えず、呼び出し側が lhci の status を引き継ぐ。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(".lighthouseci");
let files = [];
try {
  files = readdirSync(dir)
    .filter((f) => /^lhr-.*\.json$/.test(f))
    .map((f) => path.join(dir, f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    .slice(-3);
} catch {
  console.error("dump-lhr-metrics: no .lighthouseci directory");
  process.exit(0);
}

if (files.length === 0) {
  console.error("dump-lhr-metrics: no lhr-*.json");
  process.exit(0);
}

const weighted = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
];

const clsDetailAudits = [
  "layout-shift-elements",
  "layout-shifts",
  "cls-culprits-insight",
];

for (const file of files) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const perf = d.categories?.performance?.score;
  console.log(
    `--- ${path.basename(file)} perf=${perf} bench=${d.environment?.benchmarkIndex}`,
  );
  for (const id of weighted) {
    const a = d.audits?.[id];
    if (!a) continue;
    console.log(
      `  ${id}: score=${a.score} numeric=${a.numericValue} display=${a.displayValue}`,
    );
  }
  for (const id of clsDetailAudits) {
    const a = d.audits?.[id];
    if (!a) continue;
    const details = a.details ? JSON.stringify(a.details) : "";
    console.log(
      `  ${id}: score=${a.score} display=${a.displayValue} details=${details.slice(0, 4000)}`,
    );
  }
  const raw = readFileSync(file, "utf8");
  console.log(
    `  markers: a2hs=${/a2hs-prompt|ホーム画面に追加/.test(raw)} push=${/push-opt-in/.test(raw)}`,
  );
}
