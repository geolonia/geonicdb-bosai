import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

afterEach(async () => {
  // jsdom 環境のコンポーネントテストのみ cleanup（node 環境では document 無し）
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
