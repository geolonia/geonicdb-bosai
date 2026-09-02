import type { BosaiResourceResult } from "@/types/bosai-static-snapshot";

export type BosaiResourceView<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T; stale: boolean; asOf: string | null }
  | { kind: "error"; lastFetchedAt: string | null };

/**
 * ライブ取得とビルド時スナップショットを合成する。
 *
 * - ライブ成功 → 最新として表示（stale=false）
 * - スナップショット成功 → GeonicDB 停止・JS 無効相当でも表示（stale=true + asOf）
 * - どちらも無し → error（最終取得時刻があれば F-45 文言用に渡す）
 */
export function resolveBosaiResourceView<T>(args: {
  liveLoading: boolean;
  liveError: Error | null;
  liveData: T | null;
  snapshot: BosaiResourceResult<T> | undefined;
}): BosaiResourceView<T> {
  if (!args.liveLoading && !args.liveError && args.liveData != null) {
    return { kind: "ready", data: args.liveData, stale: false, asOf: null };
  }
  if (args.snapshot?.ok) {
    return {
      kind: "ready",
      data: args.snapshot.data,
      stale: true,
      asOf: args.snapshot.fetchedAt,
    };
  }
  if (args.liveLoading) {
    return { kind: "loading" };
  }
  return {
    kind: "error",
    lastFetchedAt: args.snapshot?.fetchedAt ?? null,
  };
}
