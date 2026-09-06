// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OptionalFeatureBoundary } from "@/components/top/OptionalFeatureBoundary";

function Boom(): never {
  throw new Error("intentional optional-feature failure");
}

describe("OptionalFeatureBoundary (#55)", () => {
  it("swallows child errors so siblings can keep rendering", () => {
    render(
      <div>
        <OptionalFeatureBoundary>
          <Boom />
        </OptionalFeatureBoundary>
        <p>主要情報は残る</p>
      </div>,
    );
    expect(screen.getByText("主要情報は残る")).toBeInTheDocument();
    expect(screen.queryByText(/intentional/)).not.toBeInTheDocument();
  });
});
