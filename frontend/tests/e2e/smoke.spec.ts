import { test, expect } from "@playwright/test";

/**
 * Smoke E2E (Sprint 5) — verifica que a app carrega e principais rotas públicas
 * respondem. Não exige login (testes autenticados ficam pra Sprint 6+).
 */

test.describe("smoke público", () => {
  test("redireciona / pra login quando não autenticado", async ({ page }) => {
    await page.goto("/");
    // ProtectedRoute redireciona pra /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("página de privacidade renderiza", async ({ page }) => {
    await page.goto("/privacidade");
    await expect(
      page.getByRole("heading", { name: /Política de Privacidade/i }),
    ).toBeVisible();
    // Link de volta pro home
    await expect(page.getByRole("link", { name: /voltar/i })).toBeAttached();
  });

  test("LGPD banner aparece em primeira visita", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    await expect(page.getByText(/Privacidade e LGPD/i)).toBeVisible({ timeout: 5_000 });
  });

  test("LGPD banner some após Entendi", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    const btn = page.getByRole("button", { name: /entendi/i });
    await btn.click();
    await expect(page.getByText(/Privacidade e LGPD/i)).not.toBeVisible();
    // Reload preserva a flag
    await page.reload();
    await expect(page.getByText(/Privacidade e LGPD/i)).not.toBeVisible();
  });
});

/**
 * Healthz da API roda em rota relativa /api/healthz quando preview e produção
 * usam mesmo domínio Vercel.
 */
test("API healthz responde 200", async ({ request, baseURL }) => {
  const url = `${baseURL}/api/healthz`;
  const res = await request.get(url);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("orcamentista-engine");
});
