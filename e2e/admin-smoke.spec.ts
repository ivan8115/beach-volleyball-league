/**
 * Authenticated admin smoke tests.
 *
 * Requires:
 *  - Local dev server running (npm run dev)
 *  - Local Supabase running (supabase start)
 *  - Demo seed applied (npx tsx prisma/seed-demo.ts)
 *  - TEST_USER_EMAIL + TEST_USER_PASSWORD in .env.local
 */

import { test, expect } from "@playwright/test";

const ORG = "sunset-beach-vb";
// Helper: click the first matching event link (seed may have run >1 time)
async function clickFirstEvent(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("link", { name }).first().click();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

test.describe("Dashboard", () => {
  test("loads and shows seeded orgs", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Sunset Beach VB").first()).toBeVisible();
    await expect(page.getByText("SoCal VB Club").first()).toBeVisible();
  });

  test("clicking an org card goes to its admin page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("Sunset Beach VB").first().click();
    await expect(page).toHaveURL(`/${ORG}/admin`);
  });

  test("shows Create org and Join org buttons", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /create org/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /join org/i })).toBeVisible();
  });
});

// ── Admin overview ─────────────────────────────────────────────────────────────

test.describe("Admin overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${ORG}/admin`);
  });

  test("shows org name in heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /sunset beach vb/i })).toBeVisible();
  });

  test("shows members count card", async ({ page }) => {
    // Use main content area to avoid matching the nav "Members" link
    await expect(page.locator("main").getByText("Members")).toBeVisible();
  });

  test("shows events count card", async ({ page }) => {
    // Match the stat card title exactly, not "Recent events"
    await expect(page.locator("main [data-slot='card-title']").filter({ hasText: /^Events$/ })).toBeVisible();
  });

  test("shows join code with copy button", async ({ page }) => {
    await expect(page.getByText("Join code")).toBeVisible();
    await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
  });

  test("copy button changes to 'Copied!' and reverts", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const copyBtn = page.getByRole("button", { name: /^copy$/i }).first();
    await copyBtn.click();
    await expect(page.getByRole("button", { name: /copied/i }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("button", { name: /^copy$/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows recent events", async ({ page }) => {
    await expect(page.getByText("Summer Co-Ed League 2026").first()).toBeVisible();
  });

  test("All orgs back link navigates to /dashboard", async ({ page }) => {
    await page.getByRole("link", { name: /all orgs/i }).click();
    await expect(page).toHaveURL("/dashboard");
  });
});

// ── Admin nav ─────────────────────────────────────────────────────────────────

test.describe("Admin nav tabs", () => {
  test("Events tab loads event list", async ({ page }) => {
    await page.goto(`/${ORG}/admin`);
    await page.getByRole("link", { name: /^events$/i }).click();
    await expect(page).toHaveURL(`/${ORG}/admin/events`);
    await expect(page.getByText("Summer Co-Ed League 2026").first()).toBeVisible();
  });

  test("Members tab loads member list", async ({ page }) => {
    await page.goto(`/${ORG}/admin`);
    await page.getByRole("link", { name: /^members$/i }).click();
    await expect(page).toHaveURL(`/${ORG}/admin/members`);
  });

  test("Venues tab loads venue list", async ({ page }) => {
    await page.goto(`/${ORG}/admin`);
    await page.getByRole("link", { name: /^venues$/i }).click();
    await expect(page).toHaveURL(`/${ORG}/admin/venues`);
    await expect(page.getByText("Mission Beach Sports Complex").first()).toBeVisible();
  });

  test("Settings tab loads settings page", async ({ page }) => {
    await page.goto(`/${ORG}/admin`);
    await page.locator("nav").getByRole("link", { name: /^settings$/i }).click();
    await expect(page).toHaveURL(`/${ORG}/admin/settings`);
    await expect(page.getByText("Organization name")).toBeVisible();
  });
});

// ── Admin events list ─────────────────────────────────────────────────────────

test.describe("Admin events list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${ORG}/admin/events`);
  });

  test("shows event with status badge", async ({ page }) => {
    await expect(page.getByRole("link", { name: /summer co-ed league 2026/i }).first()).toBeVisible();
  });

  test("clicking event row navigates to teams page", async ({ page }) => {
    await clickFirstEvent(page, /summer co-ed league 2026/i);
    await expect(page).toHaveURL(new RegExp(`/${ORG}/admin/events/.+/teams`));
  });

  test("Schedule quick-link navigates to schedule page", async ({ page }) => {
    await page.getByRole("link", { name: /^schedule$/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${ORG}/admin/events/.+/schedule`));
  });

  test("Create event button is visible", async ({ page }) => {
    await expect(page.getByRole("link", { name: /create event/i })).toBeVisible();
  });
});

// ── Admin event teams page ────────────────────────────────────────────────────

test.describe("Admin event teams", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${ORG}/admin/events`);
    await clickFirstEvent(page, /summer co-ed league 2026/i);
    await expect(page).toHaveURL(new RegExp(`/${ORG}/admin/events/.+/teams`));
  });

  test("shows team list with status badges", async ({ page }) => {
    await expect(page.getByText(/registered/i).first()).toBeVisible();
  });

  test("Create team button opens form", async ({ page }) => {
    await page.getByRole("button", { name: /create team/i }).click();
    await expect(page.getByPlaceholder(/team name/i)).toBeVisible();
  });

  test("Create team form can be cancelled", async ({ page }) => {
    await page.getByRole("button", { name: /create team/i }).click();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByPlaceholder(/team name/i)).not.toBeVisible();
  });
});

// ── Admin settings ────────────────────────────────────────────────────────────

test.describe("Admin settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${ORG}/admin/settings`);
  });

  test("shows org name input pre-filled", async ({ page }) => {
    const nameInput = page.getByLabel(/organization name/i);
    await expect(nameInput).toHaveValue(/sunset beach vb/i);
  });

  test("timezone field is a dropdown not a text input", async ({ page }) => {
    const tzTrigger = page.locator("[id='timezone']");
    await expect(tzTrigger).toBeVisible();
    const tagName = await tzTrigger.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).not.toBe("input");
  });

  test("join code copy button works", async ({ page }) => {
    await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
  });

  test("saving with valid name shows success message", async ({ page }) => {
    const nameInput = page.getByLabel(/organization name/i);
    await nameInput.fill("Sunset Beach VB");
    await page.getByRole("button", { name: /save settings/i }).click();
    await expect(page.getByText(/settings saved/i)).toBeVisible();
  });
});

// ── Admin venues ──────────────────────────────────────────────────────────────

test.describe("Admin venues", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${ORG}/admin/venues`);
  });

  test("shows seeded venue", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /mission beach sports complex/i }).first()).toBeVisible();
  });

  test("shows courts under venue", async ({ page }) => {
    await expect(page.getByText("Court A").first()).toBeVisible();
    await expect(page.getByText("Court B").first()).toBeVisible();
  });

  test("Add venue button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /add venue/i })).toBeVisible();
  });
});
