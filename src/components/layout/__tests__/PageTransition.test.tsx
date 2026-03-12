import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PageTransition } from "../PageTransition";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test",
}));

describe("PageTransition", () => {
  it("renders children correctly", () => {
    render(
      <PageTransition>
        <span>Hello World</span>
      </PageTransition>
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("wrapper div has animate-in and fade-in classes", () => {
    const { container } = render(
      <PageTransition>
        <span>Content</span>
      </PageTransition>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("motion-safe:animate-in");
    expect(wrapper).toHaveClass("motion-safe:fade-in");
  });

  it("wrapper div has duration and fill-mode classes", () => {
    const { container } = render(
      <PageTransition>
        <span>Content</span>
      </PageTransition>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("motion-safe:duration-300");
    expect(wrapper).toHaveClass("motion-safe:fill-mode-both");
  });
});
