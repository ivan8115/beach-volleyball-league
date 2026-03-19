/**
 * Landing page E2E tests.
 * These tests require no authentication and no database data.
 * The page is a server component with all content statically rendered.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title contains Beach VB League", async ({ page }) => {
    await expect(page).toHaveTitle(/Beach VB League/i);
  });

  test("hero headline contains 'Beach Volleyball'", async ({ page }) => {
    // The h1 reads "Run Your BEACH VOLLEYBALL League"
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Beach Volleyball", { ignoreCase: true });
  });

  test("nav 'Get started free' link points to /register", async ({ page }) => {
    // The nav CTA is a link with text "Get started free"
    const navCta = page.locator("header").getByRole("link", { name: /get started free/i });
    await expect(navCta).toHaveAttribute("href", "/register");
  });

  test("nav 'Sign in' link points to /login", async ({ page }) => {
    const signInLink = page.locator("header").getByRole("link", { name: /sign in/i });
    await expect(signInLink).toHaveAttribute("href", "/login");
  });

  test("hero 'Create your organization' CTA links to /register", async ({ page }) => {
    // The hero section has a primary CTA "Create your organization"
    const heroCta = page.getByRole("link", { name: /create your organization/i }).first();
    await expect(heroCta).toHaveAttribute("href", "/register");
  });

  test("features section shows all 6 feature cards with numbers 01-06", async ({ page }) => {
    // Feature card numbers are in <span> elements with opacity 0.2 for decorative styling.
    // We check they exist in the DOM rather than expecting them to be visually visible.
    for (const n of ["01", "02", "03", "04", "05", "06"]) {
      await expect(page.locator(`span:has-text("${n}")`).first()).toBeAttached();
    }
  });

  test("features section shows 'Leagues & Tournaments' card", async ({ page }) => {
    await expect(page.getByText("Leagues & Tournaments").first()).toBeVisible();
  });

  test("features section shows 'Live Standings' card", async ({ page }) => {
    await expect(page.getByText("Live Standings")).toBeVisible();
  });

  test("features section shows 'Smart Scheduling' card", async ({ page }) => {
    await expect(page.getByText("Smart Scheduling")).toBeVisible();
  });

  test("features section shows 'Registration & Payments' card", async ({ page }) => {
    await expect(page.getByText("Registration & Payments")).toBeVisible();
  });

  test("features section shows 'Multi-Organization' card", async ({ page }) => {
    await expect(page.getByText("Multi-Organization")).toBeVisible();
  });

  test("CTA section 'Create your organization' button is visible", async ({ page }) => {
    // There are two "Create your organization" links — the CTA section one is the last
    const ctaLinks = page.getByRole("link", { name: /create your organization/i });
    await expect(ctaLinks.last()).toBeVisible();
  });

  test("footer is present with Beach VB League branding", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("BEACH VB LEAGUE");
  });

  test("footer contains copyright year", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toContainText(String(new Date().getFullYear()));
  });

  test("footer 'Sign in' link points to /login", async ({ page }) => {
    const footerSignIn = page.locator("footer").getByRole("link", { name: /sign in/i });
    await expect(footerSignIn).toHaveAttribute("href", "/login");
  });

  test("footer 'Get started' link points to /register", async ({ page }) => {
    const footerGetStarted = page.locator("footer").getByRole("link", { name: /get started/i });
    await expect(footerGetStarted).toHaveAttribute("href", "/register");
  });

  test("live score widget is visible in the hero section", async ({ page }) => {
    // The widget header shows "SUMMER LEAGUE 2026 — WEEK 4"
    await expect(page.getByText("SUMMER LEAGUE 2026")).toBeVisible();
  });

  test("clicking 'Get started free' in nav navigates to /register", async ({ page }) => {
    await page.locator("header").getByRole("link", { name: /get started free/i }).click();
    await expect(page).toHaveURL("/register");
  });

  test("clicking 'Sign in' in nav navigates to /login", async ({ page }) => {
    await page.locator("header").getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });
});
