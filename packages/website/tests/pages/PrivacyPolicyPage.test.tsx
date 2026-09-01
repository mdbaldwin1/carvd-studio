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
      screen.getByText(/optional anonymous product analytics/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Analytics never includes project names, filenames, paths, notes, dimensions, design content, email addresses, or license keys/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/App Settings → Data & License/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /queued analytics and the anonymous installation identifier are deleted/i,
      ),
    ).toBeInTheDocument();
  });
});
