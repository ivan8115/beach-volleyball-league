/**
 * Navigation E2E tests.
 * Verifies that links across the public site are reachable and navigate correctly.
 * No authentication or database data required.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing page navigation links", () => {
  test("nav 'Get started free' navigates to /register", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: /get started free/i }).click();
    await expect(page).toHaveURL("/register");
  });

  test("nav 'Sign in' navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("hero CTA 'Create your organization' navigates to /register", async ({ page }) => {
    await page.goto("/");
    // Use the first one (hero section), not the CTA section
    await page.getByRole("link", { name: /create your organization/i }).first().click();
    await expect(page).toHaveURL("/register");
  });

  test("footer 'Sign in' link navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("footer 'Get started' link navigates to /register", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: /get started/i }).click();
    await expect(page).toHaveURL("/register");
  });
});

test.describe("/login navigation links", () => {
  test("'Sign up' link navigates to /register", async ({ page }) => {
    await page.goto("/login");
    // The login page registration link says "Sign up" (not "Create account")
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL("/register");
  });
});

test.describe("/register navigation links", () => {
  test("'Sign in' link navigates to /login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Unknown org slug routing", () => {
  test("visiting /nonexistent-org redirects or shows 404 without crashing", async ({ page }) => {
    // The [orgSlug]/layout.tsx returns notFound() if org doesn't exist.
    // Next.js renders the 404 page — we should not see a server crash (500).
    const response = await page.goto("/nonexistent-org-that-does-not-exist-xyz");
    // Should be 404 — not a 500 crash
    expect(response?.status()).not.toBe(500);
  });

  test("visiting /nonexistent-org/admin redirects or shows 404 without crashing", async ({ page }) => {
    const response = await page.goto("/nonexistent-org-that-does-not-exist-xyz/admin");
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("Cross-page navigation round trips", () => {
  test("can navigate from landing → register → login → landing", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: /get started free/i }).click();
    await expect(page).toHaveURL("/register");

    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");

    // Go back to landing via browser back
    await page.goBack();
    await expect(page).toHaveURL("/register");
    await page.goBack();
    await expect(page).toHaveURL("/");
  });
});
