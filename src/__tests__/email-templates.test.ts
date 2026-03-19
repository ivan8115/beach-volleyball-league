import { describe, it, expect } from "vitest";
import {
  registrationConfirmationEmail,
  freeAgentConfirmationEmail,
  welcomeToTeamEmail,
  announcementEmail,
  schedulePublishedEmail,
  bracketPublishedEmail,
  type RegistrationConfirmationData,
  type FreeAgentConfirmationData,
  type WelcomeToTeamData,
  type AnnouncementEmailData,
  type SchedulePublishedData,
  type BracketPublishedData,
} from "@/lib/email-templates";

// ── Shared assertion helpers ──────────────────────────────────────────────────

function assertEmailShape(result: { subject: string; html: string; text: string }) {
  expect(result).toHaveProperty("subject");
  expect(result).toHaveProperty("html");
  expect(result).toHaveProperty("text");
  expect(typeof result.subject).toBe("string");
  expect(typeof result.html).toBe("string");
  expect(typeof result.text).toBe("string");
  expect(result.subject.length).toBeGreaterThan(0);
  expect(result.html.length).toBeGreaterThan(0);
}

function assertHtmlIsDocument(html: string) {
  expect(html).toContain("<!DOCTYPE html>");
  expect(html).toContain("<html");
  expect(html).toContain("</html>");
  expect(html).toContain("Beach VB League");
}

// ── registrationConfirmationEmail ─────────────────────────────────────────────

describe("registrationConfirmationEmail", () => {
  const data: RegistrationConfirmationData = {
    playerName: "Jordan Smith",
    orgName: "Beach League HQ",
    eventName: "Summer Open 2026",
    teamName: "Net Ninjas",
    role: "CAPTAIN",
    eventUrl: "https://app.example.com/org/events/evt-1",
  };

  it("returns an object with subject, html, and text fields", () => {
    const result = registrationConfirmationEmail(data);
    assertEmailShape(result);
  });

  it("HTML is a full HTML document with Beach VB League branding", () => {
    const { html } = registrationConfirmationEmail(data);
    assertHtmlIsDocument(html);
  });

  it("subject includes the event name", () => {
    const { subject } = registrationConfirmationEmail(data);
    expect(subject).toContain("Summer Open 2026");
  });

  it("html includes the player name", () => {
    const { html } = registrationConfirmationEmail(data);
    expect(html).toContain("Jordan Smith");
  });

  it("html includes the team name", () => {
    const { html } = registrationConfirmationEmail(data);
    expect(html).toContain("Net Ninjas");
  });

  it("html includes the event name", () => {
    const { html } = registrationConfirmationEmail(data);
    expect(html).toContain("Summer Open 2026");
  });

  it("html includes the org name", () => {
    const { html } = registrationConfirmationEmail(data);
    expect(html).toContain("Beach League HQ");
  });

  it("html shows 'Team Captain' for role CAPTAIN", () => {
    const { html } = registrationConfirmationEmail({ ...data, role: "CAPTAIN" });
    expect(html).toContain("Team Captain");
  });

  it("html shows 'Player' label for role PLAYER", () => {
    const { html } = registrationConfirmationEmail({ ...data, role: "PLAYER" });
    expect(html).toContain("Player");
    expect(html).not.toContain("Team Captain");
  });

  it("html includes the event URL as a link", () => {
    const { html } = registrationConfirmationEmail(data);
    expect(html).toContain("https://app.example.com/org/events/evt-1");
  });

  it("text version includes player name, event name, team name, and event URL", () => {
    const { text } = registrationConfirmationEmail(data);
    expect(text).toContain("Jordan Smith");
    expect(text).toContain("Summer Open 2026");
    expect(text).toContain("Net Ninjas");
    expect(text).toContain("https://app.example.com/org/events/evt-1");
  });
});

// ── freeAgentConfirmationEmail ────────────────────────────────────────────────

describe("freeAgentConfirmationEmail", () => {
  const data: FreeAgentConfirmationData = {
    playerName: "Alex Rivera",
    orgName: "Beach League HQ",
    eventName: "Fall Classic",
    eventUrl: "https://app.example.com/org/events/evt-2",
  };

  it("returns an object with subject, html, and text fields", () => {
    assertEmailShape(freeAgentConfirmationEmail(data));
  });

  it("subject includes the event name", () => {
    const { subject } = freeAgentConfirmationEmail(data);
    expect(subject).toContain("Fall Classic");
  });

  it("html includes the player name", () => {
    const { html } = freeAgentConfirmationEmail(data);
    expect(html).toContain("Alex Rivera");
  });

  it("html includes the event name", () => {
    const { html } = freeAgentConfirmationEmail(data);
    expect(html).toContain("Fall Classic");
  });

  it("html includes messaging about the free agent pool", () => {
    const { html } = freeAgentConfirmationEmail(data);
    expect(html.toLowerCase()).toContain("free agent");
  });
});

// ── welcomeToTeamEmail ────────────────────────────────────────────────────────

describe("welcomeToTeamEmail", () => {
  const data: WelcomeToTeamData = {
    playerName: "Casey Brown",
    orgName: "Beach League HQ",
    eventName: "Spring Invitational",
    teamName: "Sand Sharks",
    addedByName: "Morgan Lee",
    teamUrl: "https://app.example.com/org/events/evt-3/team/t-1",
  };

  it("returns an object with subject, html, and text fields", () => {
    assertEmailShape(welcomeToTeamEmail(data));
  });

  it("subject includes the team name", () => {
    const { subject } = welcomeToTeamEmail(data);
    expect(subject).toContain("Sand Sharks");
  });

  it("html includes the player name who was added", () => {
    const { html } = welcomeToTeamEmail(data);
    expect(html).toContain("Casey Brown");
  });

  it("html includes the name of the person who added them", () => {
    const { html } = welcomeToTeamEmail(data);
    expect(html).toContain("Morgan Lee");
  });

  it("html includes the team name", () => {
    const { html } = welcomeToTeamEmail(data);
    expect(html).toContain("Sand Sharks");
  });
});

// ── announcementEmail ─────────────────────────────────────────────────────────

describe("announcementEmail", () => {
  const baseData: AnnouncementEmailData = {
    playerName: "Sam Torres",
    orgName: "Beach League HQ",
    title: "Schedule Change",
    body: "Games on Saturday have been moved to Sunday.",
    orgUrl: "https://app.example.com/org/dashboard",
  };

  it("returns an object with subject, html, and text fields", () => {
    assertEmailShape(announcementEmail(baseData));
  });

  it("subject uses org name prefix for org-wide announcements (no eventName)", () => {
    const { subject } = announcementEmail(baseData);
    expect(subject).toContain("[Beach League HQ]");
    expect(subject).toContain("Schedule Change");
  });

  it("subject uses event name prefix when eventName is provided", () => {
    const data: AnnouncementEmailData = {
      ...baseData,
      eventName: "Summer Open 2026",
      eventUrl: "https://app.example.com/org/events/evt-1",
    };
    const { subject } = announcementEmail(data);
    expect(subject).toContain("[Summer Open 2026]");
    expect(subject).toContain("Schedule Change");
  });

  it("html includes the announcement title", () => {
    const { html } = announcementEmail(baseData);
    expect(html).toContain("Schedule Change");
  });

  it("html includes the announcement body text", () => {
    const { html } = announcementEmail(baseData);
    expect(html).toContain("Games on Saturday have been moved to Sunday.");
  });

  it("text version contains the org name", () => {
    // announcementEmail is a broadcast template — playerName is accepted in
    // the data struct but is not interpolated into either html or text output.
    // The org name is always present in the text.
    const { text } = announcementEmail(baseData);
    expect(text).toContain("Beach League HQ");
  });

  it("text version contains the announcement body", () => {
    const { text } = announcementEmail(baseData);
    expect(text).toContain("Games on Saturday have been moved to Sunday.");
  });

  it("uses orgUrl as fallback link when no eventUrl is provided", () => {
    const { html } = announcementEmail(baseData);
    expect(html).toContain("https://app.example.com/org/dashboard");
  });

  it("uses eventUrl as link when eventUrl is provided", () => {
    const data: AnnouncementEmailData = {
      ...baseData,
      eventUrl: "https://app.example.com/org/events/evt-1",
    };
    const { html } = announcementEmail(data);
    expect(html).toContain("https://app.example.com/org/events/evt-1");
  });

  it("newlines in body are converted to <br/> tags in html", () => {
    const data: AnnouncementEmailData = {
      ...baseData,
      body: "Line 1\nLine 2",
    };
    const { html } = announcementEmail(data);
    expect(html).toContain("<br/>");
  });
});

// ── schedulePublishedEmail ────────────────────────────────────────────────────

describe("schedulePublishedEmail", () => {
  const data: SchedulePublishedData = {
    playerName: "Drew Chen",
    orgName: "Beach League HQ",
    eventName: "Summer Open 2026",
    teamName: "Net Ninjas",
    gameCount: 8,
    scheduleUrl: "https://app.example.com/org/events/evt-1/schedule",
  };

  it("returns an object with subject, html, and text fields", () => {
    assertEmailShape(schedulePublishedEmail(data));
  });

  it("subject includes the event name", () => {
    const { subject } = schedulePublishedEmail(data);
    expect(subject).toContain("Summer Open 2026");
  });

  it("text version contains the event name and team name", () => {
    // schedulePublishedEmail is a broadcast template — playerName is accepted
    // in the data struct but is not rendered in html or text output.
    const { text } = schedulePublishedEmail(data);
    expect(text).toContain("Summer Open 2026");
    expect(text).toContain("Net Ninjas");
  });

  it("html includes the team name", () => {
    const { html } = schedulePublishedEmail(data);
    expect(html).toContain("Net Ninjas");
  });

  it("html includes the game count", () => {
    const { html } = schedulePublishedEmail(data);
    expect(html).toContain("8");
  });

  it("text version mentions the schedule URL", () => {
    const { text } = schedulePublishedEmail(data);
    expect(text).toContain("https://app.example.com/org/events/evt-1/schedule");
  });
});

// ── bracketPublishedEmail ─────────────────────────────────────────────────────

describe("bracketPublishedEmail", () => {
  const data: BracketPublishedData = {
    playerName: "Riley Park",
    orgName: "Beach League HQ",
    eventName: "Beach Championship",
    teamName: "Coastal Crushers",
    scheduleUrl: "https://app.example.com/org/events/evt-4/schedule",
  };

  it("returns an object with subject, html, and text fields", () => {
    assertEmailShape(bracketPublishedEmail(data));
  });

  it("subject includes the event name", () => {
    const { subject } = bracketPublishedEmail(data);
    expect(subject).toContain("Beach Championship");
  });

  it("html includes the team name", () => {
    const { html } = bracketPublishedEmail(data);
    expect(html).toContain("Coastal Crushers");
  });

  it("text version contains the event name and team name", () => {
    // bracketPublishedEmail is a broadcast template — playerName is accepted
    // in the data struct but is not rendered in html or text output.
    const { text } = bracketPublishedEmail(data);
    expect(text).toContain("Beach Championship");
    expect(text).toContain("Coastal Crushers");
  });

  it("html includes messaging about the bracket", () => {
    const { html } = bracketPublishedEmail(data);
    expect(html.toLowerCase()).toContain("bracket");
  });

  it("text version includes the schedule URL", () => {
    const { text } = bracketPublishedEmail(data);
    expect(text).toContain("https://app.example.com/org/events/evt-4/schedule");
  });
});
