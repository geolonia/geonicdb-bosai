"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  failed: boolean;
};

/**
 * 付加 UI（A2HS 等）の例外を隔離する。
 * 失敗時は null を返し、親（緊急バナー・警戒レベル等）の描画は継続する。
 */
export class OptionalFeatureBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // 防災主要情報を優先するため、付加機能の失敗は握りつぶす
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}
