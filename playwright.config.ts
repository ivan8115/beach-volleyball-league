import { defineConfig, devices } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "e2e/.auth/user.json");

// WSL2: Playwright's bundled browsers are missing system libs (libnspr4, libasound2).
// Use the Windows Chrome installation accessible through the WSL2 filesystem.
const CHROME_EXEC = "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";

const chromeOptions = {
  ...devices["Desktop Chrome"],
  executablePath: CHROME_EXEC,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    // ── Step 1: log in once and save session ──────────────────────────────────
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
      use: chromeOptions,
    },

    // ── Unauthenticated tests (landing, login, register) ─────────────────────
    {
      name: "public",
      testMatch: /\/(landing|auth|navigation|public-pages)\.spec\.ts/,
      use: chromeOptions,
    },

    // ── Authenticated tests (admin + member flows) ────────────────────────────
    {
      name: "authenticated",
      testMatch: /\/(admin-smoke|member-smoke)\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...chromeOptions, storageState: AUTH_FILE },
    },
  ],
});
