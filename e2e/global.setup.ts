/**
 * Global auth setup — runs once before all authenticated tests.
 *
 * Logs in as the test user, waits for the dashboard, then saves cookies
 * to e2e/.auth/user.json so every authenticated test starts already signed in.
 *
 * Required env vars (add to .env.local or export before running):
 *   TEST_USER_EMAIL    — e.g. ivan8115@yahoo.com
 *   TEST_USER_PASSWORD — your password
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set to run authenticated tests.\n" +
        "Add them to .env.local or export them before running npx playwright test."
    );
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait until we land on the dashboard (redirect after successful login)
  await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });

  // Persist cookies + localStorage so other tests reuse the session
  await page.context().storageState({ path: AUTH_FILE });
});
