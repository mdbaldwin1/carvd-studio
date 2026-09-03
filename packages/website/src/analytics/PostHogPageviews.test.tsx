import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostHogPageviews } from "./PostHogPageviews";
import { websiteAnalytics } from "./analytics";

vi.mock("./analytics", () => ({ websiteAnalytics: { capture: vi.fn() } }));

describe("PostHogPageviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures a pageview for the route pathname and search", async () => {
    window.history.replaceState({}, "", "/pricing?annual=true");

    render(
      <MemoryRouter initialEntries={["/pricing?annual=true"]}>
        <Routes>
          <Route path="*" element={<PostHogPageviews />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(websiteAnalytics.capture).toHaveBeenCalledWith("$pageview", {
        $current_url: window.location.href,
      });
    });
  });
});
