import type { BosaiResourceResult } from "@/types/bosai-static-snapshot";

export type BosaiResourceView<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T; stale: boolean; asOf: string | null }
  /** ライブ取得は成功したが対象エンティティが無い（解除など）。スナップショットへは落とさない。 */
  | { kind: "empty" }
  | { kind: "error"; lastFetchedAt: string | null };

/**
 * ライブ取得とビルド時スナップショットを合成する。
 *
 * - ライブ成功（data あり）→ 最新として表示（stale=false）
 * - ライブ空成功（error なし・data null）→ empty（古いスナップショットを出さない）
 * - ライブ loading / 失敗 + スナップショット成功 → stale 表示（N-10）
 * - どちらも無し → error
 */
export function resolveBosaiResourceView<T>(args: {
  liveLoading: boolean;
  liveError: Error | null;
  liveData: T | null;
  snapshot: BosaiResourceResult<T> | undefined;
}): BosaiResourceView<T> {
  if (args.liveLoading) {
    if (args.snapshot?.ok) {
      return {
        kind: "ready",
        data: args.snapshot.data,
        stale: true,
        asOf: args.snapshot.fetchedAt,
      };
    }
    return { kind: "loading" };
  }

  if (args.liveError) {
    if (args.snapshot?.ok) {
      return {
        kind: "ready",
        data: args.snapshot.data,
        stale: true,
        asOf: args.snapshot.fetchedAt,
      };
    }
    return {
      kind: "error",
      lastFetchedAt: args.snapshot?.fetchedAt ?? null,
    };
  }

  // ライブ完了・エラーなし
  if (args.liveData != null) {
    return { kind: "ready", data: args.liveData, stale: false, asOf: null };
  }
  return { kind: "empty" };
}
