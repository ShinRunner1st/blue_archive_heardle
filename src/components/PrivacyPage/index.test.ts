import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import privacy from "../../content/privacy.json";
import { createHarness } from "../../test/harness";
import PrivacyPage from "./index";

let harness: ReturnType<typeof createHarness>;

beforeEach(() => {
  harness = createHarness();
  harness.render(React.createElement(PrivacyPage));
});

afterEach(() => {
  harness.destroy();
});

describe("PrivacyPage", () => {
  const text = () => harness.container.textContent ?? "";

  it("shows every section, with its date", () => {
    expect(text()).toContain("Last changed 2 October 2026");
    for (const section of privacy.sections) {
      expect(text()).toContain(section.title);
    }
  });

  it("says what's kept, what never is, and for how long", () => {
    expect(text()).toContain("not your email, name or picture");
    expect(text()).toContain("cookies, ads, analytics or tracking");
    expect(text()).toContain("unused for two years");
    expect(text()).toContain("can still bring it back for up to 7 days");
    expect(text()).toContain("paid plan keeps 30 days");
    expect(text()).toContain("Download my data");
    expect(text()).toContain("Delete account");
  });

  it("never calls kept what's kept for a while", () => {
    const never = privacy.sections.find(({ id }) => id === "never")!;
    // The hashed address goes to Cloudflare's rate limiter: said under
    // "Your IP address", not among what's never kept.
    expect(JSON.stringify(never)).not.toMatch(/scrambled|hash|a minute/);
    expect(text()).toContain("hashed form of your address");
    expect(text()).toContain("doesn't publish how long");
  });

  it("gives the contact address as a link", () => {
    const mail = harness.container.querySelector('a[href^="mailto:"]');
    expect(mail?.getAttribute("href")).toBe("mailto:privacy@baheardle.com");
    expect(text()).not.toContain("{contact}");
  });
});
