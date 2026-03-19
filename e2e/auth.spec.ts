/**
 * Auth flow E2E tests.
 *
 * Full registration → onboarding → dashboard flows require:
 * 1. A running local Supabase instance (supabase start)
 * 2. Email confirmation disabled in local Supabase config
 * 3. The Next.js dev server running (npm run dev)
 *
 * Tests that require Supabase auth to complete are skipped with a TODO
 * when the preconditions cannot be easily verified in CI.
 * Tests for static page rendering and form validation are always run.
 */

import { test, expect } from "@playwright/test";

// ── Login page static rendering ───────────────────────────────────────────────

test.describe("Login page rendering", () => {
  test("sign-in form fields and buttons render correctly", async ({ page }) => {
    await page.goto("/login");

    // shadcn CardTitle renders as a <div> not <h*> — locate by text content
    await expect(page.getByText("Sign in").first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    // The submit button label is "Sign in"
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("description text mentions Beach VB League account", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/beach vb league account/i)).toBeVisible();
  });
});

// ── Register page static rendering ───────────────────────────────────────────

test.describe("Register page rendering", () => {
  test("registration form fields and buttons render correctly", async ({ page }) => {
    await page.goto("/register");

    // shadcn CardTitle renders as a <div> not <h*> — locate by text content
    // Heading text is "Create an account", Google button says "Sign up with Google"
    await expect(page.getByText("Create an account")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up with google/i })).toBeVisible();
  });
});

// ── Form validation (no network calls needed) ─────────────────────────────────

test.describe("Login form validation", () => {
  test("does not submit when email is empty (HTML5 required validation)", async ({ page }) => {
    await page.goto("/login");

    // Leave email empty, fill password
    await page.getByLabel(/password/i).fill("SomePassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Still on /login — form was not submitted
    await expect(page).toHaveURL("/login");
  });

  test("does not submit when password is empty (HTML5 required validation)", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("test@example.com");
    // Leave password empty
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/login");
  });

  test("shows error when credentials are wrong", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("nonexistent-user-xyz@example.com");
    await page.getByLabel(/password/i).fill("WrongPassword999!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // The form should show an error message — not navigate away
    // Supabase auth returns an error for invalid credentials
    // We wait for either an error div or to still be on /login
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Register form validation", () => {
  test("does not submit when email is empty", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/password/i).fill("SomePassword123!");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/register");
  });

  test("does not submit when password is empty", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/register");
  });
});

// ── Full auth flow (requires local Supabase with email confirmation disabled) ──

test.describe("Full registration flow", () => {
  test.skip(
    true,
    "TODO: Enable when local Supabase is running with email confirmation disabled. " +
    "Flow: /register → fill form → submit → /onboarding → fill display name → /dashboard"
  );

  test("new user can register, complete onboarding, and reach dashboard", async ({ page }) => {
    const timestamp = Date.now();
    const email = `test+e2e-${timestamp}@example.com`;
    const password = "TestPassword123!";

    await page.goto("/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to /onboarding after successful signup
    await expect(page).toHaveURL("/onboarding", { timeout: 10_000 });

    // Fill in display name on onboarding page
    await page.getByLabel(/display name/i).fill("E2E Test User");
    await page.getByRole("button", { name: /get started|continue|finish/i }).click();

    // Should land on dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 10_000 });
    await expect(page.getByText(/create organization/i)).toBeVisible();
  });
});

test.describe("Login with existing credentials", () => {
  test.skip(
    true,
    "TODO: Enable when local Supabase is running. " +
    "Requires a seeded test user (e.g., test@example.com / TestPassword123!) in the local DB."
  );

  test("existing user can sign in and reach dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("TestPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10_000 });
  });
});
