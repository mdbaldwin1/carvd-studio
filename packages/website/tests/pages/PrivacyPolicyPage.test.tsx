import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "../../src/pages/PrivacyPolicyPage";

describe("PrivacyPolicyPage", () => {
  it("accurately discloses optional anonymous analytics and deletion", () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        /Project files and designs remain local unless you explicitly export or share them/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/optional anonymous product analytics/i)[0],
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Analytics never includes project names, filenames, paths, notes, dimensions, design content, email addresses, or license keys/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/App Settings → Data & License/i)[0],
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /queued analytics and the anonymous installation identifier are deleted/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/We do not use analytics services/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Since we don't collect your data/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Desktop anonymous analytics is explicit opt-in/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/coarse operating-system category and app version/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Website pageviews, downloads, and checkout starts/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/only product, currency, value cents, and test mode/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/PostHog:/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Browsing history or behavior tracking/i),
    ).not.toBeInTheDocument();
  });
});
