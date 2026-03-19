/**
 * Public pages E2E tests — /login, /register, /palettes
 * No authentication or database data required.
 */

import { test, expect } from "@playwright/test";

// ── /login ────────────────────────────────────────────────────────────────────

test.describe("/login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the sign-in card with correct heading", async ({ page }) => {
    // shadcn CardTitle renders as a styled <div>, not an <h*> element
    await expect(page.getByText("Sign in").first()).toBeVisible();
  });

  test("renders email input field", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("renders password input field", async ({ page }) => {
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("renders a sign-in submit button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("renders Google OAuth button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("shows 'Sign up' link that points to /register", async ({ page }) => {
    // The login page links to register with "Sign up" text
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/register");
  });

  test("clicking 'Sign up' navigates to /register", async ({ page }) => {
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL("/register");
  });

  test("submitting empty form shows browser validation (email required)", async ({ page }) => {
    // Click submit without filling in fields — browser validation prevents submission
    await page.getByRole("button", { name: /sign in/i }).click();
    // The email input should be invalid (required attribute)
    const emailInput = page.getByLabel(/email/i);
    const isValid = await emailInput.evaluate(
      (el) => (el as HTMLInputElement).validity.valid
    );
    expect(isValid).toBe(false);
  });
});

// ── /register ─────────────────────────────────────────────────────────────────

test.describe("/register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("renders the registration card with correct heading", async ({ page }) => {
    // shadcn CardTitle renders as a styled <div>, not an <h*> element
    await expect(page.getByText("Create an account")).toBeVisible();
  });

  test("renders email input field", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("renders password input field", async ({ page }) => {
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("renders a create account submit button", async ({ page }) => {
    // The register button text is "Create account"
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("renders Google OAuth button", async ({ page }) => {
    // Register page uses "Sign up with Google" (login page uses "Continue with Google")
    await expect(page.getByRole("button", { name: /sign up with google/i })).toBeVisible();
  });

  test("shows 'Sign in' link that points to /login", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/login");
  });

  test("clicking 'Sign in' navigates to /login", async ({ page }) => {
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("submitting empty form shows browser validation (email required)", async ({ page }) => {
    await page.getByRole("button", { name: /create account/i }).click();
    const emailInput = page.getByLabel(/email/i);
    const isValid = await emailInput.evaluate(
      (el) => (el as HTMLInputElement).validity.valid
    );
    expect(isValid).toBe(false);
  });
});

// ── /palettes ─────────────────────────────────────────────────────────────────

test.describe("/palettes page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/palettes");
  });

  test("page renders without error (200 response)", async ({ page }) => {
    // If the page errored we'd see a Next.js error boundary or 404
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("This page could not be found");
  });

  test("shows 'Coastal Night' palette card", async ({ page }) => {
    await expect(page.getByText("Coastal Night")).toBeVisible();
  });

  test("shows 'Golden Hour' palette card", async ({ page }) => {
    await expect(page.getByText("Golden Hour")).toBeVisible();
  });

  test("shows 'Pacific' palette card", async ({ page }) => {
    await expect(page.getByText("Pacific")).toBeVisible();
  });

  test("shows at least 3 palette cards", async ({ page }) => {
    // Each card has a palette name — verify at least 3 are present
    await expect(page.getByText("Coastal Night")).toBeVisible();
    await expect(page.getByText("Golden Hour")).toBeVisible();
    await expect(page.getByText("Pacific")).toBeVisible();
  });
});
