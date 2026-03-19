import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Fail fast on first test failure in each file
  fullyParallel: true,
  // No retries in dev — deterministic feedback is more valuable
  retries: 0,
  // Single worker to keep test output readable in dev
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    // Screenshot on failure
    screenshot: "only-on-failure",
    // Reasonable timeout for page interactions
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      // Using Firefox because Chromium headless shell requires system libraries
      // (libnspr4, libnss3) that are not installed in this WSL2 environment.
      // Switch back to "chromium" once those dependencies are available.
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  // Auth state storage directory (for future authenticated test setup)
  // e2e/.auth/user.json would be created by a global setup when auth is implemented
});
