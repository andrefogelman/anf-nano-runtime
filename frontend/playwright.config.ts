import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — smoke E2E (Sprint 5).
 *
 * Roda contra:
 *  - PLAYWRIGHT_BASE_URL (preferido em CI; aponta pra preview Vercel)
 *  - http://localhost:3000 (dev local com `bun run dev`)
 *
 * Test user (opcional, pra fluxos autenticados): defina
 *   E2E_TEST_USER_EMAIL e E2E_TEST_USER_PASSWORD no env.
 */

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Sem webServer — assumimos que o dev/preview já está rodando.
});
