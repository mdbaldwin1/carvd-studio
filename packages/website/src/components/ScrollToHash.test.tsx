import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScrollToHash from "./ScrollToHash";

afterEach(() => {
  cleanup();
  document.getElementById("assembly-placement")?.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("documentation deep links", () => {
  it("finds an anchor when a cold route renders after the old 100ms delay", async () => {
    vi.useFakeTimers();
    const scroll = vi.fn();
    render(
      <MemoryRouter initialEntries={["/docs/joinery#assembly-placement"]}>
        <ScrollToHash />
      </MemoryRouter>,
    );
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    const target = document.createElement("section");
    target.id = "assembly-placement";
    target.scrollIntoView = scroll;
    await act(async () => {
      document.body.append(target);
    });
    expect(scroll).toHaveBeenCalledOnce();
    await act(async () => {
      target.append(document.createElement("p"));
    });
    expect(scroll).toHaveBeenCalledOnce();
  });

  it("stops waiting when the route unmounts", async () => {
    const scroll = vi.fn();
    const view = render(
      <MemoryRouter initialEntries={["/docs/joinery#assembly-placement"]}>
        <ScrollToHash />
      </MemoryRouter>,
    );
    view.unmount();
    const target = document.createElement("section");
    target.id = "assembly-placement";
    target.scrollIntoView = scroll;
    await act(async () => {
      document.body.append(target);
    });
    expect(scroll).not.toHaveBeenCalled();
  });

  it("ignores malformed URL fragments without throwing", () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={["/docs/joinery#%"]}>
          <ScrollToHash />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
